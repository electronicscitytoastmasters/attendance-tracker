/**
 * LeaderboardTab.jsx — Complete Member Leaderboard with Legend, 100% Attendance Pills, & Membership Changes
 */

import React, { useState, useMemo, useRef } from "react";
import { Search, Star, Image, Download, FileText } from "lucide-react";
import { COLORS, getAttendanceStatus } from "../../constants/theme.js";
import { fmtDate, getMonthLabel } from "../../utils/dateUtils.js";
import { downloadElementAsPNG, downloadLeaderboardExcel, downloadSmartMultiPagePDF } from "../../utils/exportUtils.js";

export default function LeaderboardTab({ selectedMonth, ms }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [ecOnly, setEcOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const exportContainerRef = useRef(null);

  if (!ms || !ms.memberStats || ms.memberStats.length === 0) {
    return (
      <div style={{ background: "white", padding: 30, borderRadius: 12, textAlign: "center", border: `1px solid ${COLORS.LINE}` }}>
        No member data available for this month.
      </div>
    );
  }

  // 1. Filter members based on search, EC toggle, and status threshold
  const filteredMembers = useMemo(() => {
    let list = ms.memberStats.slice();

    if (ecOnly) {
      list = list.filter((item) => item.ec);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((item) => item.name.toLowerCase().includes(q));
    }

    if (statusFilter !== "all") {
      list = list.filter((item) => {
        const pct = item.pct;
        if (pct === null) return false;
        if (statusFilter === "excellent") return pct >= 90;
        if (statusFilter === "strong") return pct >= 75 && pct < 90;
        if (statusFilter === "good") return pct >= 50 && pct < 75;
        if (statusFilter === "needs") return pct >= 25 && pct < 50;
        if (statusFilter === "low") return pct < 25;
        return true;
      });
    }

    // Sort by pct descending -> attendedCount descending -> name ascending
    return list.sort((a, b) => {
      if (a.pct === null && b.pct === null) return a.name.localeCompare(b.name);
      if (a.pct === null) return 1;
      if (b.pct === null) return -1;
      if (b.pct !== a.pct) return b.pct - a.pct;
      if (b.attendedCount !== a.attendedCount) return b.attendedCount - a.attendedCount;
      return a.name.localeCompare(b.name);
    });
  }, [ms.memberStats, ecOnly, searchQuery, statusFilter]);

  // 2. Compute Standard Competition Ranking (e.g. 1, 1, 1, 8, 8, 8, 17)
  const rankedMembers = useMemo(() => {
    let prevScore = null;
    let prevRank = 1;

    return filteredMembers.map((item, index) => {
      if (item.pct === null) {
        return { ...item, rankDisplay: "N/A" };
      }

      const currentScore = `${item.pct}-${item.attendedCount}`;

      let rank;
      if (index === 0) {
        rank = 1;
      } else if (currentScore === prevScore) {
        rank = prevRank;
      } else {
        rank = index + 1; // Standard competition rank = 1 + number of items strictly ahead
      }

      prevScore = currentScore;
      prevRank = rank;

      return { ...item, rankDisplay: rank };
    });
  }, [filteredMembers]);

  const avgPerMeeting = ms.meetingsHeld > 0
    ? (ms.perSession.reduce((sum, s) => sum + s.present, 0) / ms.meetingsHeld).toFixed(1)
    : "0";

  const monthSlug = selectedMonth ? getMonthLabel(selectedMonth).toLowerCase().replace(/\s+/g, "-") : "month";

  const handleExportPNG = () => {
    if (exportContainerRef.current) {
      downloadElementAsPNG(exportContainerRef.current, `leaderboard-${monthSlug}.png`);
    }
  };

  const handleExportExcel = async () => {
    await downloadLeaderboardExcel(rankedMembers, monthSlug);
  };

  const handleExportPDF = async () => {
    if (exportContainerRef.current) {
      const title = `ECITY Toastmasters | ${getMonthLabel(selectedMonth)} Leaderboard`;
      await downloadSmartMultiPagePDF(exportContainerRef.current, `leaderboard-${monthSlug}.pdf`, title);
    }
  };

  const members100 = ms.membersWith100 || [];
  const newMembers = ms.newMembers || [];
  const leftMembers = ms.leftMembers || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Top Action & Export Toolbar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "white",
        borderRadius: 12,
        padding: "12px 20px",
        border: `1px solid ${COLORS.LINE}`,
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Search by Name */}
          <div style={{ position: "relative", minWidth: 220 }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: COLORS.INK_MUTED,
              }}
            />
            <input
              type="text"
              placeholder="Search member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px 6px 30px",
                borderRadius: 6,
                border: `1px solid ${COLORS.LINE}`,
                fontSize: 12,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Filter Status Badges */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All" },
              { id: "excellent", label: "🟢 90%+" },
              { id: "strong", label: "🟢 75%+" },
              { id: "good", label: "🟡 50%+" },
              { id: "needs", label: "🟠 25%+" },
              { id: "low", label: "🔴 <25%" },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setStatusFilter(btn.id)}
                style={{
                  background: statusFilter === btn.id ? COLORS.TM_BLUE : COLORS.PAPER_RAISED,
                  color: statusFilter === btn.id ? "white" : COLORS.INK,
                  border: `1px solid ${statusFilter === btn.id ? COLORS.TM_BLUE : COLORS.LINE}`,
                  borderRadius: 16,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {btn.label}
              </button>
            ))}

            <button
              onClick={() => setEcOnly(!ecOnly)}
              style={{
                background: ecOnly ? "#FFF4D6" : COLORS.PAPER_RAISED,
                color: ecOnly ? COLORS.BRASS : COLORS.INK_MUTED,
                border: `1px solid ${ecOnly ? COLORS.BRASS : COLORS.LINE}`,
                borderRadius: 16,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Star size={12} fill={ecOnly ? COLORS.BRASS : "none"} /> EC Only
            </button>
          </div>
        </div>

        {/* Direct Leaderboard Export Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleExportPNG}
            style={{
              background: COLORS.TEAL,
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
            <Image size={14} /> Download Image
          </button>
          <button
            onClick={handleExportExcel}
            style={{
              background: COLORS.FOREST,
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
            <Download size={14} /> Download Excel
          </button>
          <button
            onClick={handleExportPDF}
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
            <FileText size={14} /> Download PDF
          </button>
        </div>
      </div>

      {/* Main Leaderboard High-Contrast Canvas */}
      <div style={{ overflowX: "auto", paddingBottom: 20 }}>
        <div
          ref={exportContainerRef}
          style={{
            width: 900,
            margin: "0 auto",
            background: COLORS.PAPER,
            padding: 24,
            borderRadius: 16,
            border: `1px solid ${COLORS.LINE}`,
            boxShadow: "0 8px 24px rgba(27,36,48,0.08)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            boxSizing: "border-box",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {/* Header Block (Dark Navy Header Banner) */}
          <div style={{
            background: "#1B2430",
            borderRadius: 12,
            padding: "20px 24px",
            textAlign: "center",
            boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
          }}>
            <h2 className="font-display" style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#FFFFFF", letterSpacing: "0.01em" }}>
              Electronics City Toastmasters Club
            </h2>
            <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
              Member Attendance Leaderboard — {getMonthLabel(selectedMonth)}
            </p>
            <p className="font-mono" style={{ margin: "4px 0 0", fontSize: 11, color: "#F2DF74", fontWeight: 600 }}>
              {ms.meetingsHeld} meetings held · {rankedMembers.length} members ranked
            </p>
          </div>

          {/* 5 KPI Cards Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            <div style={{ background: "#FDFBF7", borderRadius: 10, padding: "12px 10px", textAlign: "center", border: "1px solid #E5E0D5" }}>
              <p className="font-display" style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1B2430" }}>{ms.overallRatePct}%</p>
              <p className="font-mono" style={{ margin: "4px 0 0", fontSize: 8.5, fontWeight: 700, color: "#5B6472", textTransform: "uppercase" }}>ATTENDANCE RATE</p>
            </div>
            <div style={{ background: "#FDFBF7", borderRadius: 10, padding: "12px 10px", textAlign: "center", border: "1px solid #E5E0D5" }}>
              <p className="font-display" style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1B2430" }}>{avgPerMeeting}</p>
              <p className="font-mono" style={{ margin: "4px 0 0", fontSize: 8.5, fontWeight: 700, color: "#5B6472", textTransform: "uppercase" }}>AVG PER MEETING</p>
            </div>
            <div style={{ background: "#FDFBF7", borderRadius: 10, padding: "12px 10px", textAlign: "center", border: "1px solid #E5E0D5" }}>
              <p className="font-display" style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1B2430" }}>{members100.length}</p>
              <p className="font-mono" style={{ margin: "4px 0 0", fontSize: 8.5, fontWeight: 700, color: "#5B6472", textTransform: "uppercase" }}>100% ATTENDANCE</p>
            </div>
            <div style={{ background: "#FDFBF7", borderRadius: 10, padding: "12px 10px", textAlign: "center", border: "1px solid #E5E0D5" }}>
              <p className="font-display" style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1B2430" }}>{ms.totalInPerson}</p>
              <p className="font-mono" style={{ margin: "4px 0 0", fontSize: 8.5, fontWeight: 700, color: "#5B6472", textTransform: "uppercase" }}>IN-PERSON</p>
            </div>
            <div style={{ background: "#FDFBF7", borderRadius: 10, padding: "12px 10px", textAlign: "center", border: "1px solid #E5E0D5" }}>
              <p className="font-display" style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1B2430" }}>{ms.totalOnline}</p>
              <p className="font-mono" style={{ margin: "4px 0 0", fontSize: 8.5, fontWeight: 700, color: "#5B6472", textTransform: "uppercase" }}>ONLINE</p>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div style={{ background: "#FDFBF7", borderRadius: 10, overflow: "hidden", border: "1px solid #E5E0D5" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#15202B", color: "#FFFFFF", borderBottom: "2px solid #2E3A48" }}>
                  <th style={{ padding: "12px 14px", width: 70, textAlign: "center", fontWeight: 700 }}>Rank</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>Member</th>
                  <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700 }}>Attended</th>
                  <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700 }}>Applicable</th>
                  <th style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700 }}>Att %</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rankedMembers.map((item, idx) => {
                  const status = getAttendanceStatus(item.pct);
                  const isTopRank = item.rankDisplay === 1;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid #EAE6DF",
                        background: isTopRank
                          ? "#F0F7F2"
                          : idx % 2 === 0
                          ? "#FFFFFF"
                          : "#FAF8F5",
                      }}
                    >
                      <td style={{ padding: "11px 14px", textAlign: "center", fontWeight: 800, fontSize: 14, color: isTopRank ? COLORS.FOREST : "#1B2430" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {isTopRank && <span style={{ fontSize: 13, color: COLORS.BRASS }}>⭐</span>}
                          <span>{item.rankDisplay}</span>
                        </div>
                      </td>
                      <td style={{ padding: "11px 16px", fontWeight: 700, fontSize: 13.5, color: "#1B2430" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span>{item.name}</span>
                          {item.ec && <Star size={13} fill={COLORS.BRASS} color={COLORS.BRASS} />}
                        </div>
                        {item.joinDate && item.joinDate.startsWith(selectedMonth) && (
                          <span style={{ fontSize: 10, color: COLORS.INK_MUTED, display: "block" }}>
                            Joined {fmtDate(item.joinDate)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "11px 14px", textAlign: "center", fontWeight: 600, fontSize: 13, color: "#1B2430" }}>
                        {item.attendedCount}
                      </td>
                      <td style={{ padding: "11px 14px", textAlign: "center", fontWeight: 600, fontSize: 13, color: "#5B6472" }}>
                        {item.applicableCount}
                      </td>
                      <td style={{ padding: "11px 14px", textAlign: "center", fontWeight: 800, fontSize: 14, color: status.color }}>
                        {item.pct !== null ? `${item.pct}%` : "N/A"}
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "4px 11px",
                          borderRadius: 20,
                          fontSize: 11.5,
                          fontWeight: 600,
                          background: status.bg,
                          color: status.color,
                          border: `1px solid ${status.color}35`,
                          whiteSpace: "nowrap",
                        }}>
                          {status.emoji} {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Full-Width Rule Legend Card */}
          <div style={{
            background: "#FDFBF7",
            borderRadius: 10,
            padding: "14px 18px",
            border: "1px solid #E5E0D5",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}>
            <p className="font-mono" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#5B6472", margin: 0, letterSpacing: "0.06em" }}>
              LEGEND
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: 11.5, color: "#5B6472" }}>
              {[
                { e: "🟢", l: "Excellent (90–100%)" },
                { e: "🟢", l: "Strong (75–89%)" },
                { e: "🟡", l: "Good (50–74%)" },
                { e: "🟠", l: "Needs Improvement (25–49%)" },
                { e: "🔴", l: "Low Attendance (0–24%)" },
              ].map((s) => <span key={s.l}>{s.e} {s.l}</span>)}
            </div>
            <div style={{ marginTop: 4, paddingTop: 8, borderTop: "1px solid #E5E0D5", display: "flex", flexDirection: "column", gap: 3, fontSize: 11, color: "#5B6472" }}>
              <div><strong>Attendance Formula:</strong> (Meetings Attended / Applicable Meetings) × 100</div>
              <div><strong>Applicable Meetings:</strong> Meetings held on or after the member's join date.</div>
              <div><strong>★ Symbol:</strong> Exec Committee member.</div>
            </div>
          </div>

          {/* 2-Column Bottom Cards Row: 100% Attendance Pill Badges + Membership Changes */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            {/* Left Card: 100% Attendance Members */}
            <div style={{
              background: "#FDFBF7",
              borderRadius: 10,
              padding: "14px 18px",
              border: "1px solid #E5E0D5",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              <p className="font-mono" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#5B6472", margin: 0, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 4 }}>
                ⭐ 100% ATTENDANCE ({members100.length})
              </p>
              {members100.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {members100.map((m) => (
                    <span
                      key={m.id}
                      style={{
                        fontSize: 11.5,
                        padding: "4px 10px",
                        borderRadius: 20,
                        background: "#E4EEE8",
                        color: COLORS.FOREST,
                        fontWeight: 600,
                        border: "1px solid #C8DDD0",
                      }}
                    >
                      {m.name}{m.ec ? " ★" : ""}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: COLORS.INK_MUTED, margin: 0 }}>No member achieved 100% this month.</p>
              )}
            </div>

            {/* Right Card: Membership Changes */}
            <div style={{
              background: "#FDFBF7",
              borderRadius: 10,
              padding: "14px 18px",
              border: "1px solid #E5E0D5",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}>
              <p className="font-mono" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#5B6472", margin: 0, letterSpacing: "0.06em" }}>
                MEMBERSHIP CHANGES
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "#1B2430" }}>
                <p style={{ margin: 0 }}>
                  🆕 New: <strong>{newMembers.length}</strong>
                  {newMembers.length > 0 && <span style={{ color: "#5B6472", fontSize: 11 }}> ({newMembers.map((m) => m.name).join(", ")})</span>}
                </p>
                <p style={{ margin: 0 }}>
                  👋 Left: <strong>{leftMembers.length}</strong>
                  {leftMembers.length > 0 && <span style={{ color: "#5B6472", fontSize: 11 }}> ({leftMembers.map((m) => m.name).join(", ")})</span>}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
