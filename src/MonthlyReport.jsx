/**
 * MonthlyReport.jsx — Main Monthly Report Dashboard Controller (Refactored)
 */

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, BarChart3, Users, CalendarDays } from "lucide-react";
import { COLORS } from "./constants/theme.js";
import { todayStr, getMonthLabel } from "./utils/dateUtils.js";
import { calcMonthlyStats } from "./utils/reportMath.js";
import OverviewTab from "./components/report/OverviewTab.jsx";
import LeaderboardTab from "./components/report/LeaderboardTab.jsx";
import SessionTab from "./components/report/SessionTab.jsx";

export default function MonthlyReport({ members, sessions, attendance, term }) {
  const currentYm = todayStr().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentYm);
  const [activeReportTab, setActiveReportTab] = useState("overview");

  // Get list of available months from sessions
  const availableMonths = useMemo(() => {
    const months = new Set(sessions.map((s) => s.date.slice(0, 7)));
    months.add(currentYm);
    return Array.from(months).sort().reverse();
  }, [sessions, currentYm]);

  // Calculate monthly stats
  const ms = useMemo(() => {
    return calcMonthlyStats(members, sessions, attendance, selectedMonth);
  }, [members, sessions, attendance, selectedMonth]);

  const handlePrevMonth = () => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[idx + 1]);
    }
  };

  const handleNextMonth = () => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx > 0) {
      setSelectedMonth(availableMonths[idx - 1]);
    }
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
      {/* Month Selector Bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "white",
        borderRadius: 12,
        padding: "12px 20px",
        border: `1px solid ${COLORS.LINE}`,
        marginBottom: 20,
        flexWrap: "wrap",
        gap: 16,
      }}>
        {/* Month Title & Prev/Next */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={handlePrevMonth}
            disabled={availableMonths.indexOf(selectedMonth) >= availableMonths.length - 1}
            style={{
              background: COLORS.PAPER_RAISED,
              border: `1px solid ${COLORS.LINE}`,
              borderRadius: 6,
              padding: 6,
              cursor: "pointer",
              opacity: availableMonths.indexOf(selectedMonth) >= availableMonths.length - 1 ? 0.4 : 1,
            }}
          >
            <ChevronLeft size={18} />
          </button>

          <h2 className="font-display" style={{ margin: 0, fontSize: 18, color: COLORS.INK }}>
            {getMonthLabel(selectedMonth)}
          </h2>

          <button
            onClick={handleNextMonth}
            disabled={availableMonths.indexOf(selectedMonth) <= 0}
            style={{
              background: COLORS.PAPER_RAISED,
              border: `1px solid ${COLORS.LINE}`,
              borderRadius: 6,
              padding: 6,
              cursor: "pointer",
              opacity: availableMonths.indexOf(selectedMonth) <= 0 ? 0.4 : 1,
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Report Sub-Tabs */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveReportTab("overview")}
            style={{
              background: activeReportTab === "overview" ? COLORS.TM_BLUE : COLORS.PAPER_RAISED,
              color: activeReportTab === "overview" ? "white" : COLORS.INK,
              border: `1px solid ${activeReportTab === "overview" ? COLORS.TM_BLUE : COLORS.LINE}`,
              borderRadius: 6,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <BarChart3 size={14} /> Overview
          </button>

          <button
            onClick={() => setActiveReportTab("leaderboard")}
            style={{
              background: activeReportTab === "leaderboard" ? COLORS.TM_BLUE : COLORS.PAPER_RAISED,
              color: activeReportTab === "leaderboard" ? "white" : COLORS.INK,
              border: `1px solid ${activeReportTab === "leaderboard" ? COLORS.TM_BLUE : COLORS.LINE}`,
              borderRadius: 6,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Users size={14} /> Leaderboard
          </button>

          <button
            onClick={() => setActiveReportTab("sessions")}
            style={{
              background: activeReportTab === "sessions" ? COLORS.TM_BLUE : COLORS.PAPER_RAISED,
              color: activeReportTab === "sessions" ? "white" : COLORS.INK,
              border: `1px solid ${activeReportTab === "sessions" ? COLORS.TM_BLUE : COLORS.LINE}`,
              borderRadius: 6,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <CalendarDays size={14} /> Session Details
          </button>

        </div>
      </div>

      {/* Sub-Tab Contents */}
      {activeReportTab === "overview" && <OverviewTab selectedMonth={selectedMonth} ms={ms} />}
      {activeReportTab === "leaderboard" && <LeaderboardTab selectedMonth={selectedMonth} ms={ms} />}
      {activeReportTab === "sessions" && <SessionTab ms={ms} members={members} attendance={attendance} />}
    </div>
  );
}
