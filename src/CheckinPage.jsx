/**
 * CheckinPage.jsx — Member-only check-in page
 *
 * Accessible at: <your-app-url>#checkin
 * Example: https://yourname.github.io/attendance/#checkin
 *
 * This page shows ONLY the check-in interface — no Dashboard, Matrix, or Admin.
 * Members cannot see or access any configuration.
 *
 * Behaviour:
 * - When no session is open: shows a "waiting for roll call" screen
 * - When admin opens a session: shows the member list for check-in
 * - Auto-refreshes every 60 seconds; member can also tap "Refresh"
 *
 * Works with: "local" (same device) | "sheets" (shared, recommended for meetings)
 * Does NOT work with: "excel" mode (local file not accessible to other devices)
 */

import React, { useState, useEffect, useCallback } from "react";
import { Check, Video, MapPin, Search, RefreshCw } from "lucide-react";
import { getJSON, setJSON, initStorage, hasStoredFile, reconnectFile, pickFile, MODE } from "./storage.js";

// ─── Design tokens (same as App.jsx) ─────────────────────────────────────────
const INK       = "#1B2430";
const INK_MUTED = "#5B6472";
const PAPER     = "#EFEDE3";
const PAPER_RAISED = "#F7F5EC";
const BRASS     = "#9C7A2E";
const FOREST    = "#3F6B52";
const TEAL      = "#2E6E8E";
const LINE      = "#D9D2C0";

