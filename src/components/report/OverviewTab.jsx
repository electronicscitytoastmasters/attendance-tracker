/**
 * OverviewTab.jsx — Unified 1152px Branded Monthly Dashboard Canvas (Pixel-perfect restore from reference mockup)
 */

import React, { useRef } from "react";
import { Users, CalendarDays, TrendingUp, UserCheck, Award, Download, Image, FileText, Star, Maximize2, Minimize2 } from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, ReferenceArea, LabelList
} from "recharts";
import { COLORS } from "../../constants/theme.js";
import { fmtDate, getMonthLabel } from "../../utils/dateUtils.js";
import { downloadElementAsPNG, downloadElementAsPDF } from "../../utils/exportUtils.js";
import tmLogo from "../../ToastmastersLogoColor.png";

const CustomModeTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const inPerson = payload.find((p) => p.dataKey === "inPerson")?.value || 0;
    const online = payload.find((p) => p.dataKey === "online")?.value || 0;
    const total = inPerson + online;

    return (
      <div style={{
        background: "#15202B",
        border: "1px solid #2E3A48",
        borderRadius: 6,
        padding: "8px 12px",
        color: "#FFFFFF",
        fontSize: 11,
        boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
      }}>
        <p className="font-mono" style={{ margin: "0 0 4px", fontWeight: 700, color: "#F2DF74", fontSize: 11 }}>
          {fmtDate(label)}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 11 }}>
          <div>In-Person: <strong style={{ color: "#FFFFFF" }}>{inPerson}</strong></div>
          <div>Online: <strong style={{ color: "#FFFFFF" }}>{online}</strong></div>
        </div>
        <div style={{ marginTop: 6, paddingTop: 4, borderTop: "1px solid #2E3A48", fontWeight: 700, fontSize: 11 }}>
          Total: <strong style={{ color: "#FFFFFF" }}>{total}</strong>
        </div>
      </div>
    );
  }
  return null;
};

