import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./lib/storage", async () => {
  const actual = await vi.importActual<typeof import("./lib/storage")>("./lib/storage");
  return {
    ...actual,
    loadProjects: vi.fn(async () => []),
    loadClipFile: vi.fn(async () => undefined),
    saveProject: vi.fn(async (project) => project),
    saveClipFile: vi.fn(async () => undefined),
    deleteProject: vi.fn(async () => undefined)
  };
});

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the creator workspace", async () => {
    render(<App />);

    expect(await screen.findByText("Clipideo")).toBeInTheDocument();
    expect(screen.getByText("Video Ranking Title")).toBeInTheDocument();
    expect(screen.getByText("Playback Order")).toBeInTheDocument();
    expect(screen.getByText("Generate Ranking Video")).toBeInTheDocument();
  });
});
