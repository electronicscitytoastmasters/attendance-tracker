/**
 * ArchiveModal.jsx — End-of-Term Archiving Modal with Security Confirmation Layer
 */

import React, { useState } from "react";
import { X, ShieldAlert, Lock, RotateCcw, AlertTriangle } from "lucide-react";
import { COLORS } from "../constants/theme.js";
import { termForDate, nextTermOf, todayStr } from "../utils/dateUtils.js";

export default function ArchiveModal({
  isOpen,
  onClose,
  term,
  sessions,
  members,
  attendanceMap,
  onArchiveTerm,
}) {
  if (!isOpen) return null;

  const currentTerm = term || termForDate(todayStr());
  const nextTerm = nextTermOf(currentTerm);

  const [confirmText, setConfirmText] = useState("");
  const [saving, setSaving] = useState(false);

  const isConfirmed = confirmText.trim().toUpperCase() === "CONFIRM";

  const handleArchive = async () => {
    if (!isConfirmed) return;
    setSaving(true);
    try {
      await onArchiveTerm(currentTerm, nextTerm);
      setConfirmText("");
      onClose();
    } catch (e) {
      console.error("Failed to archive term", e);
      alert("Failed to archive term. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
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
          onClick={() => {
            setConfirmText("");
            onClose();
          }}
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
          <ShieldAlert color="#DC2626" size={22} /> Security Confirmation: Start Next Term
        </h3>

        <p style={{ margin: "0 0 16px", fontSize: 13, color: COLORS.INK_MUTED, lineHeight: 1.5 }}>
          You are about to end term <strong>{currentTerm.label}</strong> and initialize <strong>{nextTerm.label}</strong>.
        </p>

        {/* Action Details Card */}
        <div style={{
          background: "#FEF2F2",
          borderRadius: 10,
          padding: "14px 16px",
          border: "1px solid #FCA5A5",
          marginBottom: 16,
          fontSize: 13,
        }}>
          <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#991B1B", display: "flex", alignItems: "center", gap: 6 }}>
            <Lock size={15} /> What will happen:
          </p>
          <ul style={{ margin: 0, paddingLeft: 20, color: "#7F1D1D", lineHeight: 1.6 }}>
            <li>Current term (<strong>{currentTerm.label}</strong>) data will be locked into a permanent Archive.</li>
            <li>Active Saturday session records will reset for <strong>{nextTerm.label}</strong>.</li>
            <li>Club members list remains intact.</li>
          </ul>
        </div>

        {/* Undo Info Note */}
        <div style={{
          background: "#EFF6FF",
          borderRadius: 8,
          padding: "10px 14px",
          border: "1px solid #BFDBFE",
          marginBottom: 18,
          fontSize: 12,
          color: "#1E40AF",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <RotateCcw size={16} color="#2563EB" style={{ flexShrink: 0 }} />
          <span><strong>Undo Safety Net:</strong> If you accidentally start a term, you can undo this rollover anytime using the <em>Restore Term</em> button in Club Admin!</span>
        </div>

        {/* Security Challenge Input */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: COLORS.INK, marginBottom: 6 }}>
            Security Check: Type <span style={{ color: "#DC2626", letterSpacing: "0.05em" }}>CONFIRM</span> to authorize rollover
          </label>
          <input
            type="text"
            placeholder="Type CONFIRM here..."
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 8,
              border: `2px solid ${isConfirmed ? "#10B981" : COLORS.LINE}`,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.05em",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Modal Action Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={() => {
              setConfirmText("");
              onClose();
            }}
            disabled={saving}
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
            onClick={handleArchive}
            disabled={!isConfirmed || saving}
            style={{
              background: isConfirmed ? COLORS.RUST : "#CBD5E1",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 700,
              cursor: isConfirmed ? "pointer" : "not-allowed",
              boxShadow: isConfirmed ? "0 2px 8px rgba(184,51,42,0.3)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            {saving ? "Archiving..." : `Authorize & Start ${nextTerm.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}
