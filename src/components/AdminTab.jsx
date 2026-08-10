/**
 * AdminTab.jsx — Comprehensive Admin Panel
 * Includes Term Management (Start Next Term), Single-Click Saturday Roll Call, Session Attendance Corrector, and QR Code/Link Sharing.
 */

import React, { useState } from "react";
import { Calendar, Play, Square, QrCode, Download, RefreshCw, CheckCircle2, Shield, AlertCircle } from "lucide-react";
import { COLORS } from "../constants/theme.js";
import { todayStr, fmtDate, fmtTimeIST, termForDate, nextTermOf, upcomingSaturdayStr } from "../utils/dateUtils.js";

export default function AdminTab({
  term,
  sessions,
  members,
  activeSessionId,
  attendance,
  onStartRollCall,
  onStopRollCall,
  onOpenArchiveModal,
  onSaveSessions,
  onToggleAttendance,
  onExportExcel,
}) {
  const [correctingSessionId, setCorrectingSessionId] = useState("");
  const [copiedLink, setCopiedLink] = useState("");

  const currentTerm = term || termForDate(todayStr());
  const nextTerm = nextTermOf(currentTerm);
  const saturdayDate = upcomingSaturdayStr();
  const saturdaySession = sessions.find((s) => s.date === saturdayDate);
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  // Single-click Saturday Roll Call opener
  const handleOpenSaturdayRollCall = async () => {
    if (saturdaySession) {
      await onStartRollCall(saturdaySession.id);
    } else {
      // Create new session for this Saturday
      const newSessId = `s_${saturdayDate}`;
      const newSess = {
        id: newSessId,
        date: saturdayDate,
        label: `Meeting (${fmtDate(saturdayDate)})`,
      };
      const updatedSessions = [...sessions, newSess].sort((a, b) => a.date.localeCompare(b.date));
      await onSaveSessions(updatedSessions);
      await onStartRollCall(newSessId);
    }
  };

  const checkinUrl = `${window.location.origin}${window.location.pathname}#checkin`;

  const copyLink = (url) => {
    navigator.clipboard.writeText(url);
    setCopiedLink("checkin");
    setTimeout(() => setCopiedLink(""), 2000);
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page Header */}
      <div style={{
        background: "white",
        borderRadius: 12,
        padding: "20px 24px",
        border: `1px solid ${COLORS.LINE}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <h2 className="font-display" style={{ margin: 0, fontSize: 20, color: COLORS.INK, display: "flex", alignItems: "center", gap: 8 }}>
            <Shield size={20} color={COLORS.TM_BLUE} /> Club Admin Dashboard
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: COLORS.INK_MUTED }}>
            Manage term archiving, roll call status, session corrections, and check-in links.
          </p>
        </div>

        <button
          onClick={onExportExcel}
          style={{
            background: COLORS.BRASS,
            color: "white",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Download size={14} /> Export Workbook (.xlsx)
        </button>
      </div>

      {/* 1. TERM SETTINGS CARD */}
      <div style={{
        background: "white",
        borderRadius: 12,
        padding: 24,
        border: `1px solid ${COLORS.LINE}`,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}>
        <h3 className="font-display" style={{ margin: 0, fontSize: 16, color: COLORS.INK, display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={18} color={COLORS.TM_BLUE} /> Term Settings
        </h3>

        <div style={{ background: COLORS.PAPER_RAISED, borderRadius: 8, padding: 14, border: `1px solid ${COLORS.LINE}` }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: COLORS.INK }}>
            Current Term: <span style={{ color: COLORS.TM_BLUE }}>{currentTerm.label}</span>
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={onOpenArchiveModal}
            style={{
              background: COLORS.TM_BLUE,
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "12px 18px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              width: "fit-content",
              boxShadow: "0 2px 8px rgba(0,65,101,0.2)",
            }}
          >
            <RefreshCw size={16} /> Start Next Term ({nextTerm.label})
          </button>
          <p style={{ margin: 0, fontSize: 12, color: COLORS.INK_MUTED, lineHeight: 1.4 }}>
            This archives the current matrix and starts a clean one for <strong>{nextTerm.label}</strong>. Your member roster carries over automatically.
          </p>
        </div>
      </div>

      {/* 2. SINGLE-CLICK ROLL CALL CONTROLS */}
      <div style={{
        background: "white",
        borderRadius: 12,
        padding: 24,
        border: `1px solid ${COLORS.LINE}`,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}>
        <h3 className="font-display" style={{ margin: 0, fontSize: 16, color: COLORS.INK, display: "flex", alignItems: "center", gap: 8 }}>
          <Play size={18} color={COLORS.FOREST} /> Roll Call Controls
        </h3>

        {activeSessionId ? (
          <div style={{
            background: "#E4EEE8",
            borderRadius: 10,
            padding: 16,
            border: `1px solid ${COLORS.FOREST}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: COLORS.FOREST, display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={16} /> Roll Call is OPEN: {activeSession?.label || fmtDate(activeSessionId)}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: COLORS.INK_MUTED }}>
                Members can currently check in via the check-in link or QR code.
              </p>
            </div>

            <button
              onClick={onStopRollCall}
              style={{
                background: COLORS.RUST,
                color: "white",
                border: "none",
                borderRadius: 6,
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Square size={14} /> Close Roll Call
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={handleOpenSaturdayRollCall}
              style={{
                background: COLORS.FOREST,
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "12px 18px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                width: "fit-content",
                boxShadow: "0 2px 8px rgba(46,107,79,0.2)",
              }}
            >
              <Play size={16} /> ⚡ Open this Saturday's roll call ({fmtDate(saturdayDate)})
            </button>
            <p style={{ margin: 0, fontSize: 12, color: COLORS.INK_MUTED }}>
              Single-click action: automatically finds or creates this Saturday's session ({fmtDate(saturdayDate)}) and opens roll call for member check-in.
            </p>
          </div>
        )}
      </div>

      {/* 3. SESSION CORRECTIONS */}
      <div style={{
        background: "white",
        borderRadius: 12,
        padding: 24,
        border: `1px solid ${COLORS.LINE}`,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}>
        <h3 className="font-display" style={{ margin: 0, fontSize: 16, color: COLORS.INK }}>
          Session Attendance Corrections
        </h3>

        <div style={{ width: "100%", maxWidth: 400 }}>
          <select
            value={correctingSessionId}
            onChange={(e) => setCorrectingSessionId(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 6,
              border: `1px solid ${COLORS.LINE}`,
              fontSize: 13,
              outline: "none",
            }}
          >
            <option value="">Select a session to correct...</option>
            {sessions.slice().sort((a, b) => b.date.localeCompare(a.date)).map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} — {fmtDate(s.date)}
              </option>
            ))}
          </select>
        </div>

        {correctingSessionId && (
          <div style={{
            maxHeight: 280,
            overflowY: "auto",
            borderRadius: 8,
            border: `1px solid ${COLORS.LINE}`,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            background: COLORS.PAPER_RAISED,
          }}>
            {members.map((m) => {
              const rec = attendance[correctingSessionId]?.[m.id];
              const isPresent = rec?.p;
              const mode = rec?.mode || (isPresent ? "in-person" : null);

              return (
                <div key={m.id} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 12,
                  padding: "6px 10px",
                  background: "white",
                  borderRadius: 6,
                  border: `1px solid ${COLORS.LINE}`,
                }}>
                  <span style={{ fontWeight: 600, color: COLORS.INK }}>
                    {m.name} {m.ec ? "★" : ""}
                    {rec?.t && <span style={{ fontSize: 10, color: COLORS.INK_MUTED, marginLeft: 6 }}>({fmtTimeIST(rec.t)})</span>}
                  </span>

                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => onToggleAttendance(correctingSessionId, m.id, "in-person")}
                      style={{
                        padding: "3px 8px",
                        fontSize: 11,
                        borderRadius: 4,
                        fontWeight: 600,
                        border: `1px solid ${mode === "in-person" ? COLORS.FOREST : COLORS.LINE}`,
                        background: mode === "in-person" ? "#E4EEE8" : "white",
                        color: mode === "in-person" ? COLORS.FOREST : COLORS.INK_MUTED,
                        cursor: "pointer",
                      }}
                    >
                      In-Person
                    </button>
                    <button
                      onClick={() => onToggleAttendance(correctingSessionId, m.id, "online")}
                      style={{
                        padding: "3px 8px",
                        fontSize: 11,
                        borderRadius: 4,
                        fontWeight: 600,
                        border: `1px solid ${mode === "online" ? COLORS.TEAL : COLORS.LINE}`,
                        background: mode === "online" ? "#E2EEF3" : "white",
                        color: mode === "online" ? COLORS.TEAL : COLORS.INK_MUTED,
                        cursor: "pointer",
                      }}
                    >
                      Online
                    </button>
                    <button
                      onClick={() => onToggleAttendance(correctingSessionId, m.id, null)}
                      style={{
                        padding: "3px 8px",
                        fontSize: 11,
                        borderRadius: 4,
                        fontWeight: 600,
                        border: `1px solid ${!isPresent ? COLORS.RUST : COLORS.LINE}`,
                        background: !isPresent ? "#F3E4DE" : "white",
                        color: !isPresent ? COLORS.RUST : COLORS.INK_MUTED,
                        cursor: "pointer",
                      }}
                    >
                      Absent
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. CHECK-IN URL & QR CODE */}
      <div style={{
        background: "white",
        borderRadius: 12,
        padding: 24,
        border: `1px solid ${COLORS.LINE}`,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}>
        <h3 className="font-display" style={{ margin: 0, fontSize: 16, color: COLORS.INK, display: "flex", alignItems: "center", gap: 8 }}>
          <QrCode size={18} color={COLORS.TM_BLUE} /> Member Check-in Link & QR Code
        </h3>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <code style={{
            flex: 1,
            fontSize: 11,
            padding: "8px 12px",
            borderRadius: 6,
            background: COLORS.PAPER_RAISED,
            border: `1px solid ${COLORS.LINE}`,
            fontFamily: "monospace",
            color: COLORS.INK_MUTED,
            wordBreak: "break-all",
          }}>
            {checkinUrl}
          </code>
          <button
            onClick={() => copyLink(checkinUrl)}
            style={{
              background: copiedLink === "checkin" ? COLORS.FOREST : COLORS.INK,
              color: "white",
              border: "none",
              borderRadius: 6,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {copiedLink === "checkin" ? "✓ Copied" : "Copy Link"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 8 }}>
          <img
            alt="Check-in QR Code"
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(checkinUrl)}`}
            style={{ borderRadius: 8, border: `1px solid ${COLORS.LINE}`, margin: "0 auto 6px", display: "block" }}
          />
          <p style={{ margin: 0, fontSize: 11, color: COLORS.INK_MUTED }}>
            Display or print this QR code at the entrance of your meeting hall.
          </p>
        </div>
      </div>
    </div>
  );
}
