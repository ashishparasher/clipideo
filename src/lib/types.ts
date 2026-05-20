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
}

export type ClipFileMap = Record<string, File | undefined>;
