import { drawRankingFrame } from "./render";
import { getPlaybackSlots } from "./ranking";
import type { ClipFileMap, Project, RankingSlot } from "./types";

export interface ExportProgress {
  stage: "idle" | "preparing" | "recording" | "done" | "error";
  message: string;
  progress: number;
}

export type ExportProgressHandler = (progress: ExportProgress) => void;

export function pickSupportedMimeType(): string {
  const candidates = [
    "video/mp4;codecs=h264,aac",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm"
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || "";
}

export async function exportRankingVideo(
  project: Project,
  files: ClipFileMap,
  onProgress: ExportProgressHandler
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = project.canvas.width;
  canvas.height = project.canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas rendering is unavailable in this browser.");
  }

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioDest = audioCtx.createMediaStreamDestination();
  const canvasStream = canvas.captureStream(project.export.fps);
  const stream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks()
  ]);

  const mimeType = project.export.mimeType || pickSupportedMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 7_500_000 } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) {
      chunks.push(event.data);
    }
  };

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("The browser video recorder failed during export."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
  });

  const slots = getPlaybackSlots(project).filter((slot) => Boolean(files[slot.id]));
  if (!slots.length) {
    throw new Error("Upload at least one clip before exporting.");
  }

  onProgress({ stage: "preparing", message: "Loading fonts…", progress: 0 });
  await document.fonts.ready;
  onProgress({ stage: "preparing", message: "Preparing local render", progress: 0 });

  let bgmAudio: HTMLAudioElement | null = null;
  let bgmSource: MediaElementAudioSourceNode | null = null;
  let bgmGain: GainNode | null = null;

  if (files.bgm) {
    bgmAudio = new Audio(URL.createObjectURL(files.bgm));
    bgmAudio.loop = true;
    bgmSource = audioCtx.createMediaElementSource(bgmAudio);
    bgmGain = audioCtx.createGain();
    bgmGain.gain.value = project.audio?.bgmVolume ?? 0.5;
    bgmSource.connect(bgmGain).connect(audioDest);
    await waitForMetadata(bgmAudio);
    bgmAudio.play();
  }

  recorder.start(250);

  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index];
    const file = files[slot.id];
    if (!file) {
      continue;
    }
    await renderSlot(canvas, ctx, project, slot, file, index, slots.length, onProgress, audioCtx, audioDest);
  }

  recorder.stop();
  
  if (bgmAudio) {
    bgmAudio.pause();
    bgmSource?.disconnect();
    bgmGain?.disconnect();
    URL.revokeObjectURL(bgmAudio.src);
  }
  audioCtx.close();
  onProgress({ stage: "done", message: "Finalizing download", progress: 1 });
  return done;
}

async function renderSlot(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  project: Project,
  slot: RankingSlot,
  file: File,
  index: number,
  total: number,
  onProgress: ExportProgressHandler,
  audioCtx: AudioContext,
  audioDest: MediaStreamAudioDestinationNode
): Promise<void> {
  const video = document.createElement("video");
  const url = URL.createObjectURL(file);
  video.src = url;
  video.crossOrigin = "anonymous";
  video.muted = false; // Must be false to capture audio via Web Audio API
  video.playsInline = true;
  video.volume = slot.volume;

  const source = audioCtx.createMediaElementSource(video);
  source.connect(audioDest);

  try {
    await waitForMetadata(video);
    const start = Math.min(slot.trimStart, Math.max(0, video.duration - 0.2));
    const end = Math.min(Math.max(slot.trimEnd, start + 0.5), video.duration || slot.trimEnd);
    video.currentTime = start;
    await waitForSeek(video);
    await video.play();

    if (index > 0 && project.audio?.sfxEnabled) {
      playSwoosh(audioCtx, audioDest);
    }

    await new Promise<void>((resolve) => {
      const tick = () => {
        const localProgress = Math.min(1, Math.max(0, (video.currentTime - start) / (end - start)));
        const progress = (index + localProgress) / total;
        drawRankingFrame(ctx, project, video, slot, localProgress);
        onProgress({
          stage: "recording",
          message: `Rendering rank ${slot.rank}`,
          progress
        });

        if (video.currentTime >= end || video.ended) {
          video.pause();
          drawRankingFrame(ctx, project, video, slot, 1);
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  } finally {
    source.disconnect();
    URL.revokeObjectURL(url);
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function waitForMetadata(video: HTMLMediaElement): Promise<void> {
  return new Promise((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Could not load media file."));
  });
}

function playSwoosh(audioCtx: AudioContext, dest: MediaStreamAudioDestinationNode) {
  const duration = 0.5;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1; // white noise
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.5;
  filter.frequency.setValueAtTime(400, audioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(3000, audioCtx.currentTime + duration);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.15);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  noise.start(audioCtx.currentTime);
}

function waitForSeek(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    video.onseeked = () => resolve();
  });
}
