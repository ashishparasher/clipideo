import type { Project, RankingSlot } from "./types";

const rankColors = ["#ff2438", "#ff8a1c", "#f7e348", "#f3f4f8", "#f3f4f8", "#f3f4f8"];

export function createId(prefix = "id"): string {
  const cryptoId = globalThis.crypto?.randomUUID?.();
  return cryptoId ? `${prefix}-${cryptoId}` : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createSlot(rank: number): RankingSlot {
  return {
    id: createId("slot"),
    rank,
    label: "",
    labelColor: "#ffffff",
    sourceUrl: "",
    trimStart: 0,
    trimEnd: 6,
    volume: 1,
    hidden: false
  };
}

export function createProject(): Project {
  const now = new Date().toISOString();
  const slots = Array.from({ length: 5 }, (_, index) => createSlot(index + 1));

  return {
    id: createId("project"),
    name: "Clipideo",
    createdAt: now,
    updatedAt: now,
    canvas: {
      width: 1080,
      height: 1920,
      background: "#000000",
      videoHeightPercent: 76
    },
    title: {
      text: "",
      highlightedWords: "",
      wordStyles: {},
      color: "#ffffff",
      highlightColor: "#ff1938",
      fontSize: 74,
      fontFamily: "Impact",
      strokeColor: "#000000",
      strokeWidth: 8,
      align: "center",
      x: 540,
      y: 52,
      bandHeight: 250
    },
    numbers: {
      x: 70,
      y: 326,
      fontSize: 72,
      spacing: 92,
      strokeColor: "#000000",
      strokeWidth: 10,
      colors: rankColors
    },
    label: {
      x: 170,
      y: 334,
      fontSize: 42,
      fontFamily: "Impact",
      color: "#ffffff",
      strokeColor: "#000000",
      strokeWidth: 8
    },
    playbackMode: "manual",
    playbackOrder: slots.map((slot) => slot.id),
    slots,
    export: {
      fps: 30,
      mimeType: "",
      quality: 0.92
    }
  };
}

export function normalizeProject(project: Project): Project {
  const slots = project.slots
    .slice(0, 6)
    .map((slot, index) => ({
      ...slot,
      rank: index + 1,
      volume: clamp(slot.volume, 0, 1),
      labelColor: slot.labelColor || "#ffffff"
    }));
  const order = project.playbackOrder.filter((id) => slots.some((slot) => slot.id === id));
  const missing = slots.filter((slot) => !order.includes(slot.id)).map((slot) => slot.id);

  return {
    ...project,
    updatedAt: new Date().toISOString(),
    title: {
      ...project.title,
      fontFamily: project.title.fontFamily || "Impact",
      wordStyles: project.title.wordStyles || {}
    },
    label: {
      ...project.label,
      fontFamily: (project.label as any).fontFamily || "Impact"
    },
    slots,
    playbackOrder: [...order, ...missing]
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
