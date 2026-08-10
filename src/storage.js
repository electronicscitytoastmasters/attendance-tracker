/**
 * storage.js — Multi-tab storage adapter
 * ========================================
 * Three modes, same public API (getJSON / setJSON):
 *
 *   "local"  — browser localStorage, JSON values.
 *              Fast, no setup. Data is per-device and per-browser.
 *              Good for development and testing.
 *
 *   "excel"  — a local .xlsx file on your computer (File System Access API).
 *              Human-readable multi-tab workbook, auto-saved every ~1.5 s.
 *              Requires Chrome or Edge. Single-device.
 *
 *   "sheets" — Google Sheets via Apps Script Web App.
 *              Human-readable multi-tab spreadsheet, shared across devices.
 *              Requires the Apps Script deployed (see SETUP.md).
 *
 * HOW TO SWITCH:
 *   Change MODE below.
 *   For "sheets": also set SHEETS_URL to your deployed Web App URL.
 *   For "excel":  call initStorage() on app startup (App.jsx already does this).
 */

import * as XLSX from "xlsx";
import { idbGet, idbSet } from "./idb.js";

// ─── Configuration ────────────────────────────────────────────────────────────
export const MODE = "sheets";   // "local" | "excel" | "sheets"
export const SHEETS_URL = import.meta.env.VITE_SHEETS_URL || "";  // Paste Apps Script Web App URL here (sheets mode)

// ─── Tab names ────────────────────────────────────────────────────────────────
const TAB = {
  CONFIG: "Config",
  MEMBERS: "Members",
  SESSIONS: "Sessions",
  ATTEND: "Attendance",
  ARCH_IDX: "Archive_Index",
};

// Human-readable column headers for each tab.
// Columns starting with _ are "system" columns — they come after human columns
// so the spreadsheet is readable without scrolling right.
const HEADERS = {
  [TAB.CONFIG]: ["key", "value"],
  [TAB.MEMBERS]: ["name", "is_ec", "join_date", "leave_date", "_id"],
  [TAB.SESSIONS]: ["date", "label", "_id"],
  [TAB.ATTEND]: ["session_date", "member_name", "present", "mode", "checked_in_ist",
    "_session_id", "_member_id", "_timestamp_utc"],
  [TAB.ARCH_IDX]: ["term_label", "term_start", "term_end", "archived_on"],
};

const ARCHIVE_HDR = ["session_date", "member_name", "is_ec", "present", "mode",
  "checked_in_ist", "_term_label"];

// ─── IST formatter (used when writing readable time to sheets) ────────────────
function toISTStr(iso) {
  if (!iso) return "";
  const IST_MS = 5.5 * 60 * 60 * 1000;
  const d = new Date(new Date(iso).getTime() + IST_MS);
  const h = d.getUTCHours(), m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"} IST`;
}

// ─── In-memory cache ──────────────────────────────────────────────────────────
// Keeps members and sessions list in memory so attendance writes can enrich
// rows with display names and dates without doing a recursive getJSON call.
const _cache = { members: null, sessions: null };

// ═══════════════════════════════════════════════════════════════════════════════
// EXCEL MODE
// ═══════════════════════════════════════════════════════════════════════════════

let _wb = null;   // XLSX Workbook object (in-memory)
let _fh = null;   // FileSystemFileHandle

/**
 * Try to reconnect to a previously chosen file (stored in IndexedDB).
 * Returns true if ready, false if user needs to pick a file.
 * Call this on app startup when MODE === "excel".
 */
export async function initStorage() {
  if (MODE !== "excel") return true;

  try {
    const fh = await idbGet("fh");
    if (!fh) return false;

    // requestPermission REQUIRES a user gesture in Chrome.
    // When called automatically on page load it will return "denied".
    // We catch that case and return false so the UI can show a Reconnect button.
    const perm = await fh.requestPermission({ mode: "readwrite" }).catch(() => "denied");
    if (perm !== "granted") return false;

    _fh = fh;
    const file = await fh.getFile();
    const buf = await file.arrayBuffer();
    _wb = XLSX.read(buf, { raw: false });
    _ensureTabs();
    _lastFileMod = file.lastModified;
    return true;
  } catch (e) {
    console.error("initStorage failed", e);
    return false;
  }
}

