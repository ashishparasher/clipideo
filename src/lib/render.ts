import { tokenizeTitle } from "./title";
import type { Project, RankingSlot } from "./types";

export function drawRankingFrame(
  ctx: CanvasRenderingContext2D,
  project: Project,
  video: HTMLVideoElement | null,
  activeSlot?: RankingSlot,
  progress: number = 1 // 0.0 to 1.0 representing the clip playback progress
): void {
  const { width, height, background, videoHeightPercent } = project.canvas;
  const title = project.title;
  const videoTop = title.bandHeight;
  const videoHeight = Math.round(height * (videoHeightPercent / 100));

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, title.bandHeight);

  if (video && video.readyState >= 2) {
    if (project.canvas.filter && project.canvas.filter !== "none") {
      ctx.filter = project.canvas.filter;
    }
    drawCoverVideo(ctx, video, 0, videoTop, width, Math.min(videoHeight, height - videoTop));
    ctx.filter = "none";
  }

  // Dip-to-black video transition (fades video overlay at start/end)
  if (project.export.transition === "dip-to-black") {
    let alpha = 0;
    const fadeDuration = 0.15; // 15% of clip duration
    if (progress < fadeDuration) {
      alpha = 1 - (progress / fadeDuration);
    } else if (progress > 1 - fadeDuration) {
      alpha = (progress - (1 - fadeDuration)) / fadeDuration;
    }
    if (alpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect(0, videoTop, width, Math.min(videoHeight, height - videoTop));
    }
  }

  drawTitle(ctx, project, progress);
  drawNumberStack(ctx, project, activeSlot);
  drawWatermark(ctx, project);
}

export function drawTitle(ctx: CanvasRenderingContext2D, project: Project, progress: number = 1): void {
  const { title } = project;
  const lines = title.text.split("\n").slice(0, 2);
  const fontFamily = title.fontFamily || "Impact";
  
  ctx.save();
  ctx.textBaseline = "top";
  ctx.textAlign = title.align;
  ctx.font = `900 ${title.fontSize}px "${fontFamily}", Arial Black, Impact, sans-serif`;
  ctx.lineJoin = "round";

  // Text Animation
  if (title.animation === "pop" && progress < 0.15) {
    const scale = 0.8 + (progress / 0.15) * 0.2;
    ctx.translate(title.x, title.y + (lines.length * title.fontSize) / 2);
    ctx.scale(scale, scale);
    ctx.translate(-title.x, -(title.y + (lines.length * title.fontSize) / 2));
  }

  const lineHeight = title.fontSize * 1.05;
  lines.forEach((line, index) => {
    let renderLine = line;
    if (title.animation === "typewriter") {
      const charsToShow = Math.floor(progress * line.length * 3); // Faster typewriter
      renderLine = line.slice(0, Math.max(0, charsToShow));
    }
    if (renderLine) {
      drawHighlightedLine(ctx, renderLine, title.highlightedWords, title.x, title.y + index * lineHeight, project);
    }
  });
  ctx.restore();
}

export function drawNumberStack(
  ctx: CanvasRenderingContext2D,
  project: Project,
  activeSlot?: RankingSlot
): void {
  const { numbers, label } = project;
  const numFontFamily = label.fontFamily || "Impact";
  const labelFontFamily = label.fontFamily || "Impact";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.lineJoin = "round";

  const visibleSlots = project.slots.filter((slot) => !slot.hidden);
  if (visibleSlots.length === 0) return;

  const stackHeight = (visibleSlots.length - 1) * numbers.spacing + numbers.fontSize;
  const startY = project.canvas.height / 2 - stackHeight / 2;
  const labelOffsetY = label.y - numbers.y; // Maintains the relative baseline difference

  visibleSlots.forEach((slot, index) => {
    const y = startY + index * numbers.spacing;
    const color = numbers.colors[index] || "#ffffff";
    const rankText = `${slot.rank}.`;
    const isActive = activeSlot?.id === slot.id;

    ctx.font = `900 ${numbers.fontSize}px "${numFontFamily}", Arial Black, Impact, sans-serif`;
    ctx.strokeStyle = numbers.strokeColor;
    ctx.lineWidth = numbers.strokeWidth + (isActive ? 4 : 0);
    ctx.fillStyle = color;
    ctx.strokeText(rankText, numbers.x, y);
    ctx.fillText(rankText, numbers.x, y);

    // Always draw the label; dim non-active slots
    ctx.save();
    ctx.globalAlpha = isActive ? 1 : 0.55;
    ctx.font = `900 ${label.fontSize}px "${labelFontFamily}", Arial Black, Impact, sans-serif`;
    ctx.strokeStyle = label.strokeColor;
    ctx.lineWidth = label.strokeWidth;
    ctx.fillStyle = slot.labelColor || label.color;
    ctx.strokeText(slot.label, label.x, y + labelOffsetY);
    ctx.fillText(slot.label, label.x, y + labelOffsetY);
    ctx.restore();
  });
}

function drawHighlightedLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  highlightedWords: string,
  x: number,
  y: number,
  project: Project
): void {
  const { title } = project;
  const fontFamily = title.fontFamily || "Impact";
  ctx.font = `900 ${title.fontSize}px "${fontFamily}", Arial Black, Impact, sans-serif`;

  const tokens = tokenizeTitle(line, highlightedWords);
  const widths = tokens.map((token) => ctx.measureText(token.text).width);
  const totalWidth = widths.reduce((sum, width) => sum + width, 0);
  let cursor = x;

  if (title.align === "center") {
    cursor = x - totalWidth / 2;
  } else if (title.align === "right") {
    cursor = x - totalWidth;
  }

  ctx.textAlign = "left";
  const wordStyles = title.wordStyles || {};
  tokens.forEach((token, index) => {
    const lower = token.text.trim().toLowerCase();
    // Priority: wordStyles > highlighted > default color
    const tokenColor = wordStyles[lower] || (token.highlighted ? title.highlightColor : title.color);
    ctx.strokeStyle = title.strokeColor;
    ctx.lineWidth = title.strokeWidth;
    ctx.fillStyle = tokenColor;
    ctx.strokeText(token.text, cursor, y);
    ctx.fillText(token.text, cursor, y);
    cursor += widths[index];
  });
}

function drawCoverVideo(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const videoRatio = video.videoWidth / video.videoHeight || 9 / 16;
  const frameRatio = width / height;
  let sourceWidth = video.videoWidth;
  let sourceHeight = video.videoHeight;
  let sourceX = 0;
  let sourceY = 0;

  if (videoRatio > frameRatio) {
    sourceWidth = video.videoHeight * frameRatio;
    sourceX = (video.videoWidth - sourceWidth) / 2;
  } else {
    sourceHeight = video.videoWidth / frameRatio;
    sourceY = (video.videoHeight - sourceHeight) / 2;
  }

  ctx.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawWatermark(ctx: CanvasRenderingContext2D, project: Project) {
  if (!project.watermark?.text) return;
  const { text, opacity, position } = project.watermark;
  
  ctx.save();
  ctx.globalAlpha = opacity || 0.8;
  ctx.fillStyle = "#ffffff";
  ctx.font = '600 24px "Inter", sans-serif';
  ctx.textBaseline = "middle";
  ctx.textAlign = position.includes("left") ? "left" : "right";

  const margin = 24;
  const x = position.includes("left") ? margin : project.canvas.width - margin;
  const y = position.includes("top") ? project.title.bandHeight + margin : project.canvas.height - margin;

  // Tiny drop shadow for readability
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 4;
  ctx.fillText(text, x, y);
  ctx.restore();
}
