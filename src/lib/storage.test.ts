import { describe, expect, it } from "vitest";
import { createProject } from "./project";
import { exportProjectJson, importProjectJson } from "./storage";

describe("project JSON", () => {
  it("exports and imports a normalized project", () => {
    const project = createProject();
    const imported = importProjectJson(exportProjectJson(project));

    expect(imported.name).toBe(project.name);
    expect(imported.slots).toHaveLength(5);
    expect(imported.playbackOrder).toHaveLength(5);
  });
});