/**
 * Returns true if a file handle is stored in IndexedDB (even if permission
 * hasn't been granted yet for this session).
 * Use this to distinguish "file never set up" from "needs a reconnect click".
 */
export async function hasStoredFile() {
  if (MODE !== "excel") return false;
  try {
    return !!(await idbGet("fh"));
  } catch {
    return false;
  }
}

/**
 * Re-request permission for the previously chosen file.
 * MUST be called from a user gesture (button click) — not on page load.
 * Returns true if the file was successfully reconnected.
 */
export async function reconnectFile() {
  try {
    const fh = await idbGet("fh");
    if (!fh) return false;

    const perm = await fh.requestPermission({ mode: "readwrite" });
    if (perm !== "granted") return false;

    _fh = fh;
    const file = await fh.getFile();
    const buf = await file.arrayBuffer();
    _wb = XLSX.read(buf, { raw: false });
    _ensureTabs();
    _lastFileMod = file.lastModified;
    return true;
  } catch (e) {
    console.error("reconnectFile failed", e);
    return false;
  }
}


/**
 * Let user pick a file (open existing or create new).
 * Returns true on success, false if user cancelled or browser unsupported.
 */
export async function pickFile(createNew = false) {
  if (!("showOpenFilePicker" in window)) return false;
  try {
    let fh;
    if (createNew) {
      fh = await window.showSaveFilePicker({
        suggestedName: "ecity-attendance.xlsx",
        types: [{
          description: "Excel Workbook",
          accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] }
        }],
      });
      _wb = XLSX.utils.book_new();
      _ensureTabs();
    } else {
      [fh] = await window.showOpenFilePicker({
        types: [{
          description: "Excel Workbook",
          accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] }
        }],
        multiple: false,
      });
      const file = await fh.getFile();
      const buf = await file.arrayBuffer();
      _wb = XLSX.read(buf, { raw: false });
      _ensureTabs();
    }
    _fh = fh;
    await idbSet("fh", fh);
    await _flushNow(); // write immediately (for createNew: writes blank workbook)
    return true;
  } catch (e) {
    // User cancelled the picker — not an error
    if (e.name !== "AbortError") console.error("pickFile failed", e);
    return false;
  }
}

// Ensure all required tabs exist (creates them if missing)
function _ensureTabs() {
  Object.entries(HEADERS).forEach(([name, header]) => {
    if (!_wb.SheetNames.includes(name)) {
      const ws = XLSX.utils.aoa_to_sheet([header]);
      _freezeHeader(ws);
      XLSX.utils.book_append_sheet(_wb, ws, name);
    }
  });
}

// Freeze the top row in a worksheet
function _freezeHeader(ws) {
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
}

// Read a tab as array of row objects
function _rows(tabName) {
  if (!_wb?.Sheets[tabName]) return [];
  return XLSX.utils.sheet_to_json(_wb.Sheets[tabName], { defval: "" });
}

// Write a tab: clears it and rewrites with header + rows
function _writeTab(tabName, header, rows) {
  const data = [header, ...rows.map((r) => header.map((h) => r[h] ?? ""))];
  const ws = XLSX.utils.aoa_to_sheet(data);
  _freezeHeader(ws);
  // Set column widths for readability
  ws["!cols"] = header.map((h) => ({
    wch: h.startsWith("_") ? 24 : Math.max(h.length + 2, 14),
  }));
  _wb.Sheets[tabName] = ws;
  if (!_wb.SheetNames.includes(tabName)) _wb.SheetNames.push(tabName);
}



let _refreshPromise = null;
let _lastFileMod = 0;

