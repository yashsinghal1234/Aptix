/**
 * High-performance Asynchronous IndexedDB Storage Layer for Aptix.
 * Prevents main-thread UI lag and frame-drops during draft autosaving.
 * Provides resilient offline caching for seamless crash recovery.
 */

const DB_NAME = "aptix_offline_v1";
const DB_VERSION = 1;
const STORE_NAME = "draft_answers";

function getDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve(null);
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "attemptId" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export interface OfflineAttemptState {
  attemptId: string;
  answers: Record<string, any>;
  timeSpent: Record<string, number>;
  lastSavedAt: number;
}

/**
 * Persists current answers and question time tracking asynchronously to IndexedDB.
 */
export async function saveDraftAnswersToIndexedDB(
  attemptId: string,
  answers: Record<string, any>,
  timeSpent: Record<string, number>
): Promise<boolean> {
  try {
    const db = await getDB();
    if (!db) {
      // Fallback to localStorage if IndexedDB is disabled
      if (typeof window !== "undefined") {
        localStorage.setItem(
          `aptix_attempt_${attemptId}`,
          JSON.stringify({ answers, timeSpent, lastSavedAt: Date.now() })
        );
      }
      return true;
    }

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      const record: OfflineAttemptState = {
        attemptId,
        answers,
        timeSpent,
        lastSavedAt: Date.now(),
      };

      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn("IndexedDB save failed, fallbacking", e);
    return false;
  }
}

/**
 * Retrieves cached answers for an attempt from IndexedDB (or fallback localStorage).
 */
export async function getDraftAnswersFromIndexedDB(
  attemptId: string
): Promise<OfflineAttemptState | null> {
  try {
    const db = await getDB();
    if (!db) {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem(`aptix_attempt_${attemptId}`);
        if (raw) return JSON.parse(raw);
      }
      return null;
    }

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(attemptId);

      req.onsuccess = () => {
        if (req.result) {
          resolve(req.result as OfflineAttemptState);
        } else {
          // Check localStorage as secondary fallback
          if (typeof window !== "undefined") {
            const raw = localStorage.getItem(`aptix_attempt_${attemptId}`);
            if (raw) {
              try {
                resolve(JSON.parse(raw));
                return;
              } catch (_) {}
            }
          }
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Purges the local cache once an assessment has been successfully submitted and sealed.
 */
export async function clearDraftAnswersFromIndexedDB(attemptId: string): Promise<void> {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`aptix_attempt_${attemptId}`);
    }

    const db = await getDB();
    if (!db) return;

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(attemptId);
  } catch (e) {
    console.warn("IndexedDB delete failed", e);
  }
}
