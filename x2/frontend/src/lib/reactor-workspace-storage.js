const STORAGE_PREFIX = "launchd:reactor-workspace:v1";
const DATABASE_NAME = "launchd-reactor-workspace";
const FILE_STORE = "files";

export const PROMPT_HISTORY_LIMIT = 50;

function workspaceKey(slug) {
  return `${STORAGE_PREFIX}:${slug}`;
}

function fileKey(slug, kind) {
  return `${slug}:${kind}`;
}

export function readReactorWorkspace(slug) {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(workspaceKey(slug)) || "null");
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

export function writeReactorWorkspace(slug, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(workspaceKey(slug), JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private browsing or after quota exhaustion.
  }
}

export function createPromptHistoryEntry(prompt) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    prompt,
    createdAt: Date.now(),
  };
}

function openFileDatabase() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(FILE_STORE)) {
        request.result.createObjectStore(FILE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withFileStore(mode, operation) {
  const database = await openFileDatabase();
  if (!database) return null;
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(FILE_STORE, mode);
      const request = operation(transaction.objectStore(FILE_STORE));
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function saveReactorWorkspaceFile(slug, kind, file) {
  if (!file) return;
  await withFileStore("readwrite", (store) => store.put({
    blob: file,
    name: file.name,
    type: file.type,
    lastModified: file.lastModified,
  }, fileKey(slug, kind)));
}

export async function readReactorWorkspaceFile(slug, kind) {
  const stored = await withFileStore("readonly", (store) => store.get(fileKey(slug, kind)));
  if (!stored?.blob) return null;
  return new File([stored.blob], stored.name || `${kind}-upload`, {
    type: stored.type || stored.blob.type,
    lastModified: stored.lastModified || Date.now(),
  });
}

export async function deleteReactorWorkspaceFile(slug, kind) {
  await withFileStore("readwrite", (store) => store.delete(fileKey(slug, kind)));
}
