import React, { useState, useEffect, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Check, X, QrCode, Users, TrendingUp, Download, Plus, Search,
  UserCheck, Calendar, Settings2, Trash2, ChevronRight, Star, Video, MapPin,
  BarChart3, CalendarDays, AlertCircle,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { getJSON, setJSON, initStorage, getFileName, MODE } from "./storage.js";
import FileSetup from "./FileSetup.jsx";
import MonthlyReport from "./MonthlyReport.jsx";

// ─── Design tokens ───────────────────────────────────────────────────────────
const INK = "#1B2430";
const INK_MUTED = "#5B6472";
const PAPER = "#EFEDE3";
const PAPER_RAISED = "#F7F5EC";
const BRASS = "#9C7A2E";
const RUST = "#9C4A32";
const FOREST = "#3F6B52";
const TEAL = "#2E6E8E";
const LINE = "#D9D2C0";
const TM_BLUE = "#004165";
const TM_RED = "#C8102E";
const TM_GOLD = "#FDBB30";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ─── IST date/time helpers ───────────────────────────────────────────────────
// All "today"/"now" logic is pinned to IST — not each viewer's device timezone —
// since the club and its Saturday meetings are fixed to India time.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function nowIST() {
  return new Date(Date.now() + IST_OFFSET_MS);
}
function toLocalDateStr(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
const todayStr = () => toLocalDateStr(nowIST());
const fmtDate = (d) =>
  new Date(d + "T00:00:00Z").toLocaleDateString(undefined, {
    month: "short", day: "numeric", timeZone: "UTC",
  });
function fmtTimeIST(iso) {
  if (!iso) return "";
  const ist = new Date(new Date(iso).getTime() + IST_OFFSET_MS);
  let h = ist.getUTCHours();
  const m = String(ist.getUTCMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm} IST`;
}

// ─── Calendar helpers ─────────────────────────────────────────────────────────
function ymdToDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function isEligible(member, dateStr) {
  const join = member.joinDate || "2000-01-01";
  const leave = member.leaveDate || null;
  return dateStr >= join && (!leave || dateStr <= leave);
}
function termForDate(dateStr) {
  const [y, m] = dateStr.split("-").map(Number);
  return m <= 6
    ? { start: `${y}-01-01`, end: `${y}-06-30`, label: `Jan – Jun ${y}` }
    : { start: `${y}-07-01`, end: `${y}-12-31`, label: `Jul – Dec ${y}` };
}
function nextTermOf(t) {
  const d = ymdToDate(t.end);
  d.setUTCDate(d.getUTCDate() + 1);
  return termForDate(toLocalDateStr(d));
}
function allSaturdaysInRange(startStr, endStr) {
  const start = ymdToDate(startStr);
  const end = ymdToDate(endStr);
  const d = new Date(start);
  while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
  const out = [];
  while (d <= end) {
    out.push(toLocalDateStr(d));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return out;
}

// ─── Excel export ─────────────────────────────────────────────────────────────
function downloadWorkbook(membersList, sessionsList, attMap, filenameLabel) {
  const today = todayStr();
  const sorted = sessionsList.slice().sort((a, b) => a.date.localeCompare(b.date));
  const occurred = sorted.filter((s) => s.date <= today);
  const membersSorted = membersList
    .slice()
    .sort((a, b) => (b.ec - a.ec) || a.name.localeCompare(b.name));

  const perMemberStats = membersSorted.map((m) => {
    const eligible = occurred.filter((s) => isEligible(m, s.date));
    const attended = eligible.filter((s) => attMap[s.id]?.[m.id]?.p).length;
    const pct = eligible.length ? Math.round((attended / eligible.length) * 100) : 0;
    return { id: m.id, attended, pct };
  });
  const perSessionStats = occurred.map((s) => {
    const eligible = membersSorted.filter((m) => isEligible(m, s.date));
    const present = eligible.filter((m) => attMap[s.id]?.[m.id]?.p).length;
    const total = eligible.length || 1;
    return { id: s.id, present, total, pct: Math.round((present / total) * 100) };
  });

  const header = [
    "Member", "Role",
    ...sorted.map((s) => fmtDate(s.date)),
    "Present", "Term % (to date)",
  ];
  const rows = membersSorted.map((m) => {
    const pm = perMemberStats.find((p) => p.id === m.id);
    const cells = sorted.map((s) => {
      if (s.date > today) return "Not yet happened";
      if (!isEligible(m, s.date)) return "—";
      const rec = attMap[s.id]?.[m.id];
      if (!rec?.p) return "Absent";
      return rec.mode === "online" ? "Online" : "In-Person";
    });
    return [m.name, m.ec ? "Exec Committee" : "Member", ...cells, pm.attended, `${pm.pct}%`];
  });
  const weekRow = [
    "Week attendance % (occurred only)", "",
    ...sorted.map((s) => {
      const sp = perSessionStats.find((p) => p.id === s.id);
      return sp ? `${sp.pct}%` : "—";
    }),
    "", "",
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([header, ...rows, [], weekRow]),
    "Term Matrix",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Name", "Role", "Joined", "Left"],
      ...membersList.map((m) => [
        m.name, m.ec ? "EC" : "Member",
        m.joinDate ? fmtDate(m.joinDate) : "—",
        m.leaveDate ? fmtDate(m.leaveDate) : "",
      ]),
    ]),
    "Members",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Date", "Label", "Present", "Total", "%"],
      ...perSessionStats.map((s) => {
        const sess = sorted.find((x) => x.id === s.id);
        return [sess.date, sess.label, s.present, s.total, s.pct];
      }),
    ]),
    "Sessions",
  );
  const timeRows = [];
  occurred.forEach((s) => {
    membersSorted.forEach((m) => {
      const rec = attMap[s.id]?.[m.id];
      if (rec?.p)
        timeRows.push([
          fmtDate(s.date), m.name,
          rec.mode === "online" ? "Online" : "In-Person",
          fmtTimeIST(rec.t),
        ]);
    });
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Session", "Member", "Mode", "Checked in (IST)"],
      ...timeRows,
    ]),
    "Check-in Times",
  );
  XLSX.writeFile(wb, `attendance-${filenameLabel}.xlsx`);
}

// ─── Font & animation styles ──────────────────────────────────────────────────
const FontStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
    body {
      margin: 0;
      font-family: 'Inter', sans-serif;
      color: ${INK};
      background: ${PAPER};
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    button, input, textarea, select {
      transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
    }
    .font-display { font-family: 'Fraunces', serif; }
    .font-body    { font-family: 'Inter', sans-serif; }
    .font-mono    { font-family: 'IBM Plex Mono', monospace; }
    @keyframes stampIn {
      0%   { opacity: 0; transform: scale(2.4) rotate(-18deg); }
      55%  { opacity: 1; transform: scale(0.92) rotate(-7deg); }
      100% { opacity: 1; transform: scale(1) rotate(-7deg); }
    }
    .stamp-anim { animation: stampIn 0.5s cubic-bezier(.2,.9,.3,1.1); }
    .app-card {
      transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
    }
    .app-card:hover {
      transform: translateY(-1px);
      box-shadow: 0 18px 40px rgba(27,36,48,0.12);
      border-color: rgba(0,65,101,0.16);
    }
    .app-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 18px rgba(27,36,48,0.12);
    }
    .app-button:focus-visible {
      outline: 3px solid rgba(200,16,46,0.24);
      outline-offset: 2px;
    }
    .app-nav-btn { transition: color 0.2s ease, border-color 0.2s ease; }
    .app-nav-btn:hover { color: ${TM_BLUE}; }
    .app-tag { transition: transform 0.2s ease, background 0.2s ease; }
    .app-tag:hover { transform: translateY(-1px); background: rgba(220,205,130,0.16); }
    .tab-active  { border-bottom: 3px solid ${TM_BLUE}; }
    ::-webkit-scrollbar       { height: 8px; width: 8px; }
    ::-webkit-scrollbar-thumb { background: ${LINE}; border-radius: 4px; }
  `}</style>
);

