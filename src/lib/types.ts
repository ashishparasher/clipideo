export type PlaybackMode = "manual" | "shuffle";
export type TextAlign = "left" | "center" | "right";

export interface LocalFileMeta {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface CanvasSettings {
  width: number;
  height: number;
  background: string;
  videoHeightPercent: number;
  filter: "none" | "grayscale" | "sepia" | "contrast" | "blur";
}

export interface TitleSettings {
  text: string;
  highlightedWords: string;
  wordStyles: Record<string, string>;
  color: string;
  highlightColor: string;
  fontSize: number;
  fontFamily: string;
  strokeColor: string;
  strokeWidth: number;
  align: TextAlign;
  x: number;
  y: number;
  bandHeight: number;
  animation: "none" | "pop" | "typewriter";
}

export interface NumberStackSettings {
  x: number;
  y: number;
  fontSize: number;
  spacing: number;
  strokeColor: string;
  strokeWidth: number;
  colors: string[];
}

export interface LabelSettings {
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
}

export interface RankingSlot {
  id: string;
  rank: number;
  label: string;
  labelColor: string;
  sourceUrl: string;
  fileMeta?: LocalFileMeta;
  trimStart: number;
  trimEnd: number;
  volume: number;
  hidden: boolean;
}

export interface ExportSettings {
  fps: number;
  mimeType: string;
  quality: number;
  transition: "none" | "dip-to-black";
}

export interface AudioSettings {
  bgmVolume: number;
  sfxEnabled: boolean;
}

export interface WatermarkSettings {
  text: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  opacity: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  canvas: CanvasSettings;
  title: TitleSettings;
  numbers: NumberStackSettings;
  label: LabelSettings;
  playbackMode: PlaybackMode;
  playbackOrder: string[];
  slots: RankingSlot[];
  export: ExportSettings;
  audio: AudioSettings;
  watermark: WatermarkSettings;
}

export type ClipFileMap = Record<string, File | undefined>;
