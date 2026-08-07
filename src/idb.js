/**
 * idb.js — Tiny IndexedDB helper
 * Used to persist the FileSystemFileHandle across page refreshes (excel mode).
 * FileSystemFileHandle cannot be stored in localStorage/sessionStorage,
 * but CAN be stored in IndexedDB.
 */

const DB_NAME = "ecity-att";
const STORE   = "kv";

function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE);
    req.onsuccess = (e) => res(e.target.result);
    req.onerror  = (e) => rej(e.target.error);
  });
}

export async function idbGet(key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => res(req.result ?? null);
    req.onerror   = () => rej(req.error);
  });
}

export async function idbSet(key, val) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(val, key);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
}
