import { describe, expect, it } from "vitest";
import { createProject } from "./project";
import { createRetentionShuffle, getPlaybackSlots, validateTrim } from "./ranking";

describe("ranking logic", () => {
  it("keeps manual order", () => {
    const project = createProject();
    expect(getPlaybackSlots(project).map((slot) => slot.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it("creates a non-linear retention shuffle", () => {
    const project = createProject();
    const shuffled = createRetentionShuffle(project.slots).map((slot) => slot.rank);
    expect(shuffled).toHaveLength(5);
    expect(new Set(shuffled)).toEqual(new Set([1, 2, 3, 4, 5]));
    expect(shuffled).not.toEqual([1, 2, 3, 4, 5]);
  });

  it("validates trims with a minimum duration", () => {
    expect(validateTrim(4, 4.1)).toEqual({ start: 4, end: 4.5 });
    expect(validateTrim(-2, 2)).toEqual({ start: 0, end: 2 });
  });
});
