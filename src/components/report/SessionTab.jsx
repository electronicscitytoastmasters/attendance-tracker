/**
 * SessionTab.jsx — Session Analysis & Saturday Breakdown View
 */

import React, { useState } from "react";
import { Calendar, Users, MapPin, Video, Check } from "lucide-react";
import { COLORS } from "../../constants/theme.js";
import { fmtDate } from "../../utils/dateUtils.js";

export default function SessionTab({ ms, members, attendance }) {
  if (!ms || !ms.monthSessions || ms.monthSessions.length === 0) {
    return (
      <div style={{ background: "white", padding: 30, borderRadius: 12, textAlign: "center" }}>
        No sessions recorded for this month.
      </div>
    );
  }

  const [selectedSessionId, setSelectedSessionId] = useState(ms.monthSessions[0]?.id || "");

  const currentSession = ms.monthSessions.find((s) => s.id === selectedSessionId) || ms.monthSessions[0];
  const currentSessionStat = ms.perSession.find((s) => s.id === currentSession.id);

  const attObj = attendance[currentSession.id] || {};
  const attendees = members.filter((m) => attObj[m.id]?.p);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Saturday Selector Buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {ms.monthSessions.map((s) => {
          const isSelected = s.id === currentSession.id;
          const stat = ms.perSession.find((p) => p.id === s.id);
          return (
            <button
              key={s.id}
              onClick={() => setSelectedSessionId(s.id)}
              style={{
                background: isSelected ? COLORS.TM_BLUE : "white",
                color: isSelected ? "white" : COLORS.INK,
                border: `1px solid ${isSelected ? COLORS.TM_BLUE : COLORS.LINE}`,
                borderRadius: 10,
                padding: "10px 16px",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
                boxShadow: isSelected ? "0 4px 12px rgba(0,65,101,0.2)" : "none",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.8 }}>{fmtDate(s.date)}</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
                {stat ? `${stat.present} present (${stat.pct}%)` : s.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Session Details Card */}
      <div style={{
        background: "white",
        borderRadius: 12,
        padding: 24,
        border: `1px solid ${COLORS.LINE}`,
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
          borderBottom: `1px solid ${COLORS.LINE}`,
          paddingBottom: 16,
        }}>
          <div>
            <h3 className="font-display" style={{ margin: 0, fontSize: 20, color: COLORS.INK }}>
              {currentSession.label}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: COLORS.INK_MUTED }}>
              Date: <strong>{fmtDate(currentSession.date)}</strong>
            </p>
          </div>

          <div style={{ display: "flex", gap: 16, textAlign: "center" }}>
            <div>
              <p className="font-display" style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLORS.FOREST }}>
                {currentSessionStat?.inPerson || 0}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: COLORS.INK_MUTED }}>In-Person</p>
            </div>
            <div>
              <p className="font-display" style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLORS.TEAL }}>
                {currentSessionStat?.online || 0}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: COLORS.INK_MUTED }}>Online</p>
            </div>
            <div>
              <p className="font-display" style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLORS.TM_BLUE }}>
                {currentSessionStat?.pct || 0}%
              </p>
              <p style={{ margin: 0, fontSize: 11, color: COLORS.INK_MUTED }}>Attendance Rate</p>
            </div>
          </div>
        </div>

        {/* Attendee List */}
        <h4 className="font-display" style={{ margin: "0 0 12px", fontSize: 15, color: COLORS.INK }}>
          Attendees List ({attendees.length})
        </h4>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
          {attendees.map((m) => {
            const rec = attObj[m.id];
            const isOnline = rec?.mode === "online";
            return (
              <div
                key={m.id}
                style={{
                  background: COLORS.PAPER_RAISED,
                  borderRadius: 8,
                  padding: "8px 12px",
                  border: `1px solid ${COLORS.LINE}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 13,
                  fontWeight: 600,
                  color: COLORS.INK,
                }}
              >
                <span>{m.name}</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: isOnline ? COLORS.TEAL : COLORS.FOREST,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}>
                  {isOnline ? <Video size={12} /> : <MapPin size={12} />}
                  {isOnline ? "Online" : "In-Person"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
