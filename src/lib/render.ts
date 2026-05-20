import { tokenizeTitle } from "./title";
import type { Project, RankingSlot } from "./types";

export function drawRankingFrame(
  ctx: CanvasRenderingContext2D,
  project: Project,
  video: HTMLVideoElement | null,
  activeSlot?: RankingSlot
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
    drawCoverVideo(ctx, video, 0, videoTop, width, Math.min(videoHeight, height - videoTop));
  }

  drawTitle(ctx, project);
  drawNumberStack(ctx, project, activeSlot);
}

export function drawTitle(ctx: CanvasRenderingContext2D, project: Project): void {
  const { title } = project;
  const lines = title.text.split("\n").slice(0, 2);
  const fontFamily = title.fontFamily || "Impact";
  ctx.textBaseline = "top";
  ctx.textAlign = title.align;
  ctx.font = `900 ${title.fontSize}px "${fontFamily}", Arial Black, Impact, sans-serif`;
  ctx.lineJoin = "round";

  const lineHeight = title.fontSize * 1.05;
  lines.forEach((line, index) => {
    drawHighlightedLine(ctx, line, title.highlightedWords, title.x, title.y + index * lineHeight, project);
  });
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

  project.slots.forEach((slot, index) => {
    if (slot.hidden) {
      return;
    }

    const y = numbers.y + index * numbers.spacing;
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
    ctx.strokeText(slot.label, label.x, label.y + index * numbers.spacing);
    ctx.fillText(slot.label, label.x, label.y + index * numbers.spacing);
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
