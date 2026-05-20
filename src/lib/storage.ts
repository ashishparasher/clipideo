import { createProject, normalizeProject } from "./project";
import type { Project } from "./types";

const dbName = "clipideo";
const projectStore = "projects";
const fileStore = "files";

export async function openStudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(projectStore)) {
        db.createObjectStore(projectStore, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(fileStore)) {
        db.createObjectStore(fileStore);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProject(project: Project): Promise<Project> {
  const normalized = normalizeProject(project);
  const db = await openStudioDb();
  await txRequest(db, projectStore, "readwrite", (store) => store.put(normalized));
  db.close();
  return normalized;
}

export async function loadProject(id: string): Promise<Project | undefined> {
  const db = await openStudioDb();
  const result = await txRequest<Project | undefined>(db, projectStore, "readonly", (store) => store.get(id));
  db.close();
  return result ? normalizeProject(result) : undefined;
}

export async function loadProjects(): Promise<Project[]> {
  const db = await openStudioDb();
  const result = await txRequest<Project[]>(db, projectStore, "readonly", (store) => store.getAll());
  db.close();
  return result.map(normalizeProject).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openStudioDb();
  await txRequest(db, projectStore, "readwrite", (store) => store.delete(id));
  // Files are stored with composite keys "projectId:slotId", so we must
  // iterate and delete every key that belongs to this project.
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(fileStore, "readwrite");
    const store = tx.objectStore(fileStore);
    const cursor = store.openCursor();
    cursor.onsuccess = () => {
      const result = cursor.result;
      if (!result) {
        resolve();
        return;
      }
      if (typeof result.key === "string" && result.key.startsWith(`${id}:`)) {
        result.delete();
      }
      result.continue();
    };
    cursor.onerror = () => reject(cursor.error);
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function saveClipFile(projectId: string, slotId: string, file: File): Promise<void> {
  const db = await openStudioDb();
  await txRequest(db, fileStore, "readwrite", (store) => store.put(file, `${projectId}:${slotId}`));
  db.close();
}

export async function loadClipFile(projectId: string, slotId: string): Promise<File | undefined> {
  const db = await openStudioDb();
  const file = await txRequest<File | undefined>(db, fileStore, "readonly", (store) =>
    store.get(`${projectId}:${slotId}`)
  );
  db.close();
  return file;
}

export function exportProjectJson(project: Project): string {
  return JSON.stringify(normalizeProject(project), null, 2);
}

export function importProjectJson(json: string): Project {
  const parsed = JSON.parse(json) as Project;
  return normalizeProject({
    ...createProject(),
    ...parsed,
    id: parsed.id || createProject().id,
    updatedAt: new Date().toISOString()
  });
}

function txRequest<T>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = run(tx.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.onerror = () => reject(tx.error);
  });
}
