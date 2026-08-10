/**
 * AttendanceMatrix.jsx — Main Attendance Matrix Table with inline cell editing
 */

import React, { useState, useMemo } from "react";
import { Search, Filter, Star, Video, MapPin, Check, X } from "lucide-react";
import { COLORS } from "../constants/theme.js";
import { fmtDate, todayStr, isEligible } from "../utils/dateUtils.js";

export default function AttendanceMatrix({
  members,
  sessions,
  attMap,
  onToggleAttendance,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [ecOnly, setEcOnly] = useState(false);
  const [activeCell, setActiveCell] = useState(null); // { memberId, sessionId }

  const today = todayStr();

  // Sort sessions chronologically
  const sortedSessions = useMemo(() => {
    return sessions.slice().sort((a, b) => a.date.localeCompare(b.date));
  }, [sessions]);

  // Filter & sort members
  const filteredMembers = useMemo(() => {
    let list = members.slice();
    if (ecOnly) {
      list = list.filter((m) => m.ec);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q));
    }
    return list.sort((a, b) => (b.ec - a.ec) || a.name.localeCompare(b.name));
  }, [members, ecOnly, searchQuery]);

  // Calculate statistics per member
  const memberStats = useMemo(() => {
    const occurred = sortedSessions.filter((s) => s.date <= today);
    const map = {};
    members.forEach((m) => {
      const eligible = occurred.filter((s) => isEligible(m, s.date));
      const attended = eligible.filter((s) => attMap[s.id]?.[m.id]?.p).length;
      const pct = eligible.length ? Math.round((attended / eligible.length) * 100) : 0;
      map[m.id] = { attended, totalEligible: eligible.length, pct };
    });
    return map;
  }, [members, sortedSessions, attMap, today]);

  // Calculate statistics per session
  const sessionStats = useMemo(() => {
    const map = {};
    sortedSessions.forEach((s) => {
      if (s.date > today) return;
      const eligible = members.filter((m) => isEligible(m, s.date));
      const present = eligible.filter((m) => attMap[s.id]?.[m.id]?.p).length;
      const total = eligible.length || 1;
      map[s.id] = { present, total, pct: Math.round((present / total) * 100) };
    });
    return map;
  }, [members, sortedSessions, attMap, today]);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
      {/* Controls Bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
        marginBottom: 20,
      }}>
        {/* Search */}
        <div style={{ position: "relative", minWidth: 260 }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: COLORS.INK_MUTED,
            }}
          />
          <input
            type="text"
            placeholder="Search members by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 36px",
              borderRadius: 8,
              border: `1px solid ${COLORS.LINE}`,
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Filter Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setEcOnly(!ecOnly)}
            className="app-tag"
            style={{
              background: ecOnly ? COLORS.TM_BLUE : "white",
              color: ecOnly ? "white" : COLORS.INK,
              border: `1px solid ${ecOnly ? COLORS.TM_BLUE : COLORS.LINE}`,
              borderRadius: 20,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Star size={13} fill={ecOnly ? COLORS.TM_GOLD : "none"} color={ecOnly ? COLORS.TM_GOLD : COLORS.INK_MUTED} />
            EC Committee Only
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div style={{
        background: "white",
        borderRadius: 12,
        border: `1px solid ${COLORS.LINE}`,
        overflowX: "auto",
        boxShadow: "0 4px 14px rgba(27,36,48,0.05)",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
          <thead>
            <tr style={{ background: COLORS.PAPER_RAISED, borderBottom: `2px solid ${COLORS.LINE}` }}>
              <th style={{ padding: "12px 16px", minWidth: 200, position: "sticky", left: 0, background: COLORS.PAPER_RAISED, zIndex: 2 }}>
                Member Name
              </th>
              <th style={{ padding: "12px 12px", width: 90, textAlign: "center" }}>Role</th>
              {sortedSessions.map((s) => (
                <th key={s.id} style={{ padding: "10px 8px", textAlign: "center", minWidth: 85 }}>
                  <div style={{ fontWeight: 700, color: COLORS.INK }}>{fmtDate(s.date)}</div>
                  <div className="font-mono" style={{ fontSize: 10, color: COLORS.INK_MUTED }}>
                    {s.date > today ? "Upcoming" : sessionStats[s.id] ? `${sessionStats[s.id].pct}%` : "—"}
                  </div>
                </th>
              ))}
              <th style={{ padding: "12px 12px", textAlign: "center", minWidth: 80 }}>Attended</th>
              <th style={{ padding: "12px 12px", textAlign: "center", minWidth: 80 }}>Rate</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((m, idx) => {
              const stats = memberStats[m.id] || { attended: 0, totalEligible: 0, pct: 0 };
              return (
                <tr
                  key={m.id}
                  style={{
                    borderBottom: `1px solid ${COLORS.LINE}`,
                    background: idx % 2 === 0 ? "white" : "#FAFAF7",
                  }}
                >
                  {/* Member Name */}
                  <td style={{
                    padding: "10px 16px",
                    fontWeight: 600,
                    color: COLORS.INK,
                    position: "sticky",
                    left: 0,
                    background: idx % 2 === 0 ? "white" : "#FAFAF7",
                    zIndex: 1,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {m.name}
                      {m.ec && (
                        <span style={{
                          background: "#FFF4D6",
                          color: COLORS.BRASS,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          border: `1px solid ${COLORS.BRASS}44`,
                        }}>
                          EC
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Role */}
                  <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 12, color: COLORS.INK_MUTED }}>
                    {m.ec ? "Exec" : "Member"}
                  </td>

                  {/* Attendance Cells */}
                  {sortedSessions.map((s) => {
                    const isNotOccurred = s.date > today;
                    const eligible = isEligible(m, s.date);
                    const rec = attMap[s.id]?.[m.id];
                    const isPresent = rec?.p;
                    const mode = rec?.mode;

                    if (isNotOccurred) {
                      return (
                        <td key={s.id} style={{ padding: "8px", textAlign: "center", color: "#C0B8A8", fontSize: 11 }}>
                          —
                        </td>
                      );
                    }

                    if (!eligible) {
                      return (
                        <td key={s.id} style={{ padding: "8px", textAlign: "center", color: COLORS.INK_MUTED, fontSize: 11 }}>
                          N/A
                        </td>
                      );
                    }

                    return (
                      <td
                        key={s.id}
                        onDoubleClick={() => onToggleAttendance(s.id, m.id, isPresent ? null : "in-person")}
                        onClick={() => setActiveCell(activeCell?.m === m.id && activeCell?.s === s.id ? null : { m: m.id, s: s.id })}
                        style={{
                          padding: "6px",
                          textAlign: "center",
                          cursor: "pointer",
                          position: "relative",
                          userSelect: "none",
                        }}
                      >
                        <div style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "4px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          background: isPresent
                            ? (mode === "online" ? "#E3F2FD" : "#E8F5E9")
                            : "#FFEBEE",
                          color: isPresent
                            ? (mode === "online" ? "#1565C0" : "#2E7D32")
                            : "#C62828",
                          border: `1px solid ${
                            isPresent
                              ? (mode === "online" ? "#BBDEFB" : "#C8E6C9")
                              : "#FFCDD2"
                          }`,
                        }}>
                          {isPresent ? (
                            mode === "online" ? (
                              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                <Video size={12} /> Online
                              </span>
                            ) : (
                              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                <MapPin size={12} /> In-Person
                              </span>
                            )
                          ) : (
                            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                              <X size={12} /> Absent
                            </span>
                          )}
                        </div>

                        {/* Quick toggle menu on click */}
                        {activeCell?.m === m.id && activeCell?.s === s.id && (
                          <div
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: "50%",
                              transform: "translateX(-50%)",
                              zIndex: 10,
                              background: COLORS.INK,
                              color: "white",
                              borderRadius: 8,
                              padding: 6,
                              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                              display: "flex",
                              gap: 4,
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleAttendance(s.id, m.id, "in-person");
                                setActiveCell(null);
                              }}
                              style={{
                                background: "#2E7D32",
                                color: "white",
                                border: "none",
                                borderRadius: 4,
                                padding: "4px 8px",
                                fontSize: 10,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              In-Person
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleAttendance(s.id, m.id, "online");
                                setActiveCell(null);
                              }}
                              style={{
                                background: "#1565C0",
                                color: "white",
                                border: "none",
                                borderRadius: 4,
                                padding: "4px 8px",
                                fontSize: 10,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Online
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleAttendance(s.id, m.id, null);
                                setActiveCell(null);
                              }}
                              style={{
                                background: "#C62828",
                                color: "white",
                                border: "none",
                                borderRadius: 4,
                                padding: "4px 8px",
                                fontSize: 10,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Absent
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Summary Columns */}
                  <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: COLORS.INK }}>
                    {stats.attended} / {stats.totalEligible}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, color: COLORS.TM_BLUE }}>
                    {stats.pct}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
