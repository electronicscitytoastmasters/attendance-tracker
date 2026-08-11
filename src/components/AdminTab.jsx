/**
 * AdminTab.jsx — Comprehensive Admin Panel
 * Includes Term Management (Start Next Term), Single-Click Saturday Roll Call, Session Attendance Corrector, and QR Code/Link Sharing.
 */

import React, { useState } from "react";
import { Calendar, Play, Square, QrCode, Download, RefreshCw, CheckCircle2, Shield, AlertCircle, RotateCcw, X, Lock } from "lucide-react";
import { COLORS } from "../constants/theme.js";
import { todayStr, fmtDate, fmtTimeIST, termForDate, nextTermOf, upcomingSaturdayStr } from "../utils/dateUtils.js";
import { getJSON } from "../storage.js";

export default function AdminTab({
  term,
  sessions,
  members,
  activeSessionId,
  attendance,
  onStartRollCall,
  onStopRollCall,
  onOpenArchiveModal,
  onRestoreTerm,
  onSaveSessions,
  onToggleAttendance,
  onExportExcel,
}) {
  const [correctingSessionId, setCorrectingSessionId] = useState("");
  const [copiedLink, setCopiedLink] = useState("");
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [archivedTerms, setArchivedTerms] = useState([]);
  const [selectedRestoreKey, setSelectedRestoreKey] = useState("");
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const [restoring, setRestoring] = useState(false);

  const openRestoreModal = async () => {
    try {
      const idx = (await getJSON("archiveIndex")) || [];
      setArchivedTerms(idx);
      if (idx.length > 0) {
        setSelectedRestoreKey(idx[idx.length - 1].start);
      }
    } catch (e) {
      console.error("Failed to load archive index", e);
    }
    setRestoreConfirmText("");
    setShowRestoreModal(true);
  };

  const handleConfirmRestore = async () => {
    if (restoreConfirmText.trim().toUpperCase() !== "RESTORE" || !selectedRestoreKey) return;
    setRestoring(true);
    try {
      if (onRestoreTerm) {
        await onRestoreTerm(selectedRestoreKey);
      }
      setShowRestoreModal(false);
      setRestoreConfirmText("");
    } catch (e) {
      console.error("Failed to restore term", e);
      alert("Failed to restore term. Please try again.");
    } finally {
      setRestoring(false);
    }
  };

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

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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
              boxShadow: "0 2px 8px rgba(0,65,101,0.2)",
            }}
          >
            <RefreshCw size={16} /> Start Next Term ({nextTerm.label})
          </button>

          <button
            onClick={openRestoreModal}
            style={{
              background: "white",
              color: COLORS.INK,
              border: `1px solid ${COLORS.LINE}`,
              borderRadius: 8,
              padding: "12px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <RotateCcw size={16} color={COLORS.TM_BLUE} /> Undo / Restore Term
          </button>
        </div>

        <p style={{ margin: 0, fontSize: 12, color: COLORS.INK_MUTED, lineHeight: 1.4 }}>
          Starting a new term requires confirmation (typing CONFIRM). If you accidentally start a new term, click <strong>Undo / Restore Term</strong> to rollback immediately.
        </p>
      </div>

      {/* RESTORE TERM MODAL */}
      {showRestoreModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 20,
        }}>
          <div style={{
            background: "white",
            borderRadius: 16,
            padding: 28,
            maxWidth: 480,
            width: "100%",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
            position: "relative",
            border: `1px solid ${COLORS.LINE}`,
          }}>
            <button
              onClick={() => setShowRestoreModal(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: COLORS.INK_MUTED,
              }}
            >
              <X size={20} />
            </button>

            <h3 className="font-display" style={{ margin: "0 0 6px", fontSize: 20, color: COLORS.INK, display: "flex", alignItems: "center", gap: 8 }}>
              <RotateCcw color={COLORS.TM_BLUE} size={22} /> Undo Rollover / Restore Archived Term
            </h3>

            <p style={{ margin: "0 0 16px", fontSize: 13, color: COLORS.INK_MUTED, lineHeight: 1.5 }}>
              Select an archived term below to restore its sessions, attendance, and settings back into the active tracker.
            </p>

            {archivedTerms.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", background: "#F8FAFC", borderRadius: 8, fontSize: 13, color: COLORS.INK_MUTED, marginBottom: 16 }}>
                No archived terms found in storage to restore.
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.INK_MUTED, marginBottom: 6 }}>
                  Select Term to Restore:
                </label>
                <select
                  value={selectedRestoreKey}
                  onChange={(e) => setSelectedRestoreKey(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${COLORS.LINE}`,
                    fontSize: 13,
                    fontWeight: 600,
                    outline: "none",
                  }}
                >
                  {archivedTerms.map((t) => (
                    <option key={t.start} value={t.start}>
                      {t.label} (Start: {t.start})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Security Challenge for Restore */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: COLORS.INK, marginBottom: 6 }}>
                Security Check: Type <span style={{ color: COLORS.TM_BLUE, letterSpacing: "0.05em" }}>RESTORE</span> to authorize rollback
              </label>
              <input
                type="text"
                placeholder="Type RESTORE here..."
                value={restoreConfirmText}
                onChange={(e) => setRestoreConfirmText(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: `2px solid ${restoreConfirmText.trim().toUpperCase() === "RESTORE" ? "#10B981" : COLORS.LINE}`,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setShowRestoreModal(false)}
                disabled={restoring}
                style={{
                  background: COLORS.PAPER_RAISED,
                  color: COLORS.INK,
                  border: `1px solid ${COLORS.LINE}`,
                  borderRadius: 8,
                  padding: "9px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                disabled={restoreConfirmText.trim().toUpperCase() !== "RESTORE" || restoring || !selectedRestoreKey}
                style={{
                  background: restoreConfirmText.trim().toUpperCase() === "RESTORE" ? COLORS.TM_BLUE : "#CBD5E1",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 18px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: restoreConfirmText.trim().toUpperCase() === "RESTORE" ? "pointer" : "not-allowed",
                  boxShadow: restoreConfirmText.trim().toUpperCase() === "RESTORE" ? "0 2px 8px rgba(0,65,101,0.3)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {restoring ? "Restoring..." : "Restore Archived Term"}
              </button>
            </div>
          </div>
        </div>
      )}

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
