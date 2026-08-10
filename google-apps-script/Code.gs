/**
 * Google Apps Script — Attendance Tracker Backend (Multi-Tab)
 * ============================================================
 * Paste this entire file into your Google Apps Script editor.
 * See SETUP.md for step-by-step instructions.
 *
 * Sheet structure (5 tabs, auto-created on first use):
 *   Config        — term info and active session id (key | value rows)
 *   Members       — club member roster (name | is_ec | join_date | leave_date | _id)
 *   Sessions      — list of Saturday sessions (date | label | _id)
 *   Attendance    — check-in records (session_date | member_name | present | mode | ...)
 *   Archive_Index — list of archived past terms
 *   Arch_*        — one tab per archived term (created automatically)
 */

// ─── Tab names ────────────────────────────────────────────────────────────────
const TABS = {
  CONFIG:   "Config",
  MEMBERS:  "Members",
  SESSIONS: "Sessions",
  ATTEND:   "Attendance",
  ARCH_IDX: "Archive_Index",
};

const HEADERS = {
  [TABS.CONFIG]:   ["key",          "value"],
  [TABS.MEMBERS]:  ["name",         "is_ec",      "join_date",  "leave_date",  "_id"],
  [TABS.SESSIONS]: ["date",         "label",       "_id"],
  [TABS.ATTEND]:   ["session_date", "member_name", "present",   "mode",
                    "checked_in_ist", "_session_id", "_member_id", "_timestamp_utc"],
  [TABS.ARCH_IDX]: ["term_label",   "term_start",  "term_end",  "archived_on"],
};

const ARCHIVE_HDR = ["session_date", "member_name", "is_ec", "present",
                     "mode", "checked_in_ist", "_term_label"];

// ─── Spreadsheet helpers ──────────────────────────────────────────────────────
function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }

function getOrCreate(name) {
  return ss().getSheetByName(name) || ss().insertSheet(name);
}

function ensureHeader(sheet, header) {
  if (sheet.getLastRow() === 0) {
    const r = sheet.appendRow(header);
    sheet.getRange(1, 1, 1, header.length)
      .setFontWeight("bold")
      .setBackground("#F7F5EC");
    sheet.setFrozenRows(1);
    // Auto-resize columns
    header.forEach((_, i) => sheet.autoResizeColumn(i + 1));
  }
}

const _readRowsCache = {};

/** Read all data rows as array of plain objects */
function readRows(sheetName) {
  if (_readRowsCache[sheetName]) {
    return _readRowsCache[sheetName];
  }
  const sheet = ss().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const [header, ...rows] = sheet.getDataRange().getValues();
  const data = rows
    .filter(r => r.some(c => c !== ""))  // skip completely empty rows
    .map(r => Object.fromEntries(header.map((h, i) => {
      let val = r[i];
      if (val instanceof Date) {
        if (h === "_timestamp_utc") {
          val = val.toISOString();
        } else {
          try {
            val = Utilities.formatDate(val, ss().getSpreadsheetTimeZone(), "yyyy-MM-dd");
          } catch (e) {
            val = Utilities.formatDate(val, "GMT", "yyyy-MM-dd");
          }
        }
      }
      return [h, String(val ?? "").trim()];
    })));
  _readRowsCache[sheetName] = data;
  return data;
}

/** Overwrite a tab: clear content, write header + rows */
function writeRows(sheetName, header, rows, skipResize) {
  delete _readRowsCache[sheetName];
  const sheet = getOrCreate(sheetName);
  sheet.clearContents();
  const all = [header, ...rows.map(r => header.map(h => r[h] ?? ""))];
  sheet.getRange(1, 1, all.length, header.length).setValues(all);
  sheet.getRange(1, 1, 1, header.length)
    .setFontWeight("bold")
    .setBackground("#F7F5EC");
  sheet.setFrozenRows(1);
  if (!skipResize) {
    header.forEach((_, i) => sheet.autoResizeColumn(i + 1));
  }
}

// ─── Config helpers ───────────────────────────────────────────────────────────
function cfgGet(key) {
  const row = readRows(TABS.CONFIG).find(r => r.key === key);
  return row ? row.value : null;
}

function cfgSet(updates) {
  delete _readRowsCache[TABS.CONFIG];
  const sheet = getOrCreate(TABS.CONFIG);
  ensureHeader(sheet, HEADERS[TABS.CONFIG]);
  // Build lookup of existing key → row number (1-indexed, +1 for header)
  const rows = readRows(TABS.CONFIG);
  const idx = Object.fromEntries(rows.map((r, i) => [r.key, i + 2]));
  Object.entries(updates).forEach(([k, v]) => {
    if (idx[k]) {
      sheet.getRange(idx[k], 2).setValue(v);
    } else {
      sheet.appendRow([k, v]);
    }
  });
}

