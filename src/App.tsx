import {
  ArrowDown,
  ArrowUp,
  Download,
  FileJson,
  Film,
  Plus,
  Save,
  Shuffle,
  Trash2,
  Upload,
  Video
} from "lucide-react";
import { ChangeEvent, DragEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { exportRankingVideo, type ExportProgress } from "./lib/exporter";
import { createProject, createSlot, normalizeProject } from "./lib/project";
import { getPlaybackSlots, moveSlot, setPlaybackMode, validateTrim } from "./lib/ranking";
import {
  deleteProject,
  exportProjectJson,
  importProjectJson,
  loadClipFile,
  loadProjects,
  saveClipFile,
  saveProject
} from "./lib/storage";
import type { ClipFileMap, Project, RankingSlot } from "./lib/types";

const FONT_OPTIONS = [
  "Impact",
  "Arial Black",
  "Bebas Neue",
  "Oswald",
  "Montserrat",
  "Bangers",
  "Passion One"
];

function App() {
  const [project, setProject] = useState<Project>(() => createProject());
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [files, setFiles] = useState<ClipFileMap>({});
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [notice, setNotice] = useState("Projects save locally in this browser.");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportState, setExportState] = useState<ExportProgress>({
    stage: "idle",
    message: "Ready to export",
    progress: 0
  });
  const [exportUrl, setExportUrl] = useState<{ url: string; ext: string } | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const titleDragRef = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);

  const playbackSlots = useMemo(() => getPlaybackSlots(project), [project]);
  const selectedSlot = project.slots.find((slot) => slot.id === selectedSlotId) || playbackSlots[0];
  const uploadedCount = project.slots.filter((slot) => files[slot.id]).length;
  const completeEnough = uploadedCount >= 5 && uploadedCount <= 6;

  // Unique words from the title for word-level color picking
  const titleWords = useMemo(() => {
    const seen = new Set<string>();
    return project.title.text
      .split(/[\n\s]+/)
      .filter(Boolean)
      .filter((w) => {
        const lower = w.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      });
  }, [project.title.text]);

  useEffect(() => {
    loadProjects()
      .then((projects) => {
        setSavedProjects(projects);
        if (projects[0]) {
          loadExistingProject(projects[0].id);
        }
      })
      .catch(() => setNotice("Local project storage is unavailable in this browser."));
  }, []);

  async function loadExistingProject(id: string) {
    try {
      const projects = await loadProjects();
      const next = projects.find((item) => item.id === id);
      if (!next) return;
      const fileEntries = await Promise.all(
        next.slots.map(async (slot) => [slot.id, await loadClipFile(next.id, slot.id)] as const)
      );
      setProject(normalizeProject(next));
      setFiles(Object.fromEntries(fileEntries));
      setSelectedSlotId(next.slots[0]?.id || "");
      setNotice(`Loaded ${next.name}`);
    } catch {
      setNotice("Failed to load project.");
    }
  }

  function updateProject(updater: (current: Project) => Project) {
    setProject((current) => normalizeProject(updater(current)));
  }

  function updateSlot(slotId: string, patch: Partial<RankingSlot>) {
    updateProject((current) => ({
      ...current,
      slots: current.slots.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot))
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await saveProject(project);
      for (const slot of project.slots) {
        const file = files[slot.id];
        if (file) {
          await saveClipFile(project.id, slot.id, file);
        }
      }
      setProject(saved);
      setSavedProjects(await loadProjects());
      setNotice("Project saved locally.");
    } catch {
      setNotice("Failed to save project.");
    } finally {
      setSaving(false);
    }
  }

  function handleNewProject() {
    if (!window.confirm("Start a new project? Any unsaved changes will be lost.")) return;
    const next = createProject();
    setProject(next);
    setFiles({});
    setSelectedSlotId(next.slots[0].id);
    setNotice("Started a fresh project.");
  }

  async function handleDeleteProject() {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    try {
      await deleteProject(project.id);
      const nextProjects = await loadProjects();
      setSavedProjects(nextProjects);
      setFiles({});
      if (nextProjects[0]) {
        await loadExistingProject(nextProjects[0].id);
      } else {
        const next = createProject();
        setProject(next);
        setSelectedSlotId(next.slots[0].id);
        setNotice("Project deleted. Started a fresh project.");
      }
    } catch {
      setNotice("Failed to delete project.");
    }
  }

  function attachFileToSlot(slot: RankingSlot, file: File) {
    const trim = validateTrim(slot.trimStart, Math.min(slot.trimEnd || 6, 6));
    setFiles((current) => ({ ...current, [slot.id]: file }));
    updateSlot(slot.id, {
      fileMeta: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      },
      trimStart: trim.start,
      trimEnd: trim.end
    });
    setNotice(`${file.name} is attached to rank ${slot.rank}.`);
  }

  function handleClipUpload(slot: RankingSlot, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    attachFileToSlot(slot, file);
  }

  function handleClipDrop(slot: RankingSlot, event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.currentTarget.classList.remove("drag-over");
    const file = event.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("video/")) {
      setNotice("Please drop a video file (MP4, WebM, MOV).");
      return;
    }
    attachFileToSlot(slot, file);
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.currentTarget.classList.add("drag-over");
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.currentTarget.classList.remove("drag-over");
  }

  function addSlot() {
    if (project.slots.length >= 6) return;
    updateProject((current) => {
      const slot = createSlot(current.slots.length + 1);
      return {
        ...current,
        slots: [...current.slots, slot],
        playbackOrder: [...current.playbackOrder, slot.id]
      };
    });
  }

  function removeSlot(slotId: string) {
    if (project.slots.length <= 2) {
      setNotice("A ranking video needs at least two clips.");
      return;
    }
    updateProject((current) => ({
      ...current,
      slots: current.slots.filter((slot) => slot.id !== slotId),
      playbackOrder: current.playbackOrder.filter((id) => id !== slotId)
    }));
    setFiles((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });
    setNotice("Clip slot removed.");
  }

  function downloadProjectJson() {
    downloadBlob(
      new Blob([exportProjectJson(project)], { type: "application/json" }),
      `${project.name.replace(/\W+/g, "-").toLowerCase()}-project.json`
    );
    setNotice("Project JSON downloaded.");
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = importProjectJson(text);
      setProject(imported);
      setFiles({});
      setSelectedSlotId(imported.slots[0]?.id || "");
      setNotice("Project JSON imported. Reattach local video files before exporting.");
    } catch {
      setNotice("Invalid project JSON file.");
    }
    event.target.value = "";
  }

  async function handleExport() {
    if (exporting) return;
    if (uploadedCount === 0) {
      setNotice("Upload at least one video clip before exporting.");
      return;
    }
    setExporting(true);
    setExportUrl(null);
    try {
      const blob = await exportRankingVideo(project, files, setExportState);
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      const url = URL.createObjectURL(blob);
      setExportUrl({ url, ext });
      setNotice(`Generation complete. Click Download Video to save.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed.";
      setExportState({ stage: "error", message, progress: 0 });
      setNotice(message);
    } finally {
      setExporting(false);
    }
  }

  function beginTitleDrag(event: PointerEvent<HTMLDivElement>) {
    titleDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      x: project.title.x,
      y: project.title.y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function dragTitle(event: PointerEvent<HTMLDivElement>) {
    if (!titleDragRef.current) return;
    const preview = event.currentTarget.closest(".phone-frame");
    const rect = preview?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = project.canvas.width / rect.width;
    const scaleY = project.canvas.height / rect.height;
    const dx = (event.clientX - titleDragRef.current.startX) * scaleX;
    const dy = (event.clientY - titleDragRef.current.startY) * scaleY;
    updateProject((current) => ({
      ...current,
      title: {
        ...current.title,
        x: Math.round(titleDragRef.current!.x + dx),
        y: Math.round(titleDragRef.current!.y + dy)
      }
    }));
  }

  function handleProjectSelect(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    if (!value) return;
    loadExistingProject(value);
  }

  // ---------- Word-level color helpers ----------

  function getWordColor(word: string): string {
    const lower = word.toLowerCase();
    const styles = project.title.wordStyles || {};
    if (styles[lower]) return styles[lower];
    const highlights = project.title.highlightedWords
      .split(",")
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean);
    if (highlights.includes(lower)) return project.title.highlightColor;
    return project.title.color;
  }

  function setWordColor(word: string, color: string) {
    updateProject((p) => ({
      ...p,
      title: {
        ...p.title,
        wordStyles: { ...(p.title.wordStyles || {}), [word.toLowerCase()]: color }
      }
    }));
  }

  function clearWordColor(word: string) {
    updateProject((p) => {
      const next = { ...(p.title.wordStyles || {}) };
      delete next[word.toLowerCase()];
      return { ...p, title: { ...p.title, wordStyles: next } };
    });
  }

  function updateNumberColor(index: number, color: string) {
    updateProject((p) => {
      const colors = [...p.numbers.colors];
      colors[index] = color;
      return { ...p, numbers: { ...p.numbers, colors } };
    });
  }

  return (
    <main className="app-shell">
      <section className="editor-pane">
        <header className="topbar">
          <div>
            <p className="eyebrow">Video creator studio</p>
            <h1>Clipideo</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" onClick={handleNewProject} title="New project">
              <Plus size={18} /> New
            </button>
            <button className="primary-button" onClick={handleSave} disabled={saving} title="Save locally">
              <Save size={18} /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </header>

        <section className="notice-bar">
          <Film size={18} />
          <span>{notice}</span>
        </section>

        <section className="panel project-row">
          <label>
            Project
            <input value={project.name} onChange={(event) => updateProject((p) => ({ ...p, name: event.target.value }))} />
          </label>
          <label>
            Saved
            <select value="" onChange={handleProjectSelect}>
              <option value="">{savedProjects.length ? "Select saved project…" : "No saved projects yet"}</option>
              {savedProjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <button className="icon-button" onClick={downloadProjectJson} title="Export project JSON">
            <FileJson size={18} />
          </button>
          <button className="icon-button" onClick={() => importInputRef.current?.click()} title="Import project JSON">
            <Upload size={18} />
          </button>
          <button className="danger-button" onClick={handleDeleteProject} title="Delete local project">
            <Trash2 size={18} />
          </button>
          <input ref={importInputRef} hidden type="file" accept="application/json" onChange={importJson} />
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Video Ranking Title</h2>
            <span>Drag the title in preview</span>
          </div>
          <textarea
            value={project.title.text}
            maxLength={64}
            onChange={(event) =>
              updateProject((p) => ({ ...p, title: { ...p.title, text: event.target.value } }))
            }
          />

          {titleWords.length > 0 && (
            <>
              <p className="word-chips-hint">Click a word to set its color:</p>
              <div className="word-chips">
                {titleWords.map((word) => {
                  const color = getWordColor(word);
                  const hasCustom = !!(project.title.wordStyles || {})[word.toLowerCase()];
                  return (
                    <div key={word} className="word-chip">
                      <label className="word-chip-label" style={{ color }}>
                        {word}
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setWordColor(word, e.target.value)}
                        />
                      </label>
                      {hasCustom && (
                        <button
                          className="word-chip-reset"
                          onClick={() => clearWordColor(word)}
                          title="Reset to default"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="grid-controls">
            <label>
              Font
              <select
                className="font-select"
                value={project.title.fontFamily}
                onChange={(event) =>
                  updateProject((p) => ({ ...p, title: { ...p.title, fontFamily: event.target.value } }))
                }
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
            <label>
              Size
              <input
                type="number"
                min={36}
                max={110}
                value={project.title.fontSize}
                onChange={(event) =>
                  updateProject((p) => ({ ...p, title: { ...p.title, fontSize: Number(event.target.value) } }))
                }
              />
            </label>
            <label>
              Text color
              <input
                type="color"
                value={project.title.color}
                onChange={(event) =>
                  updateProject((p) => ({ ...p, title: { ...p.title, color: event.target.value } }))
                }
              />
            </label>
            <label>
              Stroke
              <input
                type="range"
                min={0}
                max={16}
                value={project.title.strokeWidth}
                onChange={(event) =>
                  updateProject((p) => ({ ...p, title: { ...p.title, strokeWidth: Number(event.target.value) } }))
                }
              />
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>General Settings</h2>
            <span>{uploadedCount}/{project.slots.length} clips attached</span>
          </div>
          <div className="grid-controls">
            <label>
              Video height %
              <input
                type="number"
                min={55}
                max={86}
                value={project.canvas.videoHeightPercent}
                onChange={(event) =>
                  updateProject((p) => ({
                    ...p,
                    canvas: { ...p.canvas, videoHeightPercent: Number(event.target.value) }
                  }))
                }
              />
            </label>
            <label>
              Background
              <input
                type="color"
                value={project.canvas.background}
                onChange={(event) =>
                  updateProject((p) => ({ ...p, canvas: { ...p.canvas, background: event.target.value } }))
                }
              />
            </label>
            <label>
              Number size
              <input
                type="number"
                min={42}
                max={110}
                value={project.numbers.fontSize}
                onChange={(event) =>
                  updateProject((p) => ({ ...p, numbers: { ...p.numbers, fontSize: Number(event.target.value) } }))
                }
              />
            </label>
            <label>
              Label size
              <input
                type="number"
                min={24}
                max={72}
                value={project.label.fontSize}
                onChange={(event) =>
                  updateProject((p) => ({ ...p, label: { ...p.label, fontSize: Number(event.target.value) } }))
                }
              />
            </label>
            <label>
              Label font
              <select
                className="font-select"
                value={project.label.fontFamily}
                onChange={(event) =>
                  updateProject((p) => ({ ...p, label: { ...p.label, fontFamily: event.target.value } }))
                }
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Playback Order</h2>
            <span>{completeEnough ? "Ready length" : "Use 5-6 ranked clips"}</span>
          </div>
          <div className="segmented">
            <button
              className={project.playbackMode === "manual" ? "active" : ""}
              onClick={() => setProject(setPlaybackMode(project, "manual"))}
            >
              Manual
            </button>
            <button
              className={project.playbackMode === "shuffle" ? "active" : ""}
              onClick={() => setProject(setPlaybackMode(project, "shuffle"))}
            >
              <Shuffle size={16} /> Shuffle
            </button>
          </div>
          <div className="order-list">
            {playbackSlots.map((slot, index) => (
              <button key={slot.id} className="order-item" onClick={() => setSelectedSlotId(slot.id)}>
                <span>{index + 1}</span>
                <strong>Rank #{slot.rank}</strong>
                <em>{slot.label}</em>
              </button>
            ))}
          </div>
        </section>

        <section className="clip-list">
          {project.slots.map((slot, index) => (
            <article className={`clip-card ${selectedSlot?.id === slot.id ? "selected" : ""}`} key={slot.id}>
              <header>
                <button className="collapse-button" onClick={() => setSelectedSlotId(slot.id)}>
                  <Video size={18} /> Video Rank {slot.rank}
                </button>
                <div>
                  <button className="icon-button" onClick={() => setProject(moveSlot(project, slot.id, -1))} title="Move up">
                    <ArrowUp size={16} />
                  </button>
                  <button className="icon-button" onClick={() => setProject(moveSlot(project, slot.id, 1))} title="Move down">
                    <ArrowDown size={16} />
                  </button>
                  <button className="icon-button" onClick={() => removeSlot(slot.id)} title="Remove slot">
                    <Trash2 size={16} />
                  </button>
                </div>
              </header>
              <div className="clip-grid">
                <label>
                  Clip title
                  <input value={slot.label} onChange={(event) => updateSlot(slot.id, { label: event.target.value })} />
                </label>
                <label>
                  Source link
                  <input
                    value={slot.sourceUrl}
                    placeholder="TikTok, Instagram, or YouTube link"
                    onChange={(event) => updateSlot(slot.id, { sourceUrl: event.target.value })}
                  />
                </label>
              </div>
              <label
                className="upload-box"
                onDrop={(event) => handleClipDrop(slot, event)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Upload size={20} />
                <span>{slot.fileMeta?.name || "Choose a clip or drag and drop it here"}</span>
                <small>MP4/WebM/MOV. Links are saved as references only.</small>
                <input type="file" accept="video/*" onChange={(event) => handleClipUpload(slot, event)} />
              </label>
              <div className="grid-controls compact">
                <label>
                  Start
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={slot.trimStart}
                    onChange={(event) => {
                      const trim = validateTrim(Number(event.target.value), slot.trimEnd);
                      updateSlot(slot.id, { trimStart: trim.start, trimEnd: trim.end });
                    }}
                  />
                </label>
                <label>
                  End
                  <input
                    type="number"
                    min={0.5}
                    step={0.1}
                    value={slot.trimEnd}
                    onChange={(event) => {
                      const trim = validateTrim(slot.trimStart, Number(event.target.value));
                      updateSlot(slot.id, { trimStart: trim.start, trimEnd: trim.end });
                    }}
                  />
                </label>
                <label>
                  Volume
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={slot.volume}
                    onChange={(event) => updateSlot(slot.id, { volume: Number(event.target.value) })}
                  />
                </label>
                <div className="color-mini">
                  #
                  <input
                    type="color"
                    value={project.numbers.colors[index] || "#ffffff"}
                    onChange={(event) => updateNumberColor(index, event.target.value)}
                    title="Rank number color"
                  />
                </div>
                <div className="color-mini">
                  Label
                  <input
                    type="color"
                    value={slot.labelColor || "#ffffff"}
                    onChange={(event) => updateSlot(slot.id, { labelColor: event.target.value })}
                    title="Label text color"
                  />
                </div>
              </div>
            </article>
          ))}
        </section>

        <button className="wide-button" disabled={project.slots.length >= 6} onClick={addSlot}>
          <Plus size={18} /> Add More Video
        </button>
      </section>

      <aside className="preview-pane">
        <div className="preview-header">
          <span>Preview</span>
          <strong>{project.playbackMode}</strong>
        </div>
        <div className="phone-frame" style={{ background: project.canvas.background }}>
          {selectedSlot && files[selectedSlot.id] ? (
            <PreviewVideo file={files[selectedSlot.id]} slot={selectedSlot} project={project} />
          ) : (
            <div className="empty-preview">Upload a clip to preview</div>
          )}
          <div
            className="title-overlay"
            onPointerDown={beginTitleDrag}
            onPointerMove={dragTitle}
            onPointerUp={() => {
              titleDragRef.current = null;
            }}
          >
            <TitlePreview project={project} />
          </div>
          <NumberPreview project={project} activeSlot={selectedSlot} />
        </div>
        <div className="export-panel">
          <button className="export-button" onClick={handleExport} disabled={exporting || uploadedCount === 0}>
            {exporting ? "Generating…" : "Generate Ranking Video"}
          </button>
          
          {exportUrl && !exporting && (
            <a
              className="export-button success-button"
              href={exportUrl.url}
              download={`${project.name.replace(/\W+/g, "-").toLowerCase()}.${exportUrl.ext}`}
            >
              <Download size={20} /> Download Final Video
            </a>
          )}

          {exporting && (
            <div className="progress-track">
              <span style={{ width: `${Math.round(exportState.progress * 100)}%` }} />
            </div>
          )}
          <p>{exportState.message}</p>
        </div>
      </aside>
    </main>
  );
}

function PreviewVideo({ file, slot, project }: { file?: File; slot: RankingSlot; project: Project }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  if (!url) return null;

  return (
    <video
      className="preview-video"
      src={url}
      style={{
        top: `${(project.title.bandHeight / project.canvas.height) * 100}%`,
        height: `${project.canvas.videoHeightPercent}%`
      }}
      controls
      playsInline
      muted={slot.volume === 0}
    />
  );
}

function TitlePreview({ project }: { project: Project }) {
  const { title, canvas } = project;
  const highlights = title.highlightedWords
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
  const wordStyles = title.wordStyles || {};

  return (
    <div
      className="title-preview-text"
      style={{
        left: `${(title.x / canvas.width) * 100}%`,
        top: `${(title.y / canvas.height) * 100}%`,
        fontSize: `${Math.max(20, Math.min(40, title.fontSize / 2.35))}px`,
        fontFamily: `"${title.fontFamily || "Impact"}", Arial Black, Impact, sans-serif`,
        WebkitTextStroke: `${Math.max(1, title.strokeWidth / 6)}px ${title.strokeColor}`
      }}
    >
      {title.text.split("\n").map((line, lineIndex) => (
        <div key={`${line}-${lineIndex}`}>
          {line.split(/(\s+)/).map((word, index) => {
            const lower = word.trim().toLowerCase();
            const color = wordStyles[lower] || (highlights.includes(lower) ? title.highlightColor : title.color);
            return (
              <span key={`${word}-${index}`} style={{ color }}>
                {word}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function NumberPreview({ project, activeSlot }: { project: Project; activeSlot?: RankingSlot }) {
  return (
    <div
      className="number-stack-preview"
      style={{
        left: `${(project.numbers.x / project.canvas.width) * 100}%`,
        top: `${(project.numbers.y / project.canvas.height) * 100}%`,
        gap: `${(project.numbers.spacing / project.canvas.height) * 100}%`
      }}
    >
      {project.slots.map((slot, index) => {
        const isActive = activeSlot?.id === slot.id;
        return (
          <div className={`number-row ${isActive ? "active" : ""}`} key={slot.id}>
            <span
              style={{
                color: project.numbers.colors[index] || "#ffffff",
                WebkitTextStroke: `${Math.max(1, project.numbers.strokeWidth / 5)}px ${project.numbers.strokeColor}`
              }}
            >
              {slot.rank}.
            </span>
            <strong
              style={{
                opacity: isActive ? 1 : 0.55,
                color: slot.labelColor || "#ffffff",
                fontFamily: `"${project.label.fontFamily || "Impact"}", Arial Black, Impact, sans-serif`
              }}
            >
              {slot.label}
            </strong>
          </div>
        );
      })}
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default App;