async function _ensureFreshWb() {
  if (!_fh) return;
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const file = await _fh.getFile();
      if (file.lastModified !== _lastFileMod) {
        const buf = await file.arrayBuffer();
        _wb = XLSX.read(buf, { raw: false });
        _ensureTabs();
        _lastFileMod = file.lastModified;
      }
    } catch (e) {
      console.error("Failed to reload file", e);
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

async function _flushNow() {
  if (!_fh || !_wb) return;
  try {
    const buf = XLSX.write(_wb, { type: "array", bookType: "xlsx" });
    const w = await _fh.createWritable();
    await w.write(buf);
    await w.close();
    const file = await _fh.getFile();
    _lastFileMod = file.lastModified;
  } catch (e) {
    console.error("Excel flush failed", e);
  }
}

// ── Config tab helpers ─────────────────────────────────────────────────────────
function _cfgGet(key) {
  return _rows(TAB.CONFIG).find((r) => r.key === key)?.value ?? null;
}

function _cfgSet(updates) {
  const rows = _rows(TAB.CONFIG);
  const idx = Object.fromEntries(rows.map((r, i) => [r.key, i]));
  Object.entries(updates).forEach(([k, v]) => {
    if (idx[k] !== undefined) rows[idx[k]].value = v;
    else rows.push({ key: k, value: v });
  });
  _writeTab(TAB.CONFIG, HEADERS[TAB.CONFIG], rows);
}

// ── Excel getJSON ─────────────────────────────────────────────────────────────
async function _excelGet(key) {
  if (!_wb) return null;
  await _ensureFreshWb();

  if (key === "members") {
    const list = _rows(TAB.MEMBERS).map((r) => ({
      id: r._id || r.name,
      name: r.name,
      ec: r.is_ec === "Yes",
      joinDate: r.join_date || null,
      leaveDate: r.leave_date || null,
    }));
    _cache.members = list;
    return list;
  }

  if (key === "sessions") {
    const list = _rows(TAB.SESSIONS).map((r) => ({
      id: r._id || r.date,
      date: r.date,
      label: r.label,
    }));
    _cache.sessions = list;
    return list;
  }

  if (key === "term") {
    const s = _cfgGet("term_start");
    const e = _cfgGet("term_end");
    const l = _cfgGet("term_label");
    return s ? { start: s, end: e, label: l } : null;
  }

  if (key === "activeSessionId") {
    return _cfgGet("active_session_id") ?? "";
  }

  if (key.startsWith("att:")) {
    const sid = key.slice(4);
    const result = {};
    _rows(TAB.ATTEND)
      .filter((r) => r._session_id === sid)
      .forEach((r) => {
        result[r._member_id] = {
          p: r.present === "Yes",
          t: r._timestamp_utc || null,
          m: "self",
          mode: r.mode === "Online" ? "online"
            : r.mode === "In-Person" ? "in-person"
              : null,
        };
      });
    return result;
  }

  if (key === "archiveIndex") {
    return _rows(TAB.ARCH_IDX).map((r) => ({
      label: r.term_label, start: r.term_start, end: r.term_end,
    }));
  }

  if (key.startsWith("archive:")) {
    const tabName = `Arch_${key.slice(8)}`;
    return _wb.Sheets[tabName] ? _readArchiveTab(tabName) : null;
  }

  return null;
}

// ── Excel setJSON ─────────────────────────────────────────────────────────────
async function _excelSet(key, value) {
  if (!_wb) return;

  if (key === "members") {
    _cache.members = value;
    _writeTab(TAB.MEMBERS, HEADERS[TAB.MEMBERS], value.map((m) => ({
      name: m.name, is_ec: m.ec ? "Yes" : "",
      join_date: m.joinDate || "", leave_date: m.leaveDate || "", _id: m.id,
    })));
    await _flushNow();
    return;
  }

  if (key === "sessions") {
    _cache.sessions = value;
    _writeTab(TAB.SESSIONS, HEADERS[TAB.SESSIONS], value.map((s) => ({
      date: s.date, label: s.label, _id: s.id,
    })));
    await _flushNow();
    return;
  }

  if (key === "term") {
    _cfgSet({ term_start: value.start, term_end: value.end, term_label: value.label });
    await _flushNow();
    return;
  }

  if (key === "activeSessionId") {
    _cfgSet({ active_session_id: value });
    await _flushNow();
    return;
  }

  if (key.startsWith("att:")) {
    const sid = key.slice(4);
    const sess = (_cache.sessions || []).find((s) => s.id === sid);
    const memberMap = Object.fromEntries((_cache.members || []).map((m) => [m.id, m.name]));

    const allRows = _rows(TAB.ATTEND);
    const others = allRows.filter((r) => r._session_id !== sid);
    const currentSessRows = allRows.filter((r) => r._session_id === sid);

    const existingMap = {};
    currentSessRows.forEach((r) => {
      existingMap[r._member_id] = r;
    });

    Object.entries(value).forEach(([mid, rec]) => {
      existingMap[mid] = {
        session_date: sess?.date || existingMap[mid]?.session_date || "",
        member_name: memberMap[mid] || existingMap[mid]?.member_name || mid,
        present: rec.p ? "Yes" : "No",
        mode: rec.p ? (rec.mode === "online" ? "Online" : "In-Person") : "",
        checked_in_ist: rec.p ? toISTStr(rec.t) : "",
        _session_id: sid,
        _member_id: mid,
        _timestamp_utc: rec.t || "",
      };
    });

    _writeTab(TAB.ATTEND, HEADERS[TAB.ATTEND], [...others, ...Object.values(existingMap)]);
    await _flushNow();
    return;
  }

  if (key === "archiveIndex") {
    _writeTab(TAB.ARCH_IDX, HEADERS[TAB.ARCH_IDX], value.map((a) => ({
      term_label: a.label, term_start: a.start, term_end: a.end,
      archived_on: new Date().toISOString().split("T")[0],
    })));
    await _flushNow();
    return;
  }

  if (key.startsWith("archive:")) {
    _writeArchiveTab(`Arch_${key.slice(8)}`, value);
    await _flushNow();
    return;
  }
}

function _writeArchiveTab(tabName, bundle) {
  const { term, sessions, members, attendance } = bundle;
  const rows = [];
  sessions.sort((a, b) => a.date.localeCompare(b.date)).forEach((sess) => {
    const att = attendance[sess.id] || {};
    members.forEach((m) => {
      const rec = att[m.id];
      rows.push({
        session_date: sess.date,
        member_name: m.name,
        is_ec: m.ec ? "Yes" : "",
        present: rec?.p ? "Yes" : "No",
        mode: rec?.p ? (rec.mode === "online" ? "Online" : "In-Person") : "",
        checked_in_ist: rec?.p ? toISTStr(rec.t) : "",
        _term_label: term.label,
      });
    });
  });
  _writeTab(tabName, ARCHIVE_HDR, rows);
}

function _readArchiveTab(tabName) {
  const rows = _rows(tabName);
  if (!rows.length) return null;
  const term = { label: rows[0]._term_label, start: "", end: "" };
  const dates = [...new Set(rows.map((r) => r.session_date))].sort();
  const sessions = dates.map((d) => ({ id: d, date: d, label: `Saturday, ${d}` }));
  const names = [...new Set(rows.map((r) => r.member_name))];
  const members = names.map((name) => ({
    id: name, name,
    ec: rows.find((r) => r.member_name === name)?.is_ec === "Yes",
    joinDate: null, leaveDate: null,
  }));
  const attendance = {};
  sessions.forEach((sess) => {
    attendance[sess.id] = {};
    rows
      .filter((r) => r.session_date === sess.date && r.present === "Yes")
      .forEach((r) => {
        attendance[sess.id][r.member_name] = {
          p: true,
          mode: r.mode === "Online" ? "online" : "in-person",
          t: null, m: "archived",
        };
      });
  });
  return { term, sessions, members, attendance };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL MODE (localStorage, JSON values — dev/testing)
// ═══════════════════════════════════════════════════════════════════════════════

function _localGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function _localSet(key, value) {
  try {
    if (key === "members") _cache.members = value;
    if (key === "sessions") _cache.sessions = value;
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { console.error("localStorage write failed", key, e); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHEETS MODE (Google Sheets via Apps Script Web App)
// ═══════════════════════════════════════════════════════════════════════════════
//
// GET  → fetch(SHEETS_URL?action=get&key=...) — returns { data: ... }
// POST → fetch(SHEETS_URL, { method:"POST", body: JSON string }) — no-cors
//
// Notes on no-cors POST:
//   We don't set Content-Type header so the browser sends text/plain (a "simple"
//   content type), which avoids a CORS preflight and allows the request to
//   go through. Apps Script reads the body via e.postData.contents and parses
//   it as JSON. We don't get a response back (opaque), so we rely on the
//   local optimistic cache.
// ─────────────────────────────────────────────────────────────────────────────

let _lastWriteTime = 0;
const WRITE_COOLDOWN_MS = 10000; // 10 seconds

async function _sheetsGet(key) {
  // If a local write occurred very recently, rely on our local cache for key state keys
  const now = Date.now();
  const withinCooldown = (now - _lastWriteTime) < WRITE_COOLDOWN_MS;

  if (withinCooldown && _sheetsCache[key] !== undefined) {
    return _sheetsCache[key];
  }

  // Clear cache if we are outside cooldown to perform actual remote reads
  if (!withinCooldown) {
    delete _sheetsCache[key];
  }

  if (_sheetsCache[key] !== undefined) return _sheetsCache[key];
  try {
    const params = _getParams(key);
    const pin = sessionStorage.getItem("ecat_admin_pin");
    if (pin) params.pin = pin;
    const res = await fetch(`${SHEETS_URL}?${new URLSearchParams(params)}`);
    const json = await res.json();
    if (json.error) {
      console.error(`sheetsGet error for ${key}:`, json.error);
      return null;
    }
    const data = json.data;
    if (key === "members") _cache.members = data;
    if (key === "sessions") _cache.sessions = data;
    _sheetsCache[key] = data ?? null;
    return _sheetsCache[key];
  } catch (e) {
    console.error("sheetsGet failed", key, e);
    return null;
  }
}

async function _sheetsSet(key, value) {
  _lastWriteTime = Date.now();
  // Optimistic local update — POST is fire-and-forget (no-cors)
  _sheetsCache[key] = value;
  if (key === "members") _cache.members = value;
  if (key === "sessions") _cache.sessions = value;

  try {
    const body = _postBody(key, value);
    const pin = sessionStorage.getItem("ecat_admin_pin");
    if (pin) body.pin = pin;

    await fetch(SHEETS_URL, {
      method: "POST",
      mode: "no-cors",
      // No Content-Type header → browser sets text/plain (simple, no preflight)
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("sheetsSet failed", key, e);
  }
}

function _getParams(key) {
  if (key === "members" || key === "sessions" || key === "term" ||
    key === "activeSessionId" || key === "archiveIndex")
    return { action: "get", key };
  if (key.startsWith("att:"))
    return { action: "get", key: "att", session_id: key.slice(4) };
  if (key.startsWith("archive:"))
    return { action: "get", key: "archive", term_key: key.slice(8) };
  return { action: "get", key };
}

function _postBody(key, value) {
  if (key.startsWith("att:")) {
    return {
      action: "set", key: "att",
      session_id: key.slice(4), data: value,
      members: _cache.members || [],
      sessions: _cache.sessions || [],
    };
  }
  if (key.startsWith("archive:"))
    return { action: "set", key: "archive", term_key: key.slice(8), data: value };
  return { action: "set", key, data: value };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export function getFileName() {
  return _fh?.name || "";
}

export async function getJSON(key) {
  if (MODE === "excel") return await _excelGet(key);
  if (MODE === "sheets") return _sheetsGet(key);
  return _localGet(key);
}

export async function setJSON(key, value) {
  if (MODE === "excel") { await _excelSet(key, value); return; }
  if (MODE === "sheets") { await _sheetsSet(key, value); return; }
  _localSet(key, value);
}