// ─── IST helpers (duplicated from App.jsx to keep this file self-contained) ───
const IST_MS = 5.5 * 60 * 60 * 1000;
function nowIST() { return new Date(Date.now() + IST_MS); }
function _pad(n) { return String(n).padStart(2, "0"); }
function toDateStr(d) { return `${d.getUTCFullYear()}-${_pad(d.getUTCMonth() + 1)}-${_pad(d.getUTCDate())}`; }
const todayStr = () => toDateStr(nowIST());
const fmtDate  = (d) => new Date(d + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
function fmtTimeIST(iso) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + IST_MS);
  const h = d.getUTCHours();
  return `${h % 12 || 12}:${_pad(d.getUTCMinutes())} ${h >= 12 ? "PM" : "AM"} IST`;
}
function isEligible(member, dateStr) {
  const join  = member.joinDate || "2000-01-01";
  const leave = member.leaveDate || null;
  return dateStr >= join && (!leave || dateStr <= leave);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CheckinPage() {
  const [members,       setMembers]       = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [att,           setAtt]           = useState({});
  const [q,             setQ]             = useState("");
  const [justStamped,   setJustStamped]   = useState(null);
  const [status,        setStatus]        = useState("loading"); // "loading"|"ok"|"error"
  const [lastUpdated,   setLastUpdated]   = useState(null);

  // ── Data loader ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [membersData, sessionsData, activeId] = await Promise.all([
        getJSON("members"),
        getJSON("sessions"),
        getJSON("activeSessionId"),
      ]);

      const m    = membersData  || [];
      const s    = sessionsData || [];
      const sess = activeId ? s.find((x) => x.id === activeId) : null;

      setMembers(m);
      setActiveSession(sess || null);

      if (sess) {
        const attData = await getJSON(`att:${sess.id}`);
        setAtt(attData || {});
      } else {
        setAtt({});
      }

      setLastUpdated(new Date());
      setStatus("ok");
    } catch (e) {
      console.error("CheckinPage: loadData failed", e);
      setStatus("error");
    }
  }, []);

  // ── Init + auto-refresh ──────────────────────────────────────────────────
  useEffect(() => {
    async function bootstrap() {
      if (MODE === "excel") {
        const ready = await initStorage();
        if (!ready) {
          // Distinguish between:
          // A) File handle in IndexedDB but Chrome needs a user gesture to grant permission
          //    → show a "Reconnect" button (clicking it is the gesture)
          // B) File was never set up at all (handle not in IndexedDB)
          //    → show full setup instructions
          const fileExists = await hasStoredFile();
          setStatus(fileExists ? "excel-needs-gesture" : "excel-unsupported");
          return;
        }
        // File connected — fall through to loadData()
      }

      await loadData();
      const timer = setInterval(loadData, 60_000);
      return () => clearInterval(timer);
    }
    bootstrap();
  }, [loadData]);

  // ── Reconnect handler (called from button click = user gesture) ──────────────────────────────────────
  const handleReconnect = async () => {
    setStatus("loading");
    // Try to re-use the existing handle (just needs permission grant from user gesture)
    let ok = await reconnectFile();
    if (!ok) {
      // Handle unusable (file moved/deleted) — let user pick again
      ok = await pickFile(false);
    }
    if (ok) {
      await loadData();
    } else {
      setStatus("excel-needs-gesture");
    }
  };

  // ── Mark attendance ──────────────────────────────────────────────────────
  const mark = async (memberId, mode) => {
    if (!activeSession) return;
    const rec  = { p: true, t: new Date().toISOString(), m: "self", mode };
    const next = { ...att, [memberId]: rec };
    setAtt(next);
    setJustStamped(memberId);
    await setJSON(`att:${activeSession.id}`, next);
  };

  // ── Render helpers ───────────────────────────────────────────────────────
  const eligible     = activeSession ? members.filter((m) => isEligible(m, activeSession.date)) : [];
  const presentCount = eligible.filter((m) => att[m.id]?.p).length;
  const filtered     = eligible.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));

  // ── Screens ──────────────────────────────────────────────────────────────
  if (status === "loading") return (
    <Centered>
      <p style={{ color: INK_MUTED, fontFamily: "Inter, sans-serif" }}>Loading…</p>
    </Centered>
  );

  if (status === "excel-needs-gesture") return (
    <Centered>
      <div style={{ maxWidth: 380, textAlign: "center", fontFamily: "Inter, sans-serif", padding: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>📁</div>
        <p style={{ fontWeight: 600, color: INK, marginBottom: 8, fontSize: 17 }}>Connect your attendance file</p>
        <p style={{ fontSize: 14, color: INK_MUTED, lineHeight: 1.6, marginBottom: 24 }}>
          Chrome requires a click to reconnect the local file after a page refresh.
          This is a browser security requirement.
        </p>
        <button
          id="btn-reconnect-file"
          onClick={handleReconnect}
          style={{
            width: "100%", padding: "13px 20px", borderRadius: 10,
            background: INK, color: PAPER, border: "none",
            fontSize: 15, fontWeight: 600, cursor: "pointer",
            marginBottom: 10,
          }}
        >
          🔗 Reconnect file
        </button>
        <p style={{ fontSize: 12, color: INK_MUTED }}>
          For multi-device use (members on phones), switch to Google Sheets mode in{" "}
          <code style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11 }}>src/storage.js</code>.
        </p>
      </div>
    </Centered>
  );
  if (status === "excel-unsupported") return (
    <Centered>
      <div style={{ maxWidth: 380, textAlign: "center", fontFamily: "Inter, sans-serif", padding: 24 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
        <p style={{ fontWeight: 600, color: INK, marginBottom: 8 }}>Can't connect to the data file</p>
        <p style={{ fontSize: 14, color: INK_MUTED, lineHeight: 1.6, marginBottom: 16 }}>
          In <strong>Excel mode</strong>, the check-in page only works on the same
          device and browser where the admin connected the file.
        </p>
        <div style={{ background: "#F7F5EC", border: "1px solid #D9D2C0", borderRadius: 10, padding: "14px 16px", textAlign: "left", fontSize: 13, color: INK, lineHeight: 1.7 }}>
          <strong>Fix options:</strong><br />
          1. Open this URL on the <strong>same device</strong> as the admin<br />
          2. Or switch to <strong>Google Sheets mode</strong> in{" "}
          <code style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11 }}>src/storage.js</code>{" "}
          for multi-device support
        </div>
      </div>
    </Centered>
  );

  if (status === "error") return (
    <Centered>
      <div style={{ maxWidth: 340, textAlign: "center", fontFamily: "Inter, sans-serif", padding: 24 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📡</div>
        <p style={{ fontWeight: 600, color: INK, marginBottom: 8 }}>Couldn't connect</p>
        <p style={{ fontSize: 14, color: INK_MUTED, marginBottom: 16 }}>
          Check your internet connection, then try again.
        </p>
        <button
          onClick={() => { setStatus("loading"); loadData(); }}
          style={{ fontSize: 14, padding: "8px 18px", borderRadius: 8, background: INK, color: PAPER, border: "none", cursor: "pointer", fontWeight: 500 }}
        >
          Retry
        </button>
      </div>
    </Centered>
  );

  return (
    <div style={{ background: PAPER, minHeight: "100svh", fontFamily: "Inter, sans-serif", color: INK }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        @keyframes stampIn {
          0%   { opacity: 0; transform: scale(2.2) rotate(-16deg); }
          55%  { opacity: 1; transform: scale(0.93) rotate(-7deg); }
          100% { opacity: 1; transform: scale(1) rotate(-7deg); }
        }
        .stamp-in { animation: stampIn 0.45s cubic-bezier(.2,.9,.3,1.1); }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        padding: "18px 20px 12px",
        borderBottom: `1px solid ${LINE}`,
        background: PAPER_RAISED,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p style={{
              fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
              color: BRASS, fontFamily: "IBM Plex Mono, monospace", marginBottom: 2,
            }}>
              Member Check-in
            </p>
            <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 600, lineHeight: 1.2, marginBottom: 4 }}>
              Electronics City Toastmasters
            </h1>
            <p style={{ fontSize: 12, color: INK_MUTED }}>
              {activeSession
                ? `📋 ${fmtDate(activeSession.date)} roll call is open`
                : "🔒 No session open right now"}
            </p>
          </div>
          <button
            id="btn-refresh"
            onClick={() => { setStatus("loading"); loadData(); }}
            style={{
              display: "flex", alignItems: "center", gap: 5, fontSize: 12,
              color: INK_MUTED, padding: "6px 10px", borderRadius: 6,
              border: `1px solid ${LINE}`, background: "white",
              cursor: "pointer", flexShrink: 0, marginLeft: 12,
            }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <main style={{ padding: "16px 16px 32px", maxWidth: 560, margin: "0 auto" }}>

        {/* No session open */}
        {!activeSession && (
          <div style={{
            borderRadius: 12, padding: "44px 24px", textAlign: "center",
            background: PAPER_RAISED, border: `1px dashed ${LINE}`, marginTop: 8,
          }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🔒</div>
            <p style={{ fontWeight: 600, color: INK, marginBottom: 8, fontSize: 16 }}>
              Roll call hasn't started yet
            </p>
            <p style={{ fontSize: 13, color: INK_MUTED, lineHeight: 1.6 }}>
              The secretary will open today's session a few minutes before the meeting.
              This page auto-refreshes every 60 seconds — or tap Refresh above.
            </p>
          </div>
        )}

        {/* Session open */}
        {activeSession && (
          <>
            {/* Present count banner */}
            <div style={{
              borderRadius: 10, padding: "12px 16px", marginBottom: 14,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "white", border: `1px solid ${LINE}`,
            }}>
              <div>
                <p style={{ fontSize: 11, color: INK_MUTED, fontFamily: "IBM Plex Mono, monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {activeSession.label}
                </p>
                <p style={{ fontSize: 13, color: INK_MUTED, marginTop: 2 }}>
                  Tap your name below to check in
                </p>
              </div>
              <div style={{ textAlign: "right", fontFamily: "IBM Plex Mono, monospace" }}>
                <span style={{ fontSize: 30, fontWeight: 700, color: FOREST }}>{presentCount}</span>
                <span style={{ fontSize: 13, color: INK_MUTED }}>&nbsp;/&nbsp;{eligible.length}</span>
                <div style={{ fontSize: 10, color: INK_MUTED }}>present</div>
              </div>
            </div>

            {/* Search */}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <Search size={15} style={{
                position: "absolute", left: 12, top: "50%",
                transform: "translateY(-50%)", color: INK_MUTED, pointerEvents: "none",
              }} />
              <input
                id="checkin-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Find your name…"
                autoComplete="off"
                style={{
                  width: "100%", paddingLeft: 36, paddingRight: 12,
                  paddingTop: 11, paddingBottom: 11,
                  borderRadius: 8, border: `1px solid ${LINE}`,
                  fontSize: 15, outline: "none", background: "white",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Member list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.slice(0, 40).map((m) => {
                const checked = att[m.id]?.p;
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex", alignItems: "center",
                      justifyContent: "space-between",
                      padding: "11px 14px", borderRadius: 9,
                      background: "white", border: `1px solid ${LINE}`,
                    }}
                  >
                    {/* Name */}
                    <span style={{ fontWeight: 500, fontSize: 15 }}>
                      {m.name}
                      {m.ec && (
                        <span style={{ color: BRASS, fontSize: 12, marginLeft: 5 }}>★</span>
                      )}
                    </span>

                    {/* Checked in */}
                    {checked ? (
                      <div
                        className={justStamped === m.id ? "stamp-in" : ""}
                        style={{ textAlign: "right" }}
                      >
                        <div style={{
                          display: "flex", alignItems: "center", gap: 4,
                          fontSize: 12, fontFamily: "IBM Plex Mono, monospace",
                          color: att[m.id]?.mode === "online" ? TEAL : FOREST,
                        }}>
                          {att[m.id]?.mode === "online"
                            ? <><Video size={13} /> ONLINE</>
                            : <><Check size={13} /> IN-PERSON</>}
                        </div>
                        <div style={{ fontSize: 10, color: INK_MUTED, fontFamily: "IBM Plex Mono, monospace" }}>
                          {fmtTimeIST(att[m.id]?.t)}
                        </div>
                      </div>
                    ) : (
                      /* Not yet checked in */
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          id={`ci-inperson-${m.id}`}
                          onClick={() => mark(m.id, "in-person")}
                          style={{
                            display: "flex", alignItems: "center", gap: 4,
                            fontSize: 12, fontWeight: 600, padding: "7px 11px",
                            borderRadius: 7, background: INK, color: PAPER,
                            border: "none", cursor: "pointer",
                          }}
                        >
                          <MapPin size={11} /> In-Person
                        </button>
                        <button
                          id={`ci-online-${m.id}`}
                          onClick={() => mark(m.id, "online")}
                          style={{
                            display: "flex", alignItems: "center", gap: 4,
                            fontSize: 12, fontWeight: 600, padding: "7px 11px",
                            borderRadius: 7, background: TEAL, color: PAPER,
                            border: "none", cursor: "pointer",
                          }}
                        >
                          <Video size={11} /> Online
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {filtered.length === 0 && q && (
                <p style={{ textAlign: "center", color: INK_MUTED, fontSize: 14, padding: "28px 0" }}>
                  No member matches "{q}"
                </p>
              )}
            </div>
          </>
        )}

        {/* Last updated timestamp */}
        {lastUpdated && (
          <p style={{
            textAlign: "center", fontSize: 11, color: INK_MUTED,
            marginTop: 24, fontFamily: "IBM Plex Mono, monospace",
          }}>
            Last refreshed: {fmtTimeIST(lastUpdated.toISOString())}
            &nbsp;·&nbsp;auto-refreshes every 60s
          </p>
        )}
      </main>
    </div>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function Centered({ children }) {
  return (
    <div style={{
      minHeight: "100svh", display: "flex", alignItems: "center",
      justifyContent: "center", background: PAPER,
    }}>
      {children}
    </div>
  );
}