export default function OverviewTab({ selectedMonth, ms }) {
  const dashboardRef = useRef(null);

  if (!ms || ms.meetingsHeld === 0) {
    return (
      <div style={{
        background: "white",
        borderRadius: 12,
        padding: 40,
        textAlign: "center",
        border: `1px solid ${COLORS.LINE}`,
        color: COLORS.INK_MUTED,
      }}>
        <CalendarDays size={40} style={{ color: COLORS.INK_MUTED, marginBottom: 12 }} />
        <h3 className="font-display" style={{ margin: "0 0 6px", fontSize: 18, color: COLORS.INK }}>
          No Meetings Held This Month
        </h3>
        <p style={{ margin: 0, fontSize: 13 }}>
          Select another month from the month selector above to view reports.
        </p>
      </div>
    );
  }

  const handleExportPNG = () => {
    if (dashboardRef.current) {
      downloadElementAsPNG(dashboardRef.current, `monthly-dashboard-${selectedMonth}.png`);
    }
  };

  const handleExportPDF = () => {
    if (dashboardRef.current) {
      downloadElementAsPDF(
        dashboardRef.current,
        `monthly-dashboard-${selectedMonth}.pdf`,
        `Monthly Attendance Dashboard - ${getMonthLabel(selectedMonth)}`
      );
    }
  };

  // Donut chart data for attendance mode
  const donutData = [
    { name: "In-Person", value: ms.totalInPerson, color: "#2E6B4F" },
    { name: "Online", value: ms.totalOnline, color: "#1D5276" },
  ];

  const totalInstances = ms.totalInstances || (ms.totalInPerson + ms.totalOnline);
  const inPersonPct = totalInstances > 0 ? Math.round((ms.totalInPerson / totalInstances) * 100) : 0;
  const onlinePct = totalInstances > 0 ? Math.round((ms.totalOnline / totalInstances) * 100) : 0;

  const avgPerMeeting = ms.meetingsHeld > 0
    ? (ms.perSession.reduce((sum, s) => sum + s.present, 0) / ms.meetingsHeld).toFixed(1)
    : "0";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Top Action Bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "white",
        borderRadius: 10,
        padding: "10px 18px",
        border: `1px solid ${COLORS.LINE}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={handleExportPNG}
            style={{
              background: "#8C6D3B",
              color: "white",
              border: "none",
              borderRadius: 6,
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Download size={14} /> Download Image
          </button>
          <button
            onClick={handleExportPDF}
            style={{
              background: COLORS.TM_BLUE,
              color: "white",
              border: "none",
              borderRadius: 6,
              padding: "7px 14px",
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

        <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: COLORS.INK }}>
          Monthly Attendance Dashboard — {getMonthLabel(selectedMonth)}
        </span>
      </div>

      {/* Main 1152px Presentation Dashboard Canvas Container */}
      <div style={{ overflowX: "auto", paddingBottom: 20 }}>
        <div
          ref={dashboardRef}
          style={{
            width: 1152,
            background: "#EFEDE3",
            padding: 20,
            borderRadius: 16,
            border: "1px solid #DFDCD2",
            boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            boxSizing: "border-box",
            margin: "0 auto",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {/* A. Dark Blue Toastmasters Brand Header */}
          <div style={{
            background: "#004165",
            borderRadius: 10,
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "3px solid #F2DF74",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <img src={tmLogo} alt="Toastmasters" style={{ height: 42, width: "auto" }} />
              <div>
                <h1 className="font-display" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#FFFFFF", letterSpacing: "0.02em" }}>
                  ELECTRONICS CITY TOASTMASTERS CLUB
                </h1>
                <p className="font-mono" style={{ margin: "2px 0 0", fontSize: 10, fontWeight: 700, color: "#F2DF74", letterSpacing: "0.08em" }}>
                  MEMBER ATTENDANCE DASHBOARD — {getMonthLabel(selectedMonth).toUpperCase()}
                </p>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: 10,
                fontWeight: 700,
                color: "#FFFFFF",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}>
                <CalendarDays size={12} style={{ color: "#F2DF74" }} />
                {ms.meetingsHeld} MEETINGS HELD
              </div>
              <div className="font-mono" style={{ fontSize: 9.5, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>
                {ms.monthSessions.map((s) => fmtDate(s.date)).join("  |  ")}
              </div>
            </div>
          </div>

          {/* B. 5 KPI Cards Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            <div style={{ background: "#FFFFFF", borderRadius: 8, padding: "12px 14px", border: "1px solid #E5E0D5", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#F4F0E6", display: "flex", alignItems: "center", justifyContent: "center", color: "#8C6D3B" }}>
                <Users size={18} />
              </div>
              <div>
                <p className="font-display" style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1B2430" }}>{ms.totalMembers}</p>
                <p className="font-mono" style={{ margin: "2px 0 0", fontSize: 8.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>TOTAL MEMBERS</p>
              </div>
            </div>

            <div style={{ background: "#FFFFFF", borderRadius: 8, padding: "12px 14px", border: "1px solid #E5E0D5", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#F4F0E6", display: "flex", alignItems: "center", justifyContent: "center", color: "#8C6D3B" }}>
                <CalendarDays size={18} />
              </div>
              <div>
                <p className="font-display" style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1B2430" }}>{ms.meetingsHeld}</p>
                <p className="font-mono" style={{ margin: "2px 0 0", fontSize: 8.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>MEETINGS HELD</p>
              </div>
            </div>

            <div style={{ background: "#FFFFFF", borderRadius: 8, padding: "12px 14px", border: "1px solid #E5E0D5", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#E8F4EC", display: "flex", alignItems: "center", justifyContent: "center", color: "#2E6B4F" }}>
                <TrendingUp size={18} />
              </div>
              <div>
                <p className="font-display" style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#2E6B4F" }}>{ms.overallRatePct}%</p>
                <p className="font-mono" style={{ margin: "2px 0 0", fontSize: 8.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>OVERALL ATTENDANCE</p>
              </div>
            </div>

            <div style={{ background: "#FFFFFF", borderRadius: 8, padding: "12px 14px", border: "1px solid #E5E0D5", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#E8F0F8", display: "flex", alignItems: "center", justifyContent: "center", color: "#004165" }}>
                <UserCheck size={18} />
              </div>
              <div>
                <p className="font-display" style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1B2430" }}>{ms.attendedAtLeastOne}</p>
                <p className="font-mono" style={{ margin: "2px 0 0", fontSize: 8.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>ATTENDED ≥ 1</p>
              </div>
            </div>

            <div style={{ background: "#FFFFFF", borderRadius: 8, padding: "12px 14px", border: "1px solid #E5E0D5", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FEF7E0", display: "flex", alignItems: "center", justifyContent: "center", color: "#B06000" }}>
                <Award size={18} />
              </div>
              <div>
                <p className="font-display" style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1B2430" }}>{ms.membersWith100.length}</p>
                <p className="font-mono" style={{ margin: "2px 0 0", fontSize: 8.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>100% ATTENDANCE</p>
              </div>
            </div>
          </div>

          {/* C. Row 2 Grid (3 Equal Columns) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {/* 1. WEEKLY ATTENDANCE TREND */}
            <div style={{ background: "#FFFFFF", borderRadius: 10, padding: 14, border: "1px solid #E5E0D5", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <p className="font-mono" style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", color: "#6B7280", margin: "0 0 10px", letterSpacing: "0.05em" }}>
                  WEEKLY ATTENDANCE TREND
                </p>
                <div style={{ width: "100%", height: 140 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ms.perSession} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8C6D3B" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8C6D3B" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" />
                      <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 9, fill: "#6B7280" }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#6B7280" }} unit="%" />
                      <Tooltip formatter={(v) => [`${v}%`, "Rate"]} labelFormatter={fmtDate} />
                      <Area type="monotone" dataKey="pct" stroke="#8C6D3B" strokeWidth={2.5} fill="url(#trendGrad)" dot={{ r: 4, fill: "#8C6D3B" }}>
                        <LabelList dataKey="pct" position="top" formatter={(v) => `${v}%`} style={{ fontSize: 10, fontWeight: 800, fill: "#1B2430" }} />
                      </Area>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bottom Insight Callout */}
              <div style={{
                background: "#F7F4EA",
                borderRadius: 6,
                padding: "8px 10px",
                borderLeft: "3px solid #8C6D3B",
                fontSize: 10.5,
                color: "#1B2430",
                lineHeight: 1.35,
                marginTop: 8,
              }}>
                {ms.executiveInsight || "Attendance rate remained consistent across meetings."}
              </div>
            </div>

            {/* 2. MEMBER PARTICIPATION DISTRIBUTION */}
            <div style={{ background: "#FFFFFF", borderRadius: 10, padding: 14, border: "1px solid #E5E0D5" }}>
              <p className="font-mono" style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", color: "#6B7280", margin: "0 0 12px", letterSpacing: "0.05em" }}>
                MEMBER PARTICIPATION DISTRIBUTION
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, justifyContent: "center", height: 150 }}>
                {ms.distribution.slice().reverse().map((d) => {
                  const pctVal = ms.totalMembers ? Math.round((d.count / ms.totalMembers) * 100) : 0;
                  const barColor = d.meetings === ms.meetingsHeld ? "#2E6B4F" : d.meetings > 0 ? "#1D5276" : "#A39E93";
                  return (
                    <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                      <span className="font-mono" style={{ width: 55, fontWeight: 600, color: "#1B2430" }}>
                        {d.label} mtgs
                      </span>
                      <div style={{ flex: 1, height: 16, background: "#EAE6DF", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${pctVal}%`, height: "100%", background: barColor, borderRadius: 4 }} />
                      </div>
                      <span className="font-mono" style={{ width: 60, fontWeight: 700, color: "#1B2430", textAlign: "right" }}>
                        {d.count} ({pctVal}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. ATTENDANCE MODE (Donut Chart) */}
            <div style={{ background: "#FFFFFF", borderRadius: 10, padding: 14, border: "1px solid #E5E0D5", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <p className="font-mono" style={{ width: "100%", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", color: "#6B7280", margin: "0 0 4px", letterSpacing: "0.05em" }}>
                ATTENDANCE MODE
              </p>
              <div style={{ position: "relative", width: 140, height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={62}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                }}>
                  <p className="font-display" style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1B2430" }}>{totalInstances}</p>
                  <p className="font-mono" style={{ margin: 0, fontSize: 7.5, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>TOTAL INSTANCES</p>
                </div>
              </div>

              {/* Mode Legend */}
              <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 11, fontWeight: 600 }}>
                <span style={{ color: "#2E6B4F", display: "flex", alignItems: "center", gap: 4 }}>
                  ■ In-Person: {ms.totalInPerson} ({inPersonPct}%)
                </span>
                <span style={{ color: "#1D5276", display: "flex", alignItems: "center", gap: 4 }}>
                  ■ Online: {ms.totalOnline} ({onlinePct}%)
                </span>
              </div>
            </div>
          </div>

          {/* D. Row 3 Grid (2 Columns) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* 1. WEEKLY ATTENDANCE BY MODE */}
            <div style={{ background: "#FFFFFF", borderRadius: 10, padding: 14, border: "1px solid #E5E0D5", display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <p className="font-mono" style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", color: "#6B7280", margin: "0 0 10px", letterSpacing: "0.05em" }}>
                  WEEKLY ATTENDANCE BY MODE
                </p>
                <div style={{ width: "100%", height: 140 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ms.perSession} margin={{ top: 18, right: 10, left: -25, bottom: 0 }} barSize={36}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 9, fill: "#6B7280" }} />
                      <YAxis tick={{ fontSize: 9, fill: "#6B7280" }} />
                      <Tooltip content={<CustomModeTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                      <Bar dataKey="inPerson" name="In-Person" fill="#2E6B4F" stackId="a">
                        <LabelList dataKey="inPerson" position="center" style={{ fontSize: 9.5, fontWeight: 700, fill: "#FFFFFF" }} formatter={(v) => v > 0 ? v : ""} />
                      </Bar>
                      <Bar dataKey="online" name="Online" fill="#1D5276" stackId="a" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="online" position="center" style={{ fontSize: 9.5, fontWeight: 700, fill: "#FFFFFF" }} formatter={(v) => v > 0 ? v : ""} />
                        <LabelList dataKey="present" position="top" style={{ fontSize: 10, fontWeight: 800, fill: "#1B2430" }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 10, fontWeight: 600, justifyContent: "center" }}>
                  <span style={{ color: "#2E6B4F" }}>■ In-Person</span>
                  <span style={{ color: "#1D5276" }}>■ Online</span>
                </div>
              </div>

              {/* Total Instance Card Callout */}
              <div style={{
                width: 110,
                background: "#F5F3EB",
                borderRadius: 8,
                padding: "12px 10px",
                border: "1px solid #E5E0D5",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#E8F0F8", display: "flex", alignItems: "center", justifyContent: "center", color: "#004165", marginBottom: 6 }}>
                  <UserCheck size={16} />
                </div>
                <p className="font-mono" style={{ margin: 0, fontSize: 8, fontWeight: 700, color: "#6B7280", textTransform: "uppercase" }}>TOTAL ATTENDANCE INSTANCES</p>
                <p className="font-display" style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 800, color: "#1B2430" }}>{totalInstances}</p>
              </div>
            </div>

            {/* 2. ATTENDANCE TREND (TERM TO DATE) */}
            <div style={{ background: "#FFFFFF", borderRadius: 10, padding: 14, border: "1px solid #E5E0D5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <p className="font-mono" style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", color: "#6B7280", margin: 0, letterSpacing: "0.05em" }}>
                    ATTENDANCE TREND (TERM TO DATE)
                  </p>
                  <p className="font-mono" style={{ fontSize: 8.5, color: "#8C6D3B", margin: "2px 0 0", fontWeight: 600 }}>
                    Shaded area = {getMonthLabel(selectedMonth)}
                  </p>
                </div>

                <div style={{ display: "flex", gap: 14, textAlign: "right" }}>
                  <div>
                    <span className="font-mono" style={{ fontSize: 7.5, color: "#6B7280", display: "block", textTransform: "uppercase", fontWeight: 700 }}>
                      LAST MONTH ({ms.prevMonthLabel || "JUL"})
                    </span>
                    <span className="font-display" style={{ fontSize: 16, fontWeight: 800, color: "#1B2430" }}>
                      {ms.lastMonthRatePct || ms.overallRatePct}%
                    </span>
                  </div>
                  <div>
                    <span className="font-mono" style={{ fontSize: 7.5, color: "#6B7280", display: "block", textTransform: "uppercase", fontWeight: 700 }}>
                      2-MONTH AVG
                    </span>
                    <span className="font-display" style={{ fontSize: 16, fontWeight: 800, color: "#8C6D3B" }}>
                      {ms.twoMonthAvgPct || ms.overallRatePct}%
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ width: "100%", height: 135 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ms.termTrend || ms.perSession} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="termGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8C6D3B" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#8C6D3B" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EAE6DF" />
                    <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 9, fill: "#6B7280" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#6B7280" }} unit="%" />
                    <Tooltip formatter={(v) => [`${v}%`, "Rate"]} labelFormatter={fmtDate} />
                    
                    {/* Highlighted Shaded Area for selected month */}
                    {(() => {
                      const currentSess = (ms.termTrend || []).filter((s) => s.isCurrentMonth);
                      if (currentSess.length === 0) return null;
                      const x1 = currentSess[0].date;
                      const x2 = currentSess[currentSess.length - 1].date;
                      return (
                        <ReferenceArea
                          x1={x1}
                          x2={x2}
                          y1={0}
                          y2={100}
                          fill="#F2DF74"
                          fillOpacity={0.22}
                          stroke="#8C6D3B"
                          strokeOpacity={0.35}
                          strokeDasharray="3 3"
                        />
                      );
                    })()}

                    <Area type="monotone" dataKey="pct" stroke="#8C6D3B" strokeWidth={2.5} fill="url(#termGrad)" dot={{ r: 4, fill: "#8C6D3B" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* E. Row 4 Dark Navy Footer Summary Panel (#1B2430) */}
          <div style={{
            background: "#1B2430",
            borderRadius: 10,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#FFFFFF",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{
                background: "#004165",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 10,
                fontWeight: 800,
                color: "#FFFFFF",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}>
                {getMonthLabel(selectedMonth).slice(0, 3).toUpperCase()} ATTENDANCE SUMMARY
              </div>

              <div style={{ display: "flex", gap: 18, fontSize: 11 }}>
                <div>
                  <span className="font-display" style={{ fontSize: 15, fontWeight: 800, color: "#FFFFFF" }}>{ms.overallRatePct}%</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", display: "block", textTransform: "uppercase" }}>ATTENDANCE RATE</span>
                </div>
                <div>
                  <span className="font-display" style={{ fontSize: 15, fontWeight: 800, color: "#FFFFFF" }}>{avgPerMeeting}</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", display: "block", textTransform: "uppercase" }}>AVG / MEETING</span>
                </div>
                <div>
                  <span className="font-display" style={{ fontSize: 15, fontWeight: 800, color: "#FFFFFF" }}>{ms.highestWeek}</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", display: "block", textTransform: "uppercase" }}>HIGHEST WEEK</span>
                </div>
                <div>
                  <span className="font-display" style={{ fontSize: 15, fontWeight: 800, color: "#FFFFFF" }}>{ms.lowestWeek}</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", display: "block", textTransform: "uppercase" }}>LOWEST WEEK</span>
                </div>
                <div>
                  <span className="font-display" style={{ fontSize: 15, fontWeight: 800, color: "#F2DF74" }}>{ms.ecRatePct}%</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", display: "block", textTransform: "uppercase" }}>EC ({ms.ecCount})</span>
                </div>
                <div>
                  <span className="font-display" style={{ fontSize: 15, fontWeight: 800, color: "#FFFFFF" }}>{ms.genRatePct}%</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", display: "block", textTransform: "uppercase" }}>GENERAL ({ms.genCount})</span>
                </div>
              </div>
            </div>

            {/* Right Quote Callout */}
            <div style={{
              background: "rgba(255,255,255,0.08)",
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 10.5,
              color: "#F2DF74",
              fontStyle: "italic",
              display: "flex",
              alignItems: "center",
              gap: 6,
              border: "1px solid rgba(255,255,255,0.12)",
            }}>
              <Star size={12} fill="#F2DF74" color="#F2DF74" />
              <span>"Every meeting counts. Let's make attendance stronger."</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
