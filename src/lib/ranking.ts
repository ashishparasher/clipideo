import type { PlaybackMode, Project, RankingSlot } from "./types";

export function getPlayableSlots(project: Project): RankingSlot[] {
  const visibleSlots = project.slots.filter((slot) => !slot.hidden);
  const byId = new Map(visibleSlots.map((slot) => [slot.id, slot]));
  const ordered = project.playbackOrder
    .map((id) => byId.get(id))
    .filter((slot): slot is RankingSlot => Boolean(slot));
  const missing = visibleSlots.filter((slot) => !project.playbackOrder.includes(slot.id));

  return [...ordered, ...missing];
}

export function getPlaybackSlots(project: Project): RankingSlot[] {
  const slots = getPlayableSlots(project);
  if (project.playbackMode === "manual") {
    return slots;
  }
  return createRetentionShuffle(slots);
}

export function createRetentionShuffle(slots: RankingSlot[]): RankingSlot[] {
  if (slots.length <= 2) {
    return slots;
  }

  const middleFirst = [...slots].sort((a, b) => {
    const center = (slots.length + 1) / 2;
    return Math.abs(a.rank - center) - Math.abs(b.rank - center);
  });

  const result: RankingSlot[] = [];
  let left = 0;
  let right = middleFirst.length - 1;

  while (left <= right) {
    result.push(middleFirst[left]);
    if (left !== right) {
      result.push(middleFirst[right]);
    }
    left += 1;
    right -= 1;
  }

  return result;
}

export function setPlaybackMode(project: Project, playbackMode: PlaybackMode): Project {
  return { ...project, playbackMode, updatedAt: new Date().toISOString() };
}

export function moveSlot(project: Project, slotId: string, direction: -1 | 1): Project {
  const index = project.playbackOrder.indexOf(slotId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= project.playbackOrder.length) {
    return project;
  }
  const order = [...project.playbackOrder];
  [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
  return { ...project, playbackOrder: order, playbackMode: "manual", updatedAt: new Date().toISOString() };
}

export function validateTrim(start: number, end: number): { start: number; end: number } {
  const safeStart = Math.max(0, Number.isFinite(start) ? start : 0);
  const safeEnd = Math.max(safeStart + 0.5, Number.isFinite(end) ? end : safeStart + 6);
  return { start: roundTime(safeStart), end: roundTime(safeEnd) };
}

function roundTime(value: number): number {
  return Math.round(value * 10) / 10;
}
