/**
 * ArchiveModal.jsx — End-of-Term Archiving Modal
 */

import React, { useState } from "react";
import { X, Calendar } from "lucide-react";
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

  const [saving, setSaving] = useState(false);

  const handleArchive = async () => {
    setSaving(true);
    try {
      await onArchiveTerm(currentTerm, nextTerm);
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
      background: "rgba(27,36,48,0.75)",
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
        maxWidth: 450,
        width: "100%",
        boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
        position: "relative",
      }}>
        <button
          onClick={onClose}
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

        <h3 className="font-display" style={{ margin: "0 0 6px", fontSize: 20, color: COLORS.INK }}>
          Archive Term ({currentTerm.label})
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: COLORS.INK_MUTED, lineHeight: 1.5 }}>
          This action will lock the current term data into a separate archive sheet tab, clear active sessions, and reset the tracker for <strong>{nextTerm.label}</strong>.
        </p>

        <div style={{
          background: COLORS.PAPER_RAISED,
          borderRadius: 8,
          padding: 16,
          border: `1px solid ${COLORS.LINE}`,
          marginBottom: 20,
          fontSize: 13,
        }}>
          <p style={{ margin: "0 0 6px", fontWeight: 700, color: COLORS.INK }}>
            Archive Summary:
          </p>
          <ul style={{ margin: 0, paddingLeft: 20, color: COLORS.INK_MUTED }}>
            <li>Term: {currentTerm.label}</li>
            <li>Sessions: {sessions.length} Saturday meetings</li>
            <li>Members: {members.length} club members</li>
          </ul>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              background: COLORS.PAPER_RAISED,
              color: COLORS.INK,
              border: `1px solid ${COLORS.LINE}`,
              borderRadius: 6,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleArchive}
            disabled={saving}
            style={{
              background: COLORS.RUST,
              color: "white",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {saving ? "Archiving..." : `Archive & Start ${nextTerm.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}
