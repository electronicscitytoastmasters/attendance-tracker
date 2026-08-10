/**
 * SessionManagement.jsx — Saturday Sessions Management & Auto-Term Generator
 */

import React, { useState } from "react";
import { Calendar, Plus, Trash2, CalendarDays } from "lucide-react";
import { COLORS } from "../constants/theme.js";
import { fmtDate, allSaturdaysInRange, termForDate, todayStr } from "../utils/dateUtils.js";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export default function SessionManagement({
  sessions,
  term,
  onSaveSessions,
  onSaveTerm,
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [date, setDate] = useState("");
  const [label, setLabel] = useState("");

  const today = todayStr();
  const sorted = sessions.slice().sort((a, b) => a.date.localeCompare(b.date));

  const handleAddSession = () => {
    if (!date) return;
    const sessDateStr = date;
    const sessLabel = label.trim() || `Saturday, ${fmtDate(sessDateStr)}`;

    // Avoid duplicates
    if (sessions.some((s) => s.date === sessDateStr)) {
      alert("A session for this date already exists!");
      return;
    }

    const newSession = { id: uid(), date: sessDateStr, label: sessLabel };
    onSaveSessions([...sessions, newSession]);
    setDate("");
    setLabel("");
    setShowAddModal(false);
  };

  const handleDeleteSession = (id) => {
    if (window.confirm("Are you sure you want to delete this session?")) {
      onSaveSessions(sessions.filter((s) => s.id !== id));
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header & Actions */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 20,
        flexWrap: "wrap",
      }}>
        <div>
          <h2 className="font-display" style={{ margin: 0, fontSize: 22, color: COLORS.INK }}>
            Saturday Sessions
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: COLORS.INK_MUTED }}>
            Term: <strong>{term?.label || "Jan – Jun 2026"}</strong> ({sessions.length} sessions configured)
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setShowAddModal(true)}
            className="app-button"
            style={{
              background: COLORS.TM_BLUE,
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Plus size={16} /> Add Session
          </button>
        </div>
      </div>

      {/* Sessions Table */}
      <div style={{
        background: "white",
        borderRadius: 12,
        border: `1px solid ${COLORS.LINE}`,
        overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
          <thead>
            <tr style={{ background: COLORS.PAPER_RAISED, borderBottom: `2px solid ${COLORS.LINE}` }}>
              <th style={{ padding: "12px 16px" }}>Session Date</th>
              <th style={{ padding: "12px 12px" }}>Display Label</th>
              <th style={{ padding: "12px 12px", textAlign: "center" }}>Status</th>
              <th style={{ padding: "12px 16px", textAlign: "right", width: 80 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, idx) => {
              const isPast = s.date < today;
              const isToday = s.date === today;

              return (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: `1px solid ${COLORS.LINE}`,
                    background: idx % 2 === 0 ? "white" : "#FAFAF7",
                  }}
                >
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: COLORS.INK }}>
                    {fmtDate(s.date)} ({s.date})
                  </td>
                  <td style={{ padding: "12px 12px", color: COLORS.INK_MUTED }}>
                    {s.label}
                  </td>
                  <td style={{ padding: "12px 12px", textAlign: "center" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      background: isToday ? "#FFF4D6" : isPast ? "#E8F5E9" : "#F0EEE8",
                      color: isToday ? COLORS.BRASS : isPast ? COLORS.FOREST : COLORS.INK_MUTED,
                    }}>
                      {isToday ? "Today" : isPast ? "Completed" : "Upcoming"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <button
                      onClick={() => handleDeleteSession(s.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: COLORS.RUST,
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Session Modal */}
      {showAddModal && (
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
            padding: 24,
            maxWidth: 380,
            width: "100%",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
          }}>
            <h3 className="font-display" style={{ margin: "0 0 16px", fontSize: 18, color: COLORS.INK }}>
              Add Meeting Session
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.INK_MUTED, marginBottom: 4 }}>
                  Session Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: `1px solid ${COLORS.LINE}`,
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.INK_MUTED, marginBottom: 4 }}>
                  Label (optional)
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Saturday, Aug 15"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: `1px solid ${COLORS.LINE}`,
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setShowAddModal(false)}
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
                onClick={handleAddSession}
                style={{
                  background: COLORS.TM_BLUE,
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Add Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