// ─── Root component ───────────────────────────────────────────────────────────
export default function AttendanceTracker() {
  const [tab, setTab] = useState("checkin");
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [term, setTerm] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [attByS, setAttByS] = useState({});
  const [pendingAtt, setPendingAtt] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actualError, setActualError] = useState(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [needsFileSetup, setNeedsFileSetup] = useState(false);

  const loadAll = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
      setLoadError(false);
      setActualError(null);
      setShowErrorDetails(false);
    }
    const withTimeout = (p, ms = 15000) =>
      Promise.race([
        p,
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
      ]);

    try {
      let bulkData = null;
      try {
        bulkData = await withTimeout(getJSON("all"), 15000);
      } catch (err) {
        console.warn("Bulk load failed or not supported, falling back...", err);
      }

      let membersArr, sessionsArr, activeId, termObj, attMap;

      if (bulkData && bulkData.members && bulkData.sessions) {
        membersArr = bulkData.members;
        sessionsArr = bulkData.sessions;
        activeId = bulkData.activeSessionId || "";
        termObj = bulkData.term;
        attMap = bulkData.attendance || {};
      } else {
        const [m, s, a, t] = await withTimeout(
          Promise.all([
            getJSON("members"),
            getJSON("sessions"),
            getJSON("activeSessionId"),
            getJSON("term"),
          ]),
        );

        membersArr = m || [];
        activeId = a || "";
        termObj = t;

        if (!termObj) {
          termObj = termForDate(todayStr());
          await setJSON("term", termObj);
        }

        sessionsArr = s;
        if (!sessionsArr || sessionsArr.length === 0) {
          sessionsArr = allSaturdaysInRange(termObj.start, termObj.end).map(
            (date) => ({ id: uid(), date, label: `Saturday, ${fmtDate(date)}` }),
          );
          await setJSON("sessions", sessionsArr);
        } else {
          // One-time repair: earlier versions stored dates via toISOString(), which
          // can shift the date back a day. Only nudge Fridays to Saturday.
          let changed = false;
          sessionsArr = sessionsArr.map((sess) => {
            const d = ymdToDate(sess.date);
            const dow = d.getUTCDay();
            if (dow !== 5) return sess;
            changed = true;
            d.setUTCDate(d.getUTCDate() + 1);
            const fixedDate = toLocalDateStr(d);
            return { ...sess, date: fixedDate, label: `Saturday, ${fmtDate(fixedDate)}` };
          });
          if (changed) await setJSON("sessions", sessionsArr);
        }

        const attEntries = await withTimeout(
          Promise.all(
            sessionsArr.map(async (sess) => [
              sess.id,
              (await getJSON(`att:${sess.id}`)) || {},
            ]),
          ),
        );
        attMap = Object.fromEntries(attEntries);
      }

      setMembers(membersArr);
      setSessions(sessionsArr);
      setTerm(termObj || termForDate(todayStr()));
      setActiveSessionId(activeId);
      setAttByS(attMap);
    } catch (e) {
      console.error("loadAll failed", e);
      if (!isSilent) {
        setActualError(e);
        setLoadError(true);
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let timer;
    async function bootstrap() {
      if (MODE === "excel") {
        const ready = await initStorage();
        if (!ready) {
          setNeedsFileSetup(true);
          setLoading(false);
          return;
        }
      }
      await loadAll(false);

      // Auto-refresh in the background every 30 seconds
      timer = setInterval(() => {
        loadAll(true);
      }, 30000);
    }
    bootstrap();
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [loadAll]);

  const saveMembers = async (list) => { setMembers(list); await setJSON("members", list); };
  const saveSessions = async (list) => { setSessions(list); await setJSON("sessions", list); };
  const setActive = async (id) => { setActiveSessionId(id); await setJSON("activeSessionId", id); };

  const mergedAtt = useMemo(() => {
    const res = { ...attByS };
    Object.keys(pendingAtt).forEach((sId) => {
      res[sId] = { ...(res[sId] || {}), ...pendingAtt[sId] };
    });
    return res;
  }, [attByS, pendingAtt]);

  const savePendingAttendance = async () => {
    const updatedSessions = Object.keys(pendingAtt);
    const newAttByS = { ...attByS };
    for (const sId of updatedSessions) {
      const merged = { ...(newAttByS[sId] || {}), ...pendingAtt[sId] };
      newAttByS[sId] = merged;
      await setJSON(`att:${sId}`, merged);
    }
    setAttByS(newAttByS);
    setPendingAtt({});
  };

  const markAttendance = (sessionId, memberId, present, method, mode = null) => {
    const record = { p: present, t: new Date().toISOString(), m: method, mode: present ? mode : null };
    setAttByS((prev) => {
      const merged = { ...(prev[sessionId] || {}), [memberId]: record };
      setJSON(`att:${sessionId}`, merged);
      return { ...prev, [sessionId]: merged };
    });
  };

  const startTodaySession = async () => {
    const today = nowIST();
    const day = today.getUTCDay();
    const diff = (6 - day + 7) % 7;
    const satDateObj = new Date(today);
    satDateObj.setUTCDate(satDateObj.getUTCDate() + diff);
    const satDateStr = toLocalDateStr(satDateObj);

    let sess = sessions.find((s) => s.date === satDateStr);
    if (!sess) {
      sess = { id: uid(), date: satDateStr, label: `Saturday, ${fmtDate(satDateStr)}` };
      await saveSessions([...sessions, sess]);
      setAttByS((prev) => ({ ...prev, [sess.id]: {} }));
    }
    await setActive(sess.id);
  };

  const startNextTerm = async () => {
    const nt = nextTermOf(term);
    const proceed = window.confirm(
      `Archive "${term.label}" and start "${nt.label}"?\n\nThe current matrix will be saved and a fresh one will start for the new term. Your member roster carries over.`,
    );
    if (!proceed) return;

    const bundle = { term, sessions, attendance: attByS, members };
    await setJSON(`archive:${term.start}_${term.end}`, bundle);
    const idx = (await getJSON("archiveIndex")) || [];
    idx.push({ start: term.start, end: term.end, label: term.label });
    await setJSON("archiveIndex", idx);

    const newSessions = allSaturdaysInRange(nt.start, nt.end).map((date) => ({
      id: uid(), date, label: `Saturday, ${fmtDate(date)}`,
    }));
    await setJSON("sessions", newSessions);
    await setJSON("activeSessionId", "");
    await setJSON("term", nt);

    setTerm(nt);
    setSessions(newSessions);
    setActiveSessionId("");
    setAttByS({});
  };

  const stats = useMemo(() => {
    const today = todayStr();
    const occurred = sessions.filter((s) => s.date <= today);

    const perSession = occurred.map((s) => {
      const att = mergedAtt[s.id] || {};
      const eligible = members.filter((m) => isEligible(m, s.date));
      const present = eligible.filter((m) => att[m.id]?.p).length;
      const total = eligible.length || 1;
      return {
        id: s.id, date: s.date, label: s.label,
        present, total, pct: Math.round((present / total) * 100),
      };
    }).sort((a, b) => a.date.localeCompare(b.date));

    const perMember = members.map((m) => {
      const eligible = occurred.filter((s) => isEligible(m, s.date));
      const attended = eligible.filter((s) => mergedAtt[s.id]?.[m.id]?.p).length;
      const pct = eligible.length ? Math.round((attended / eligible.length) * 100) : 0;
      return { ...m, attended, eligibleCount: eligible.length, pct };
    });

    return { perSession, perMember };
  }, [members, sessions, attByS]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const activeAtt = activeSessionId ? (attByS[activeSessionId] || {}) : {};

  if (needsFileSetup) {
    return (
      <FileSetup onReady={() => { setNeedsFileSetup(false); loadAll(); }} />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-body"
        style={{ background: PAPER, color: INK_MUTED, minHeight: "100svh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <p>Loading roster…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="font-body" style={{
        minHeight: "100svh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12,
        background: PAPER, color: INK, padding: "0 24px", textAlign: "center",
        maxWidth: 480, margin: "0 auto",
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📡</div>
        <p className="font-display" style={{ fontSize: 20, fontWeight: 600 }}>Couldn't load the roster</p>
        <p style={{ fontSize: 14, color: INK_MUTED, lineHeight: 1.5 }}>
          This is usually a temporary connection hiccup — your data is safe.
        </p>
        
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button className="app-button" onClick={() => loadAll(false)} style={{
            fontSize: 14, padding: "10px 18px", borderRadius: 8,
            fontWeight: 600, background: TM_BLUE, color: PAPER, cursor: "pointer",
            border: "none", boxShadow: "0 10px 24px rgba(0,65,101,0.14)",
          }}>
            Try again
          </button>
          
          {actualError && (
            <button className="app-button" onClick={() => setShowErrorDetails(prev => !prev)} style={{
              fontSize: 14, padding: "10px 18px", borderRadius: 8,
              fontWeight: 600, background: "white", color: TM_BLUE, cursor: "pointer",
              border: `1px solid ${TM_BLUE}33`,
            }}>
              {showErrorDetails ? "Hide details" : "Show details"}
            </button>
          )}
        </div>

        {showErrorDetails && actualError && (
          <div style={{
            marginTop: 16, padding: 12, borderRadius: 6,
            background: "#F7F5EC", border: `1px solid ${LINE}`,
            textAlign: "left", width: "100%", boxSizing: "border-box",
            overflowX: "auto",
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: RUST, marginBottom: 4 }}>
              Error: {actualError.message || String(actualError)}
            </p>
            {actualError.stack && (
              <pre style={{
                fontSize: 11, color: INK_MUTED, margin: 0,
                fontFamily: "IBM Plex Mono, monospace", whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}>
                {actualError.stack}
              </pre>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="font-body" style={{ background: PAPER, color: INK, minHeight: "100svh" }}>
      <FontStyle />

      {/* ── Header (title + primary nav consolidated with modern glassmorphism) ── */}
      <header className="glass-header" style={{ padding: "14px 24px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, maxWidth: 1440, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: TM_BLUE, display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", color: PAPER, fontWeight: 700, fontSize: 18, boxShadow: "0 4px 12px rgba(0,65,101,0.2)" }}>
              ET
            </div>
            <div>
              <p className="font-mono" style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: TM_BLUE, margin: 0, fontWeight: 600 }}>
                Toastmasters Club Dashboard
              </p>
              <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15, margin: 0, letterSpacing: "-0.01em" }}>
                Electronics City Toastmasters
              </h1>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div className="font-mono" style={{ fontSize: 11, color: INK_MUTED, textAlign: "right", marginRight: 8, lineHeight: 1.4 }}>
              <div><strong style={{ color: TM_BLUE }}>{members.length}</strong> members</div>
              <div><strong style={{ color: TM_BLUE }}>{sessions.length}</strong> sessions</div>
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center", overflowX: "auto", background: "rgba(0,65,101,0.05)", padding: 4, borderRadius: 8 }}>
              {[
                { id: "checkin",   label: "Check-In" },
                { id: "dashboard", label: "Dashboard" },
                { id: "monthly",   label: "Reports" },
                { id: "matrix",    label: "Matrix" },
                { id: "admin",     label: "Admin" },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  id={`tab-${id}`}
                  className="app-nav-btn"
                  onClick={() => setTab(id)}
                  style={{
                    padding: "6px 14px", fontSize: 13, fontWeight: 600,
                    whiteSpace: "nowrap", color: tab === id ? PAPER_RAISED : INK_MUTED,
                    background: tab === id ? TM_BLUE : "transparent",
                    cursor: "pointer", borderRadius: 6,
                    boxShadow: tab === id ? "0 4px 10px rgba(0,65,101,0.15)" : "none",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{
        padding: "24px 20px",
        maxWidth: tab === "monthly" ? 1440 : (tab === "matrix" || tab === "admin" || tab === "dashboard") ? 1200 : 800,
        margin: "0 auto",
        transition: "max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
      }}>
        {tab === "checkin" && (
          <CheckIn
            members={members}
            activeSession={activeSession}
            activeAtt={activeAtt}
            onMark={(memberId, mode) =>
              markAttendance(activeSessionId, memberId, true, "self", mode)
            }
          />
        )}
        {tab === "dashboard" && (
          <Dashboard
            members={members} stats={stats}
            activeSession={activeSession} activeAtt={activeAtt}
            sessions={sessions} attByS={mergedAtt}
          />
        )}
        {tab === "monthly" && (
          <MonthlyReport
            members={members} sessions={sessions} attByS={mergedAtt}
            stats={stats} term={term}
          />
        )}
        {tab === "matrix" && (
          <Matrix
            members={members}
            sessions={sessions}
            attByS={mergedAtt}
            dbAttByS={attByS}
            stats={stats}
            pendingAtt={pendingAtt}
            setPendingAtt={setPendingAtt}
            savePendingAttendance={savePendingAttendance}
          />
        )}
        {tab === "admin" && (
          <Admin
            members={members} saveMembers={saveMembers}
            sessions={sessions} saveSessions={saveSessions}
            activeSessionId={activeSessionId}
            startTodaySession={startTodaySession}
            setActive={setActive}
            attByS={attByS} markAttendance={markAttendance}
            stats={stats} term={term} startNextTerm={startNextTerm}
          />
        )}
      </main>
    </div>
  );
}

// ─── Check-In tab ─────────────────────────────────────────────────────────────
function CheckIn({ members, activeSession, activeAtt, onMark }) {
  const [q, setQ] = useState("");
  const [justStamped, setJustStamped] = useState(null);

  if (members.length === 0)
    return <Empty text="No members yet. Add your members from the Admin tab, then come back here." />;
  if (!activeSession)
    return <Empty text="No roll call is open right now. Ask your secretary to start today's session from the Admin tab." />;

  const eligible = members.filter((m) => isEligible(m, activeSession.date));
  const presentCount = eligible.filter((m) => activeAtt[m.id]?.p).length;
  const filtered = eligible.filter((m) =>
    m.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      {/* Session banner */}
      <div style={{
        borderRadius: 8, padding: 16, marginBottom: 16,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: PAPER_RAISED, border: `1px solid ${LINE}`,
      }}>
        <div>
          <p className="font-mono" style={{
            fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: INK_MUTED,
          }}>
            {activeSession.label}
          </p>
          <p className="font-display" style={{ fontSize: 18 }}>
            {fmtDate(activeSession.date)} roll call is open
          </p>
        </div>
        <div className="font-mono" style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 600, color: FOREST }}>{presentCount}</div>
          <div style={{ fontSize: 12, color: INK_MUTED }}>of {eligible.length}</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={16} style={{
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          color: INK_MUTED, pointerEvents: "none",
        }} />
        <input
          id="member-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find your name…"
          style={{
            width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 10,
            paddingBottom: 10, borderRadius: 6, border: `1px solid ${LINE}`,
            fontSize: 14, outline: "none", background: "white",
          }}
        />
      </div>

      {/* Member list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.slice(0, 30).map((m) => {
          const checked = activeAtt[m.id]?.p;
          return (
            <div key={m.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 12px", borderRadius: 6,
              background: "white", border: `1px solid ${LINE}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 500, fontSize: 14 }}>{m.name}</span>
                {m.ec && <Star size={12} style={{ color: BRASS }} fill={BRASS} />}
              </div>
              {checked ? (
                <div style={{ textAlign: "right" }}>
                  <div
                    className={justStamped === m.id ? "stamp-anim" : ""}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      fontSize: 13, fontFamily: "IBM Plex Mono, monospace",
                      color: activeAtt[m.id]?.mode === "online" ? TEAL : FOREST,
                    }}
                  >
                    {activeAtt[m.id]?.mode === "online"
                      ? <><Video size={15} /> ONLINE</>
                      : <><Check size={15} /> IN-PERSON</>}
                  </div>
                  <div style={{ fontSize: 11, color: INK_MUTED, fontFamily: "IBM Plex Mono, monospace" }}>
                    {fmtTimeIST(activeAtt[m.id]?.t)}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    id={`checkin-inperson-${m.id}`}
                    onClick={() => { onMark(m.id, "in-person"); setJustStamped(m.id); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      fontSize: 12, fontWeight: 500, padding: "6px 10px",
                      borderRadius: 6, background: INK, color: PAPER,
                    }}
                  >
                    <MapPin size={12} /> In-Person
                  </button>
                  <button
                    id={`checkin-online-${m.id}`}
                    onClick={() => { onMark(m.id, "online"); setJustStamped(m.id); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      fontSize: 12, fontWeight: 500, padding: "6px 10px",
                      borderRadius: 6, background: TEAL, color: PAPER,
                    }}
                  >
                    <Video size={12} /> Online
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p style={{ fontSize: 14, textAlign: "center", padding: "24px 0", color: INK_MUTED }}>
            No member matches "{q}".
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function Empty({ text }) {
  return (
    <div style={{
      borderRadius: 8, padding: 32, textAlign: "center",
      background: PAPER_RAISED, border: `1px dashed ${LINE}`, color: INK_MUTED,
    }}>
      {text}
    </div>
  );
}

// ─── Dashboard tab ────────────────────────────────────────────────────────────
function Dashboard({ members, stats, activeSession, activeAtt, sessions, attByS }) {
  const [shareText, setShareText] = useState("");

  const eligibleToday = activeSession
    ? members.filter((m) => isEligible(m, activeSession.date))
    : [];
  const absentees = eligibleToday.filter((m) => !activeAtt[m.id]?.p);
  const present   = eligibleToday.filter((m) => activeAtt[m.id]?.p);
  const inPersonCount = present.filter((m) => activeAtt[m.id]?.mode === "in-person").length;
  const onlineCount   = present.filter((m) => activeAtt[m.id]?.mode === "online").length;

  const currentMembers = members.filter((m) => !m.leaveDate);
  const ecMembers  = currentMembers.filter((m) => m.ec);
  const genMembers = currentMembers.filter((m) => !m.ec);

  const today = todayStr();
  const pastSessions = sessions
    .filter((s) => s.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date));
  const referenceSession = activeSession || pastSessions[0] || null;
  const referenceAtt = referenceSession ? (attByS[referenceSession.id] || {}) : {};

  const weeklyPct = (list) => {
    if (!referenceSession) return 0;
    const eligible = list.filter((m) => isEligible(m, referenceSession.date));
    if (!eligible.length) return 0;
    const cnt = eligible.filter((m) => referenceAtt[m.id]?.p).length;
    return Math.round((cnt / eligible.length) * 100);
  };

  const buildShareText = () => {
    if (!activeSession) return "";
    const pct = eligibleToday.length
      ? Math.round((present.length / eligibleToday.length) * 100) : 0;
    return [
      "Electronics City Toastmasters Club",
      `Attendance — ${activeSession.label}`,
      "",
      `Present: ${present.length}/${eligibleToday.length} (${pct}%) — ${inPersonCount} in-person, ${onlineCount} online`,
      "",
      `Absent (${absentees.length}):`,
      ...absentees.map((m) => `- ${m.name}`),
    ].join("\n");
  };

  const prepareShare = async () => {
    const text = buildShareText();
    setShareText(text);
    try { await navigator.clipboard.writeText(text); } catch { /* fallback textarea */ }
  };

  const card = (children) => ({
    borderRadius: 8, padding: 16, background: "white", border: `1px solid ${LINE}`,
    ...children,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Live session card */}
      {activeSession ? (
        <div style={{ borderRadius: 8, padding: 16, background: PAPER_RAISED, border: `1px solid ${LINE}` }}>
          <p className="font-mono" style={{ fontSize: 11, textTransform: "uppercase", color: INK_MUTED, marginBottom: 4 }}>
            {activeSession.label} — live
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
            <span className="font-display" style={{ fontSize: 30 }}>{eligibleToday.length - absentees.length}</span>
            <span style={{ color: INK_MUTED }}>/ {eligibleToday.length} present</span>
          </div>
          <p className="font-mono" style={{ fontSize: 12, color: INK_MUTED, marginBottom: 12 }}>
            {inPersonCount} in-person · {onlineCount} online
          </p>
          <button
            id="btn-prepare-share"
            onClick={prepareShare}
            style={{
              fontSize: 12, fontWeight: 500, padding: "6px 12px", borderRadius: 6,
              background: INK, color: PAPER, marginBottom: shareText ? 12 : 0,
            }}
          >
            Prepare update to share
          </button>
          {shareText && (
            <>
              <textarea
                readOnly value={shareText}
                onClick={(e) => e.target.select()}
                rows={6}
                style={{
                  width: "100%", fontSize: 12, fontFamily: "IBM Plex Mono, monospace",
                  padding: 8, borderRadius: 6, border: `1px solid ${LINE}`,
                  background: "white", display: "block", marginBottom: 8,
                }}
              />
              <p style={{ fontSize: 12, color: INK_MUTED, marginBottom: 12 }}>
                Copied to clipboard if your browser allowed it — otherwise tap the box above to select all.
              </p>
            </>
          )}
          {absentees.length > 0 && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: RUST }}>
                Not yet checked in ({absentees.length})
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {absentees.map((m) => (
                  <span key={m.id} style={{
                    fontSize: 12, padding: "4px 8px", borderRadius: 4,
                    background: "#F3E4DE", color: RUST,
                  }}>
                    {m.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Empty text="No session is open right now — this will fill in live once roll call starts." />
      )}

      {/* EC / General week stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { label: "Exec Committee", list: ecMembers },
          { label: "General Members", list: genMembers },
        ].map(({ label, list }) => (
          <div key={label} style={{ borderRadius: 8, padding: 16, background: "white", border: `1px solid ${LINE}` }}>
            <p className="font-mono" style={{ fontSize: 11, textTransform: "uppercase", color: INK_MUTED }}>
              {label}
            </p>
            <p className="font-display" style={{ fontSize: 26 }}>{weeklyPct(list)}%</p>
            <p style={{ fontSize: 12, color: INK_MUTED }}>
              {list.length} members · {referenceSession ? fmtDate(referenceSession.date) : "this week"}
            </p>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      {stats.perSession.length > 0 && (
        <div style={{ borderRadius: 8, padding: 16, background: "white", border: `1px solid ${LINE}` }}>
          <p className="font-mono" style={{ fontSize: 11, textTransform: "uppercase", color: INK_MUTED, marginBottom: 8 }}>
            Attendance trend (term to date)
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={stats.perSession}>
              <CartesianGrid stroke={LINE} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: INK_MUTED }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: INK_MUTED }} />
              <Tooltip labelFormatter={fmtDate} formatter={(v) => [`${v}%`, "Attendance"]} />
              <Line type="monotone" dataKey="pct" stroke={BRASS} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Follow-up list */}
      <div style={{ borderRadius: 8, padding: 16, background: "white", border: `1px solid ${LINE}` }}>
        <p className="font-mono" style={{ fontSize: 11, textTransform: "uppercase", color: INK_MUTED, marginBottom: 4 }}>
          Members to follow up with
        </p>
        <p style={{ fontSize: 12, color: INK_MUTED, marginBottom: 8 }}>Below 50% attendance so far this term</p>
        <div style={{ maxHeight: 288, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {stats.perMember
            .filter((m) => !m.leaveDate && m.eligibleCount > 0 && m.pct < 50)
            .sort((a, b) => a.pct - b.pct)
            .map((m) => (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span>{m.name}</span>
                <span className="font-mono" style={{ color: RUST }}>{m.pct}%</span>
              </div>
            ))}
          {stats.perSession.length === 0 && (
            <span style={{ fontSize: 14, color: INK_MUTED }}>Log a few sessions to see this.</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Term Matrix tab ──────────────────────────────────────────────────────────
function Matrix({
  members, sessions, attByS, dbAttByS, stats,
  pendingAtt, setPendingAtt, savePendingAttendance
}) {
  const sorted = sessions.slice().sort((a, b) => a.date.localeCompare(b.date));
  const membersSorted = members
    .slice()
    .sort((a, b) => (b.ec - a.ec) || a.name.localeCompare(b.name));

  const pctColor = (pct) => (pct >= 75 ? FOREST : pct >= 50 ? BRASS : RUST);

  const pendingCount = Object.values(pendingAtt || {}).reduce(
    (acc, val) => acc + Object.keys(val || {}).length,
    0
  );

  const pendingChangesList = [];
  Object.entries(pendingAtt || {}).forEach(([sId, membersMap]) => {
    const sess = sessions.find((s) => s.id === sId);
    if (!sess) return;
    Object.entries(membersMap || {}).forEach(([mId, newRec]) => {
      const mem = members.find((m) => m.id === mId);
      if (!mem) return;
      const oldRec = dbAttByS?.[sId]?.[mId];
      const getStatusLabel = (rec) => {
        if (!rec || !rec.p) return "Absent";
        return rec.mode === "online" ? "Online" : "In-Person";
      };
      pendingChangesList.push({
        id: `${sId}-${mId}`,
        name: mem.name,
        date: fmtDate(sess.date),
        oldStatus: getStatusLabel(oldRec),
        newStatus: getStatusLabel(newRec),
      });
    });
  });

  if (members.length === 0) return <Empty text="Add members in the Admin tab to see the term matrix." />;
  if (sorted.length === 0) return <Empty text="No sessions logged yet. Start your first roll call from the Admin tab." />;

  return (
    <div>
      {/* Legend and Actions container */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
        marginBottom: 12,
      }}>
        {/* Legend */}
        <div className="font-mono" style={{
          display: "flex", flexWrap: "wrap", gap: "8px 16px",
          fontSize: 12, color: INK_MUTED,
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Check size={13} style={{ color: FOREST }} /> In-person
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Video size={13} style={{ color: TEAL }} /> Online
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <X size={11} style={{ color: LINE }} /> Absent
          </span>
          <span>· Not yet happened</span>
        </div>

        {/* Action Buttons */}
        {pendingCount > 0 && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "8px",
            animation: "stampIn 0.25s ease-out",
            background: "rgba(156,122,46,0.06)",
            padding: "10px 14px",
            borderRadius: "8px",
            border: `1px dashed ${BRASS}44`,
            minWidth: "280px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", justifyContent: "space-between" }}>
              <span className="font-mono" style={{ fontSize: 12, color: BRASS, fontWeight: 600 }}>
                {pendingCount} unsaved change{pendingCount > 1 ? "s" : ""}
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={savePendingAttendance}
                  style={{
                    background: FOREST,
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    boxShadow: "0 2px 6px rgba(63,107,82,0.2)",
                  }}
                >
                  <Check size={13} /> Confirm
                </button>
                <button
                  onClick={() => setPendingAtt({})}
                  style={{
                    background: "transparent",
                    color: RUST,
                    border: `1px solid ${RUST}44`,
                    borderRadius: "6px",
                    padding: "5px 11px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <X size={13} /> Discard
                </button>
              </div>
            </div>

            {/* List of changes */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              width: "100%",
              borderTop: `1px solid ${LINE}`,
              paddingTop: "8px",
              maxHeight: "150px",
              overflowY: "auto",
              alignItems: "flex-start",
            }}>
              {pendingChangesList.map((chg) => (
                <div key={chg.id} style={{ fontSize: 11, color: INK, display: "flex", gap: "6px", alignItems: "center", width: "100%" }}>
                  <strong style={{ color: TM_BLUE, whiteSpace: "nowrap" }}>{chg.name}</strong> 
                  <span style={{ color: INK_MUTED, whiteSpace: "nowrap" }}>({chg.date}):</span>
                  <span style={{ textDecoration: "line-through", color: RUST, opacity: 0.8, whiteSpace: "nowrap" }}>{chg.oldStatus}</span>
                  <span style={{ color: INK_MUTED }}>➔</span>
                  <span style={{ color: FOREST, fontWeight: 600, whiteSpace: "nowrap" }}>{chg.newStatus}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${LINE}` }}>
        <table className="font-mono" style={{ fontSize: 12, width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: PAPER_RAISED }}>
              <th className="font-body" style={{
                position: "sticky", left: 0, zIndex: 10,
                textAlign: "left", padding: "8px 12px", fontWeight: 600,
                background: PAPER_RAISED, borderRight: `1px solid ${LINE}`,
              }}>Member</th>
              {sorted.map((s) => (
                <th key={s.id} style={{
                  padding: "8px 8px", textAlign: "center",
                  fontWeight: 400, whiteSpace: "nowrap", color: INK_MUTED,
                }}>
                  {fmtDate(s.date)}
                </th>
              ))}
              <th className="font-body" style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>
                Term %
              </th>
            </tr>
          </thead>
          <tbody>
            {membersSorted.map((m, i) => {
              const pm = stats.perMember.find((p) => p.id === m.id);
              const rowBg = i % 2 ? "white" : PAPER;
              return (
                <tr key={m.id} style={{ background: rowBg, opacity: m.leaveDate ? 0.6 : 1 }}>
                  <td className="font-body" style={{
                    position: "sticky", left: 0, zIndex: 10,
                    padding: "6px 12px", whiteSpace: "nowrap",
                    background: rowBg, borderRight: `1px solid ${LINE}`,
                  }}>
                    {m.name}{" "}
                    {m.ec && <Star size={10} style={{ color: BRASS, display: "inline", verticalAlign: "middle" }} fill={BRASS} />}
                    {m.joinDate && (
                      <span style={{ marginLeft: 4, color: INK_MUTED }}>· joined {fmtDate(m.joinDate)}</span>
                    )}
                    {m.leaveDate && (
                      <span style={{ marginLeft: 4, color: RUST }}>· left {fmtDate(m.leaveDate)}</span>
                    )}
                  </td>
                  {sorted.map((s) => {
                    const rec = attByS[s.id]?.[m.id];
                    const occurred = s.date <= todayStr();
                    const isPending = pendingAtt[s.id]?.[m.id] !== undefined;

                    if (!isEligible(m, s.date))
                      return <td key={s.id} style={{ textAlign: "center", color: LINE }}>–</td>;
                    if (!occurred)
                      return <td key={s.id} style={{ textAlign: "center", color: LINE }}>·</td>;

                    const handleDoubleClick = () => {
                      let newPresent = true;
                      let newMode = "in-person";
                      if (!rec?.p) {
                        newPresent = true;
                        newMode = "in-person";
                      } else if (rec.mode !== "online") {
                        newPresent = true;
                        newMode = "online";
                      } else {
                        newPresent = false;
                        newMode = null;
                      }

                      const newRecord = {
                        p: newPresent,
                        t: new Date().toISOString(),
                        m: "admin",
                        mode: newPresent ? newMode : null
                      };

                      setPendingAtt((prev) => ({
                        ...prev,
                        [s.id]: { ...(prev[s.id] || {}), [m.id]: newRecord }
                      }));
                    };

                    return (
                      <td
                        key={s.id}
                        style={{
                          textAlign: "center",
                          cursor: "pointer",
                          transition: "background-color 0.15s ease, outline 0.15s ease",
                          backgroundColor: isPending ? "rgba(253, 187, 48, 0.12)" : "transparent",
                          outline: isPending ? `1px dashed ${BRASS}` : "none",
                        }}
                        onDoubleClick={handleDoubleClick}
                        title="Double-click to cycle status: Absent ➔ In-Person ➔ Online"
                        onMouseEnter={(e) => {
                          if (!isPending) {
                            e.currentTarget.style.backgroundColor = "rgba(0,65,101,0.08)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isPending) {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }
                        }}
                      >
                        {rec?.p
                          ? rec.mode === "online"
                            ? <Video size={13} style={{ color: TEAL, display: "inline" }} />
                            : <Check size={14} style={{ color: FOREST, display: "inline" }} />
                          : <X size={12} style={{ color: LINE, display: "inline" }} />}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: "center", fontWeight: 600, color: pctColor(pm.pct) }}>
                    {pm.pct}%
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: PAPER_RAISED, borderTop: `2px solid ${LINE}` }}>
              <td className="font-body" style={{
                position: "sticky", left: 0, padding: "8px 12px", fontWeight: 600,
                background: PAPER_RAISED,
              }}>
                Week %
              </td>
              {sorted.map((s) => {
                const sp = stats.perSession.find((p) => p.id === s.id);
                return (
                  <td key={s.id} style={{
                    textAlign: "center", fontWeight: 600,
                    color: sp ? pctColor(sp.pct) : LINE,
                  }}>
                    {sp ? `${sp.pct}%` : "·"}
                  </td>
                );
              })}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Admin tab ────────────────────────────────────────────────────────────────
function Admin({
  members, saveMembers,
  sessions, saveSessions,
  activeSessionId, startTodaySession, setActive,
  attByS, markAttendance,
  stats, term, startNextTerm,
}) {
  const [bulk, setBulk] = useState("");
  const [correctingSession, setCorrectingSession] = useState("");
  const [copiedLink, setCopiedLink] = useState("");
  const [archiveIndex, setArchiveIndex] = useState([]);

  // Auto-detect app URLs from the current browser URL.
  // With reversed routing: base URL = member check-in, #admin = admin gate.
  const baseUrl    = typeof window !== "undefined"
    ? window.location.origin + window.location.pathname
    : "";
  const checkinUrl = baseUrl;               // base URL → always CheckinPage
  const adminUrl   = baseUrl + "#admin";    // #admin → AdminGate (PIN-protected)

  const copyLink = (url, label) => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedLink(label);
    setTimeout(() => setCopiedLink(""), 2000);
  };

  useEffect(() => {
    (async () => { setArchiveIndex((await getJSON("archiveIndex")) || []); })();
  }, [term]);

  const addBulk = async () => {
    const lines = bulk.split("\n").map((l) => l.trim()).filter(Boolean);
    const defaultJoin = members.length === 0 ? term.start : todayStr();
    const next = [...members];
    lines.forEach((line) => {
      const ec = /,\s*ec$/i.test(line);
      const name = line.replace(/,\s*ec$/i, "").trim();
      if (name) next.push({ id: uid(), name, ec, joinDate: defaultJoin, leaveDate: null });
    });
    await saveMembers(next);
    setBulk("");
  };

  const removeMemberPermanently = async (id) => {
    if (window.confirm("Permanently delete this member and remove them from all historical records? This can't be undone — if they've simply left the club, use \"Mark left\" instead to keep their history.")) {
      await saveMembers(members.filter((m) => m.id !== id));
    }
  };
  const markLeft     = (id) => saveMembers(members.map((m) => m.id === id ? { ...m, leaveDate: todayStr() } : m));
  const reactivate   = (id) => saveMembers(members.map((m) => m.id === id ? { ...m, leaveDate: null } : m));
  const setJoinDate  = (id, date) => saveMembers(members.map((m) => m.id === id ? { ...m, joinDate: date } : m));
  const setLeaveDate = (id, date) => saveMembers(members.map((m) => m.id === id ? { ...m, leaveDate: date } : m));
  const toggleEC     = (id) => saveMembers(members.map((m) => m.id === id ? { ...m, ec: !m.ec } : m));
  const removeSession = (id) => saveSessions(sessions.filter((s) => s.id !== id));

  const exportExcel = () =>
    downloadWorkbook(members, sessions, attByS, `${term.label.replace(/\s+/g, "-")}-${todayStr()}`);

  const downloadArchive = async (entry) => {
    const bundle = await getJSON(`archive:${entry.start}_${entry.end}`);
    if (bundle) downloadWorkbook(bundle.members, bundle.sessions, bundle.attendance, entry.label.replace(/\s+/g, "-"));
  };

  const section = { borderRadius: 8, padding: 16, background: "white", border: `1px solid ${LINE}` };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Storage Status */}
      {MODE === "excel" && (
        <section style={section}>
          <h2 className="font-display" style={{ fontSize: 18, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            📁 Local File Storage
          </h2>
          <p style={{ fontSize: 14, marginBottom: 6 }}>
            Connected File: <strong>{getFileName() || "None"}</strong>
          </p>
          <p style={{ fontSize: 12, color: INK_MUTED, lineHeight: 1.5 }}>
            Because the app is in <strong>Excel Mode</strong>, the workbook is saved directly on your local computer. 
            For security, web browsers cannot display the absolute folder path. To find where the file is stored, 
            search your computer for the file name <code>{getFileName() || "ecity-attendance.xlsx"}</code>. It is located 
            in the folder you chose when you first created or connected it.
          </p>
        </section>
      )}

      {/* Term management */}
      <section style={section}>
        <h2 className="font-display" style={{ fontSize: 18, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={18} /> Term
        </h2>
        <p style={{ fontSize: 14, marginBottom: 12 }}>
          Current term: <strong>{term.label}</strong>
        </p>
        <button
          id="btn-start-next-term"
          onClick={startNextTerm}
          style={{
            fontSize: 14, padding: "8px 16px", borderRadius: 6, fontWeight: 500,
            background: PAPER, border: `1px solid ${LINE}`, color: INK,
          }}
        >
          Start next term ({nextTermOf(term).label})
        </button>
        <p style={{ fontSize: 12, marginTop: 8, color: INK_MUTED }}>
          This archives the current matrix and starts a clean one. Your member roster carries over automatically.
        </p>

        {archiveIndex.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${LINE}` }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: INK_MUTED, marginBottom: 8 }}>
              Past terms
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {archiveIndex.slice().reverse().map((entry) => (
                <div key={entry.start} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
                  <span>{entry.label}</span>
                  <button
                    onClick={() => downloadArchive(entry)}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      fontSize: 12, fontWeight: 500, padding: "4px 10px",
                      borderRadius: 6, background: PAPER, border: `1px solid ${LINE}`,
                    }}
                  >
                    <Download size={12} /> Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Roll call */}
      <section style={section}>
        <h2 className="font-display" style={{ fontSize: 18, marginBottom: 8 }}>Today's roll call</h2>
        {activeSessionId ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 14 }}>
              Session is <strong style={{ color: FOREST }}>open</strong>. Members can check in now.
            </p>
            <button
              id="btn-close-session"
              onClick={() => setActive("")}
              style={{
                fontSize: 12, padding: "6px 12px", borderRadius: 6, fontWeight: 500,
                background: PAPER, border: `1px solid ${LINE}`,
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <button
            id="btn-open-session"
            onClick={startTodaySession}
            style={{
              fontSize: 14, padding: "8px 16px", borderRadius: 6,
              fontWeight: 500, background: INK, color: PAPER,
            }}
          >
            Open this Saturday's roll call
          </button>
        )}
      </section>

      {/* Add members */}
      <section style={section}>
        <h2 className="font-display" style={{ fontSize: 18, marginBottom: 8 }}>Add members</h2>
        <p style={{ fontSize: 12, color: INK_MUTED, marginBottom: 8 }}>
          One name per line. Add ", EC" after a name to mark them Exec Committee.
        </p>
        <textarea
          id="bulk-member-input"
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          rows={4}
          placeholder={"Priya Shah, EC\nRohan Mehta"}
          style={{
            width: "100%", padding: 10, borderRadius: 6,
            border: `1px solid ${LINE}`, fontSize: 14, outline: "none",
          }}
        />
        <button
          id="btn-add-members"
          onClick={addBulk}
          disabled={!bulk.trim()}
          style={{
            marginTop: 8, display: "flex", alignItems: "center", gap: 4,
            fontSize: 14, padding: "8px 12px", borderRadius: 6, fontWeight: 500,
            background: INK, color: PAPER, opacity: bulk.trim() ? 1 : 0.4,
          }}
        >
          <Plus size={14} /> Add members
        </button>

        <p style={{ fontSize: 12, color: INK_MUTED, marginTop: 12, marginBottom: 4 }}>
          New names default to joining today; your first batch defaults to the term start.
        </p>
        <div style={{ maxHeight: 224, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0 }}>
          {members.map((m) => (
            <div key={m.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "6px 0", borderBottom: `1px solid ${LINE}`, gap: 8, fontSize: 14,
            }}>
              <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {m.name}
                  {m.ec && <Star size={11} style={{ color: BRASS }} fill={BRASS} />}
                </span>
                <span className="font-mono" style={{
                  display: "flex", alignItems: "center", flexWrap: "wrap",
                  gap: 4, fontSize: 11, color: INK_MUTED,
                }}>
                  joined
                  <input
                    type="date"
                    value={m.joinDate || term.start}
                    onChange={(e) => setJoinDate(m.id, e.target.value)}
                    style={{
                      fontSize: 11, border: `1px solid ${LINE}`, borderRadius: 4,
                      padding: "1px 4px", color: INK_MUTED, fontFamily: "IBM Plex Mono, monospace",
                    }}
                  />
                  {m.leaveDate && (
                    <>
                      · left
                      <input
                        type="date"
                        value={m.leaveDate}
                        onChange={(e) => setLeaveDate(m.id, e.target.value)}
                        style={{
                          fontSize: 11, border: `1px solid ${LINE}`, borderRadius: 4,
                          padding: "1px 4px", color: RUST, fontFamily: "IBM Plex Mono, monospace",
                        }}
                      />
                    </>
                  )}
                </span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <button onClick={() => toggleEC(m.id)} style={{ fontSize: 12, color: BRASS }}>
                  {m.ec ? "Unmark EC" : "Mark EC"}
                </button>
                {m.leaveDate
                  ? <button onClick={() => reactivate(m.id)} style={{ fontSize: 12, fontWeight: 500, color: FOREST }}>Reactivate</button>
                  : <button onClick={() => markLeft(m.id)} style={{ fontSize: 12, fontWeight: 500, color: RUST }}>Mark left</button>}
                <button onClick={() => removeMemberPermanently(m.id)} title="Permanently delete" style={{ color: RUST }}>
                  <Trash2 size={13} />
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Fix a session */}
      <section style={section}>
        <h2 className="font-display" style={{ fontSize: 18, marginBottom: 8 }}>Fix a session manually</h2>
        <select
          id="session-corrector-select"
          value={correctingSession}
          onChange={(e) => setCorrectingSession(e.target.value)}
          style={{
            width: "100%", padding: 8, borderRadius: 6,
            border: `1px solid ${LINE}`, fontSize: 14, marginBottom: 12,
          }}
        >
          <option value="">Select a session…</option>
          {sessions.slice().sort((a, b) => b.date.localeCompare(a.date)).map((s) => (
            <option key={s.id} value={s.id}>{s.label} — {fmtDate(s.date)}</option>
          ))}
        </select>

        {correctingSession && (
          <div style={{ maxHeight: 256, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {members.map((m) => {
              const rec = attByS[correctingSession]?.[m.id];
              const mode = rec?.p ? (rec.mode || "in-person") : "absent";
              const btn = (label, value, activeColor, activeBg) => (
                <button
                  onClick={() =>
                    value === "absent"
                      ? markAttendance(correctingSession, m.id, false, "admin", null)
                      : markAttendance(correctingSession, m.id, true, "admin", value)
                  }
                  style={{
                    fontSize: 12, padding: "4px 8px", borderRadius: 4, fontWeight: 500,
                    background: mode === value ? activeBg : PAPER,
                    color: mode === value ? activeColor : INK_MUTED,
                    border: `1px solid ${LINE}`,
                  }}
                >
                  {label}
                </button>
              );
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14, gap: 8 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.name}
                    {rec?.t && (
                      <span className="font-mono" style={{ fontSize: 11, marginLeft: 6, color: INK_MUTED }}>
                        {fmtTimeIST(rec.t)}
                      </span>
                    )}
                  </span>
                  <span style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {btn("In-Person", "in-person", FOREST, "#E4EEE8")}
                    {btn("Online",    "online",    TEAL,   "#E2EEF3")}
                    {btn("Absent",    "absent",    RUST,   "#F3E4DE")}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {sessions.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {sessions.slice().sort((a, b) => b.date.localeCompare(a.date)).map((s) => (
              <span key={s.id} style={{
                fontSize: 12, padding: "4px 8px", borderRadius: 4,
                display: "flex", alignItems: "center", gap: 4,
                background: s.id === activeSessionId ? "#E4EEE8" : PAPER,
                border: s.id === activeSessionId ? `1px solid ${FOREST}` : `1px solid ${LINE}`,
                color: s.id === activeSessionId ? FOREST : INK,
              }}>
                {fmtDate(s.date)}
                {s.id === activeSessionId && <span style={{ fontSize: 10, fontWeight: 600 }}> (Active)</span>}
                <button onClick={() => removeSession(s.id)} style={{ color: RUST }}>
                  <Trash2 size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* QR code & links */}
      <section style={section}>
        <h2 className="font-display" style={{ fontSize: 18, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <QrCode size={18} /> Check-in links
        </h2>

        {/* Member check-in link */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: INK, marginBottom: 6 }}>
            📱 Member check-in URL
            <span style={{ fontWeight: 400, color: INK_MUTED }}> — share this before every meeting</span>
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <code style={{
              flex: 1, fontSize: 11, padding: "8px 10px", borderRadius: 6,
              background: PAPER_RAISED, border: `1px solid ${LINE}`,
              wordBreak: "break-all", fontFamily: "IBM Plex Mono, monospace",
              color: INK_MUTED,
            }}>
              {checkinUrl || "http://localhost:5173/attendance/#checkin"}
            </code>
            <button
              id="btn-copy-checkin"
              onClick={() => copyLink(checkinUrl, "checkin")}
              style={{
                fontSize: 12, padding: "8px 12px", borderRadius: 6,
                background: copiedLink === "checkin" ? FOREST : INK,
                color: PAPER, border: "none", cursor: "pointer",
                fontWeight: 600, flexShrink: 0, transition: "background 0.2s",
              }}
            >
              {copiedLink === "checkin" ? "✓ Copied" : "Copy"}
            </button>
          </div>
          {checkinUrl && (
            <div style={{ textAlign: "center" }}>
              <img
                alt="QR code for member check-in"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(checkinUrl)}`}
                style={{ borderRadius: 8, border: `1px solid ${LINE}`, display: "block", margin: "0 auto 6px" }}
              />
              <p style={{ fontSize: 11, color: INK_MUTED }}>Display or print this QR at the start of each meeting</p>
            </div>
          )}
        </div>

        {/* Admin link */}
        <div style={{ padding: "12px 14px", borderRadius: 8, background: "#1B2430", border: "1px solid #2e3a48" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#EFEDE3", marginBottom: 2 }}>
            🔐 Admin URL <span style={{ fontWeight: 400, color: "#8a9baa" }}>— secretary only, requires PIN</span>
          </p>
          <p style={{ fontSize: 11, color: "#5B6472", marginBottom: 8 }}>
            PIN is set in <code style={{ fontFamily: "IBM Plex Mono, monospace", background: "#111820", padding: "1px 5px", borderRadius: 3 }}>src/config.js</code>
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <code style={{
              flex: 1, fontSize: 11, padding: "6px 8px", borderRadius: 5,
              background: "#111820", border: "1px solid #2e3a48",
              wordBreak: "break-all", fontFamily: "IBM Plex Mono, monospace",
              color: "#8a9baa",
            }}>
              {adminUrl || "http://localhost:5173/attendance/#admin"}
            </code>
            <button
              id="btn-copy-admin"
              onClick={() => copyLink(adminUrl, "admin")}
              style={{
                fontSize: 12, padding: "6px 10px", borderRadius: 5,
                background: copiedLink === "admin" ? FOREST : "#2e3a48",
                color: copiedLink === "admin" ? PAPER : "#EFEDE3",
                border: "1px solid #3d4f5e", cursor: "pointer",
                fontWeight: 600, flexShrink: 0, transition: "all 0.2s",
              }}
            >
              {copiedLink === "admin" ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>
      </section>

      {/* Export */}
      <button
        id="btn-export-excel"
        onClick={exportExcel}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, fontSize: 14, padding: "12px 16px", borderRadius: 6,
          fontWeight: 500, background: BRASS, color: "white",
        }}
      >
        <Download size={15} /> Download term attendance workbook (.xlsx)
      </button>
    </div>
  );
}