// ─── IST formatter ────────────────────────────────────────────────────────────
function toIST(iso) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 5.5 * 60 * 60 * 1000);
  const h = d.getUTCHours(), m = Utilities.formatString("%02d", d.getUTCMinutes());
  return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"} IST`;
}

// ─── Archive helpers ──────────────────────────────────────────────────────────
function writeArchive(tabName, bundle) {
  const { term, sessions, members, attendance } = bundle;
  const rows = [];
  sessions.sort((a, b) => a.date > b.date ? 1 : -1).forEach(sess => {
    const att = attendance[sess.id] || {};
    members.forEach(m => {
      const rec = att[m.id];
      rows.push({
        session_date:   sess.date,
        member_name:    m.name,
        is_ec:          m.ec ? "Yes" : "",
        present:        rec && rec.p ? "Yes" : "No",
        mode:           rec && rec.p ? (rec.mode === "online" ? "Online" : "In-Person") : "",
        checked_in_ist: rec && rec.p ? toIST(rec.t) : "",
        _term_label:    term.label,
      });
    });
  });
  writeRows(tabName, ARCHIVE_HDR, rows);
}

function readArchive(tabName) {
  const rows = readRows(tabName);
  if (!rows.length) return null;
  const term = { label: rows[0]._term_label, start: "", end: "" };
  const dates   = [...new Set(rows.map(r => r.session_date))].sort();
  const sessions = dates.map(d => ({ id: d, date: d, label: "Saturday, " + d }));
  const names   = [...new Set(rows.map(r => r.member_name))];
  const members  = names.map(name => ({
    id: name, name,
    ec: rows.find(r => r.member_name === name).is_ec === "Yes",
    joinDate: null, leaveDate: null,
  }));
  const attendance = {};
  sessions.forEach(sess => {
    attendance[sess.id] = {};
    rows.filter(r => r.session_date === sess.date && r.present === "Yes").forEach(r => {
      attendance[sess.id][r.member_name] = {
        p: true, mode: r.mode === "Online" ? "online" : "in-person", t: null, m: "archived",
      };
    });
  });
  return { term, sessions, members, attendance };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

/** PIN Authorization helper */
function verifyPin(requestPin) {
  const actualPin = PropertiesService.getScriptProperties().getProperty("ADMIN_PIN") || "1234";
  if (!requestPin || String(requestPin) !== String(actualPin)) {
    throw new Error("Unauthorized: Invalid or missing Admin PIN.");
  }
}

function doGet(e) {
  try {
    const p = e.parameter || {};
    const key = p.key || "";

    const activeSessionId = cfgGet("active_session_id") || "";
    const isPublicRead = (
      key === "" || // health check
      key === "members" ||
      key === "sessions" ||
      key === "activeSessionId" ||
      key === "all" ||
      (key === "att" && p.session_id === activeSessionId)
    );
    if (!isPublicRead) {
      verifyPin(p.pin);
    }

    let data = null;

    if (key === "all") {
      const members = readRows(TABS.MEMBERS).map(r => ({
        id: r._id, name: r.name, ec: r.is_ec === "Yes",
        joinDate: r.join_date || null, leaveDate: r.leave_date || null,
      }));
      const sessions = readRows(TABS.SESSIONS).map(r => ({
        id: r._id, date: r.date, label: r.label,
      }));
      const activeSessionId = cfgGet("active_session_id") || "";
      const s = cfgGet("term_start"), en = cfgGet("term_end"), l = cfgGet("term_label");
      const term = s ? { start: s, end: en, label: l } : null;

      const dateToSessionId = {};
      sessions.forEach(sess => {
        dateToSessionId[sess.date] = sess.id;
      });

      const attendance = {};
      sessions.forEach(sess => {
        attendance[sess.id] = {};
      });
      readRows(TABS.ATTEND).forEach(r => {
        let sid = r._session_id;
        if (!attendance[sid] && r.session_date && dateToSessionId[r.session_date]) {
          sid = dateToSessionId[r.session_date];
        }
        if (!sid) return;
        if (!attendance[sid]) {
          attendance[sid] = {};
        }
        attendance[sid][r._member_id] = {
          p:    r.present === "Yes",
          t:    r._timestamp_utc || null,
          m:    "self",
          mode: r.mode === "Online" ? "online" : r.mode === "In-Person" ? "in-person" : null,
        };
      });

      data = { members, sessions, activeSessionId, term, attendance };

    } else if (key === "members") {
      data = readRows(TABS.MEMBERS).map(r => ({
        id: r._id, name: r.name, ec: r.is_ec === "Yes",
        joinDate: r.join_date || null, leaveDate: r.leave_date || null,
      }));

    } else if (key === "sessions") {
      data = readRows(TABS.SESSIONS).map(r => ({
        id: r._id, date: r.date, label: r.label,
      }));

    } else if (key === "term") {
      const s = cfgGet("term_start"), en = cfgGet("term_end"), l = cfgGet("term_label");
      data = s ? { start: s, end: en, label: l } : null;

    } else if (key === "activeSessionId") {
      data = cfgGet("active_session_id") || "";

    } else if (key === "att") {
      const sid = p.session_id || "";
      const sessions = readRows(TABS.SESSIONS);
      const sess = sessions.find(s => s._id === sid || s.date === sid);
      const result = {};
      readRows(TABS.ATTEND)
        .filter(r => r._session_id === sid || (sess && r.session_date === sess.date))
        .forEach(r => {
          result[r._member_id] = {
            p:    r.present === "Yes",
            t:    r._timestamp_utc || null,
            m:    "self",
            mode: r.mode === "Online" ? "online" : r.mode === "In-Person" ? "in-person" : null,
          };
        });
      data = result;

    } else if (key === "archiveIndex") {
      data = readRows(TABS.ARCH_IDX).map(r => ({
        label: r.term_label, start: r.term_start, end: r.term_end,
      }));

    } else if (key === "archive") {
      const tabName = "Arch_" + p.term_key;
      const sheet = ss().getSheetByName(tabName);
      data = sheet ? readArchive(tabName) : null;

    } else {
      // Health check — open the /exec URL in browser to confirm it's running
      data = { status: "ok", timestamp: new Date().toISOString(), tabs: ss().getSheets().map(s => s.getName()) };
    }

    return ContentService
      .createTextOutput(JSON.stringify({ data }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log(err);
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const { action, key } = body;

    if (action !== "set") throw new Error("Unknown action: " + action);

    // Verify PIN for admin writes
    const activeSessionId = cfgGet("active_session_id") || "";
    const isPublicCheckin = (key === "att" && body.session_id === activeSessionId);
    if (!isPublicCheckin) {
      verifyPin(body.pin);
    }

    if (key === "members") {
      writeRows(TABS.MEMBERS, HEADERS[TABS.MEMBERS], body.data.map(m => ({
        name: m.name, is_ec: m.ec ? "Yes" : "", join_date: m.joinDate || "",
        leave_date: m.leaveDate || "", _id: m.id,
      })));

    } else if (key === "sessions") {
      writeRows(TABS.SESSIONS, HEADERS[TABS.SESSIONS], body.data.map(s => ({
        date: s.date, label: s.label, _id: s.id,
      })));

    } else if (key === "term") {
      getOrCreate(TABS.CONFIG);
      ensureHeader(getOrCreate(TABS.CONFIG), HEADERS[TABS.CONFIG]);
      cfgSet({ term_start: body.data.start, term_end: body.data.end, term_label: body.data.label });

    } else if (key === "activeSessionId") {
      getOrCreate(TABS.CONFIG);
      ensureHeader(getOrCreate(TABS.CONFIG), HEADERS[TABS.CONFIG]);
      cfgSet({ active_session_id: body.data });

    } else if (key === "att") {
      const sid      = body.session_id;
      const members  = body.members  || [];
      const sessions = body.sessions || [];
      const sess     = sessions.find(s => s.id === sid);
      const mMap     = Object.fromEntries(members.map(m => [m.id, m.name]));

      const allRows = readRows(TABS.ATTEND);
      const others = allRows.filter(r => r._session_id !== sid);
      const currentSessRows = allRows.filter(r => r._session_id === sid);
      
      const existingMap = {};
      currentSessRows.forEach(r => {
        existingMap[r._member_id] = r;
      });

      Object.entries(body.data).forEach(([mid, rec]) => {
        existingMap[mid] = {
          session_date:   sess ? sess.date : (existingMap[mid] ? existingMap[mid].session_date : ""),
          member_name:    mMap[mid] || (existingMap[mid] ? existingMap[mid].member_name : mid),
          present:        rec.p ? "Yes" : "No",
          mode:           rec.p ? (rec.mode === "online" ? "Online" : "In-Person") : "",
          checked_in_ist: rec.p ? toIST(rec.t) : "",
          _session_id:    sid,
          _member_id:     mid,
          _timestamp_utc: rec.t || "",
        };
      });

      const mergedRows = Object.keys(existingMap).map(k => existingMap[k]);
      writeRows(TABS.ATTEND, HEADERS[TABS.ATTEND], [...others, ...mergedRows], true);

    } else if (key === "archiveIndex") {
      const today = Utilities.formatDate(new Date(), "IST", "yyyy-MM-dd");
      writeRows(TABS.ARCH_IDX, HEADERS[TABS.ARCH_IDX], body.data.map(a => ({
        term_label: a.label, term_start: a.start, term_end: a.end, archived_on: today,
      })));

    } else if (key === "archive") {
      writeArchive("Arch_" + body.term_key, body.data);

    } else {
      throw new Error("Unknown key: " + key);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log(err);
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
