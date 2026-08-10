import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ChevronLeft, ChevronRight, Download, Image, Star,
  Users, CalendarDays, TrendingUp, UserCheck, Award,
  BarChart3, Video, MapPin, FileText, AlertCircle,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
  PieChart, Pie, ReferenceArea,
} from "recharts";
import tmLogo from "./ToastmastersLogoColor.png";

// ─── Design tokens ────────────────────────────────────────────────────────────
const INK        = "#1B2430";
const INK_MUTED  = "#5B6472";
const PAPER      = "#EFEDE3";
const PAPER_RAISED = "#F7F5EC";
const BRASS      = "#9C7A2E";
const RUST       = "#9C4A32";
const FOREST     = "#3F6B52";
const TEAL       = "#2E6E8E";
const LINE       = "#D9D2C0";
const AMBER      = "#C67A3C";

// ─── Status helpers ───────────────────────────────────────────────────────────
function getStatus(pct) {
  if (pct === null) return { label: "Not Applicable", color: INK_MUTED, bg: "#F0EEE8", emoji: "⚪" };
  if (pct >= 90)   return { label: "Excellent",        color: FOREST,   bg: "#E4EEE8", emoji: "🟢" };
  if (pct >= 75)   return { label: "Strong",           color: "#4A8B65",bg: "#EBF3EE", emoji: "🟢" };
  if (pct >= 50)   return { label: "Good",             color: BRASS,    bg: "#F5EFDE", emoji: "🟡" };
  if (pct >= 25)   return { label: "Needs Improvement",color: AMBER,    bg: "#F7EDDF", emoji: "🟠" };
  return            { label: "Low Attendance",         color: RUST,     bg: "#F5E5E0", emoji: "🔴" };
}

// ─── Date / month helpers ─────────────────────────────────────────────────────
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function nowIST() { return new Date(Date.now() + IST_OFFSET_MS); }
function toLocalDateStr(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
}
const todayStr = () => toLocalDateStr(nowIST());
function isEligible(member, dateStr) {
  const join = member.joinDate || "2000-01-01";
  const leave = member.leaveDate || null;
  return dateStr >= join && (!leave || dateStr <= leave);
}
const fmtDate = (d) =>
  new Date(d + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
function getMonthLabel(ym) {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTH_NAMES[m-1]} ${y}`;
}
function getWeeklyAttendanceInsight(perSession) {
  if (!perSession || perSession.length === 0) return "";
  const pcts = perSession.map((s) => s.pct);
  const maxPct = Math.max(...pcts);
  const maxWeeks = perSession
    .map((s, idx) => ({ pct: s.pct, weekNum: idx + 1 }))
    .filter((s) => s.pct === maxPct);
  const avgPct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  if (maxWeeks.length === 0) return "";
  const weekText = maxWeeks.map((w) => `Week ${w.weekNum}`).join(" & ");
  return `Attendance peaked at ${maxPct}% in ${weekText} and averaged ${avgPct}% across all sessions.`;
}
function getNextMonthName(ym) {
  const [y, m] = ym.split("-").map(Number);
  return MONTH_NAMES[m % 12];
}

// ─── Responsive hook ──────────────────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w;
}

// ─── Animations ───────────────────────────────────────────────────────────────
const AnimStyle = () => (
  <style>{`
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes countUp {
      from { opacity: 0; transform: scale(0.85); }
      to   { opacity: 1; transform: scale(1); }
    }
    .mr-card {
      animation: fadeUp 0.35s ease both;
      transition: box-shadow 0.2s ease, transform 0.2s ease;
    }
    .mr-card:hover {
      box-shadow: 0 4px 14px rgba(27,36,48,0.08);
      transform: translateY(-1px);
    }
    .mr-kpi { animation: countUp 0.4s ease both; }
    .mr-view { animation: fadeIn 0.25s ease both; }
    .mr-exporting,
    .mr-exporting .mr-card,
    .mr-exporting .mr-kpi,
    .mr-exporting .mr-view {
      animation: none !important;
      transition: none !important;
    }
    .mr-toggle-btn { transition: background 0.2s ease, color 0.2s ease; }
    .mr-export-btn { transition: filter 0.15s ease, transform 0.15s ease; }
    .mr-export-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
    .mr-export-btn:active { transform: translateY(0); }
    .mr-row-hover:hover { background: #F7F5EC !important; }
    .mr-month-btn { transition: background 0.15s ease, color 0.15s ease; }
    .mr-month-btn:hover:not(:disabled) {
      background: ${INK} !important;
      color: ${PAPER} !important;
    }
  `}</style>
);

// ─── Custom donut label ───────────────────────────────────────────────────────
function DonutLabel({ cx, cy, midAngle, outerRadius, value, name }) {
  if (!value) return null;
  const R = Math.PI / 180;
  const radius = outerRadius + 24;
  const x = cx + radius * Math.cos(-midAngle * R);
  const y = cy + radius * Math.sin(-midAngle * R);
  return (
    <text x={x} y={y} fill={INK_MUTED} textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central" style={{ fontSize: 11, fontFamily: "Inter, sans-serif" }}>
      {name} ({value})
    </text>
  );
}

// ─── Stacked bar label ────────────────────────────────────────────────────────
function BarLabel({ x, y, width, height, value }) {
  if (!value || height < 14) return null;
  return (
    <text x={x + width / 2} y={y + height / 2} fill="white" textAnchor="middle"
      dominantBaseline="central" style={{ fontSize: 11, fontWeight: 600, fontFamily: "Inter,sans-serif" }}>
      {value}
    </text>
  );
}

// ─── Branded Header ───────────────────────────────────────────────────────────
function BrandedHeader({ selectedMonth, ms }) {
  return (
    <div style={{
      background: "#004165", borderRadius: "12px", padding: "16px 24px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <img src={tmLogo} alt="Toastmasters International" style={{ height: "48px", width: "auto" }} />
        <div>
          <h1 className="font-display" style={{
            fontSize: "20px", fontWeight: "800", letterSpacing: "0.02em",
            color: "#FFFFFF", margin: 0, lineHeight: 1.2,
          }}>
            ELECTRONICS CITY TOASTMASTERS CLUB
          </h1>
          <p className="font-mono" style={{
            fontSize: "11px", fontWeight: "600", letterSpacing: "0.08em",
            color: "#F2DF74", margin: "4px 0 0 0", lineHeight: 1,
          }}>
            MEMBER ATTENDANCE DASHBOARD — {getMonthLabel(selectedMonth).toUpperCase()}
          </p>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", color: "#FFFFFF", minWidth: 150 }}>
        <div style={{
          background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "20px", padding: "4px 12px", fontSize: "11px", fontWeight: "700",
          letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px",
        }}>
          <CalendarDays size={14} style={{ color: "#F2DF74" }} />
          {ms.meetingsHeld} MEETINGS HELD
        </div>
        <div className="font-mono" style={{ fontSize: "11px", color: "rgba(255,255,255,0.85)", marginTop: "6px", fontWeight: "500", letterSpacing: "0.04em" }}>
          {ms.monthSessions.map(s => fmtDate(s.date)).join("  |  ")}
        </div>
      </div>
    </div>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────────
function KpiCard({ icon, value, label, delay = 0, color, bg }) {
  return (
    <div className="mr-card mr-kpi" style={{
      borderRadius: 10, padding: "16px 10px", background: "white",
      border: `1px solid ${LINE}`, borderTop: `3px solid ${color || INK}`,
      textAlign: "center", animationDelay: `${delay}ms`,
    }}>
      <div style={{
        width: "36px", height: "36px", borderRadius: "50%",
        background: bg || "rgba(27,36,48,0.04)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 8px", color: color || INK,
      }}>{icon}</div>
      <p className="font-display" style={{ fontSize: 26, fontWeight: "700", color: INK, margin: 0, lineHeight: 1.1 }}>{value}</p>
      <p className="font-mono" style={{ fontSize: 9, fontWeight: "600", color: INK_MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 6, marginBottom: 0 }}>{label}</p>
    </div>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
function Card({ children, style = {}, delay = 0, className = "" }) {
  return (
    <div className={`mr-card ${className}`} style={{
      borderRadius: 10, padding: 16, background: "white",
      border: `1px solid ${LINE}`, animationDelay: `${delay}ms`, ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="font-mono" style={{
      fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em",
      color: INK_MUTED, marginBottom: 10,
    }}>
      {children}
    </p>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ icon, title, body }) {
  return (
    <div style={{
      borderRadius: 10, padding: "36px 24px", textAlign: "center",
      background: PAPER_RAISED, border: `1px dashed ${LINE}`, color: INK_MUTED,
      animation: "fadeIn 0.3s ease",
    }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      <p className="font-display" style={{ fontSize: 16, color: INK, marginBottom: 6 }}>{title}</p>
      <p style={{ fontSize: 13, lineHeight: 1.5 }}>{body}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD CANVAS — fixed 1152 px, used for both scaled on-screen & export
// ═══════════════════════════════════════════════════════════════════════════════
const CANVAS_W     = 1152;
const CANVAS_PAD   = 24;
const CANVAS_INNER = CANVAS_W - CANVAS_PAD * 2;           // 1104
const COL3         = Math.floor((CANVAS_INNER - 28) / 3); // 358
const COL2         = Math.floor((CANVAS_INNER - 14) / 2); // 545
const CHART3       = COL3 - 32;                            // 326
const CHART2       = COL2 - 32;                            // 513

function CanvasKpiCard({ icon, value, label, color, bg }) {
  return (
    <div style={{
      borderRadius: 10, padding: "18px 14px", background: "white",
      border: `1px solid ${LINE}`, borderTop: `3px solid ${color}`, textAlign: "center",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%", background: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 10px", color,
      }}>{icon}</div>
      <p className="font-display" style={{ fontSize: 32, fontWeight: "700", color: INK, margin: 0, lineHeight: 1.1 }}>{value}</p>
      <p className="font-mono" style={{ fontSize: 9, fontWeight: "600", color: INK_MUTED, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 8, marginBottom: 0 }}>{label}</p>
    </div>
  );
}

function CanvasSectionLabel({ children }) {
  return (
    <p className="font-mono" style={{
      fontSize: 10, fontWeight: "700", textTransform: "uppercase",
      letterSpacing: "0.08em", color: INK_MUTED,
      margin: "0 0 10px 0",
      borderLeft: `3px solid ${BRASS}`, paddingLeft: 8, lineHeight: 1.4,
    }}>{children}</p>
  );
}

function CanvasCard({ children, style = {} }) {
  return (
    <div style={{
      borderRadius: 10, padding: 16, background: "white",
      border: `1px solid ${LINE}`, display: "flex",
      flexDirection: "column", gap: 12, ...style,
    }}>{children}</div>
  );
}

function DistributionBars({ distribution, totalMembers, meetingsHeld }) {
  const maxCount = Math.max(...distribution.map((x) => x.count), 1);
  const roundedMax = (Math.ceil(maxCount / 5) * 5) || 5;
  const step = roundedMax > 30 ? 10 : roundedMax > 15 ? 5 : 2;
  const ticks = [];
  for (let v = 0; v <= roundedMax; v += step) ticks.push(v);
  const barColors = [FOREST, "#4A8B65", TEAL, BRASS, AMBER, RUST, "#7A2E2E"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, justifyContent: "center" }}>
      {distribution.map((d) => {
        const barPct = d.count > 0 ? (d.count / roundedMax) * 100 : 0;
        const ci = meetingsHeld - d.meetings;
        return (
          <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="font-mono" style={{ fontSize: 10, width: 60, textAlign: "right", color: INK_MUTED, flexShrink: 0 }}>
              {d.label} mtgs
            </span>
            <div style={{ flex: 1, height: 18, borderRadius: 4, overflow: "hidden", background: LINE + "44" }}>
              <div style={{
                width: `${barPct}%`, height: "100%",
                background: barColors[Math.min(ci, barColors.length - 1)],
                borderRadius: 4, transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
              }} />
            </div>
            <span className="font-mono" style={{ fontSize: 10, color: INK_MUTED, width: 64, flexShrink: 0 }}>
              {d.count} ({totalMembers > 0 ? Math.round((d.count / totalMembers) * 100) : 0}%)
            </span>
          </div>
        );
      })}
      <div style={{ marginTop: 4, paddingTop: 6, borderTop: `1px solid ${LINE}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontFamily: "monospace", color: INK_MUTED, padding: "0 2px" }}>
          {ticks.map((t) => <span key={t} style={{ width: 0, overflow: "visible", textAlign: "center" }}>{t}</span>)}
        </div>
        <p className="font-mono" style={{ fontSize: 8, color: INK_MUTED, textTransform: "uppercase", textAlign: "center", margin: "4px 0 0", letterSpacing: "0.05em" }}>
          Number of Members
        </p>
      </div>
    </div>
  );
}

function DashboardCanvas({ selectedMonth, ms, stats }) {
  if (!ms || ms.meetingsHeld === 0) return null;
  return (
    <div style={{
      width: CANVAS_W, background: PAPER, padding: CANVAS_PAD,
      display: "flex", flexDirection: "column", gap: 16,
      fontFamily: "Inter, sans-serif", boxSizing: "border-box",
    }}>
      {/* 1. Header */}
      <BrandedHeader selectedMonth={selectedMonth} ms={ms} />

      {/* 2. KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {[
          { icon: <Users size={20} />,       value: ms.totalMembers,          label: "Total Members",     color: TEAL,   bg: "rgba(46,110,142,0.1)" },
          { icon: <CalendarDays size={20} />, value: ms.meetingsHeld,          label: "Meetings Held",     color: BRASS,  bg: "rgba(156,122,46,0.1)" },
          { icon: <TrendingUp size={20} />,   value: `${ms.overallRate}%`,     label: "Overall Attendance",color: FOREST, bg: "rgba(63,107,82,0.1)"  },
          { icon: <UserCheck size={20} />,    value: ms.membersAttendedOnce,   label: "Attended ≥ 1", color: TEAL,   bg: "rgba(46,110,142,0.1)" },
          { icon: <Award size={20} />,        value: ms.membersWith100.length, label: "100% Attendance",   color: RUST,   bg: "rgba(156,74,50,0.1)"  },
        ].map((k, i) => <CanvasKpiCard key={i} {...k} />)}
      </div>

      {/* 3. Three-column row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {/* Weekly Attendance Trend */}
        <CanvasCard>
          <CanvasSectionLabel>Weekly Attendance Trend</CanvasSectionLabel>
          <LineChart width={CHART3} height={160} data={ms.perSession} margin={{ top: 12, right: 10, left: -25, bottom: 5 }}>
            <CartesianGrid stroke={LINE} strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: INK_MUTED }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: INK_MUTED }} tickFormatter={(v) => `${v}%`} />
            <Line type="monotone" dataKey="pct" stroke={BRASS} strokeWidth={2.5}
              dot={{ r: 4, fill: BRASS, stroke: "white", strokeWidth: 1.5 }}
              label={{ fill: INK, fontSize: 11, fontWeight: 700, position: "top", offset: 8 }} />
          </LineChart>
          <div style={{
            background: "rgba(46,110,142,0.08)", border: "1px solid rgba(46,110,142,0.2)",
            borderRadius: 6, padding: "8px 12px", fontSize: 11, color: INK,
            lineHeight: 1.5, fontWeight: 500, marginTop: "auto",
          }}>
            {getWeeklyAttendanceInsight(ms.perSession)}
          </div>
        </CanvasCard>

        {/* Member Participation Distribution */}
        <CanvasCard>
          <CanvasSectionLabel>Member Participation Distribution</CanvasSectionLabel>
          <DistributionBars distribution={ms.distribution} totalMembers={ms.totalMembers} meetingsHeld={ms.meetingsHeld} />
        </CanvasCard>

        {/* Attendance Mode Donut */}
        <CanvasCard>
          <CanvasSectionLabel>Attendance Mode</CanvasSectionLabel>
          {ms.totalAttended > 0 ? (
            <>
              <div style={{ position: "relative" }}>
                <PieChart width={CHART3} height={175}>
                  <Pie data={[
                    { name: "In-Person", value: ms.totalInPerson },
                    { name: "Online",    value: ms.totalOnline   },
                  ]}
                    cx="50%" cy="50%" innerRadius={44} outerRadius={66}
                    paddingAngle={3} dataKey="value" label={DonutLabel} labelLine={false}
                  >
                    <Cell fill={FOREST} /><Cell fill={TEAL} />
                  </Pie>
                </PieChart>
                <div style={{
                  position: "absolute", top: "50%", left: "50%",
                  transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none",
                }}>
                  <p className="font-display" style={{ fontSize: 22, fontWeight: 800, color: INK, margin: 0, lineHeight: 1 }}>{ms.totalAttended}</p>
                  <p className="font-mono" style={{ fontSize: 8, color: INK_MUTED, textTransform: "uppercase", letterSpacing: "0.04em", margin: "3px 0 0", lineHeight: 1.1 }}>
                    Total<br />Instances
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
                {[
                  { color: FOREST, label: "In-Person", val: ms.totalInPerson },
                  { color: TEAL,   label: "Online",    val: ms.totalOnline   },
                ].map((d) => (
                  <span key={d.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: "inline-block" }} />
                    {d.label}: <strong>{d.val}</strong>
                    <span style={{ color: INK_MUTED }}>({ms.totalAttended > 0 ? Math.round((d.val / ms.totalAttended) * 100) : 0}%)</span>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: INK_MUTED, fontSize: 12, textAlign: "center", padding: "60px 0", margin: 0 }}>No attendance recorded.</p>
          )}
        </CanvasCard>
      </div>

      {/* 4. Two-column row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {/* Weekly Attendance by Mode + Badge */}
        <CanvasCard>
          <CanvasSectionLabel>Weekly Attendance by Mode</CanvasSectionLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <BarChart width={CHART2 - 144} height={155} data={ms.perSession}
                barCategoryGap="28%" margin={{ top: 16, right: 8, left: -20, bottom: 5 }}>
                <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: INK_MUTED }} />
                <YAxis tick={{ fontSize: 10, fill: INK_MUTED }} />
                <Bar dataKey="inPerson" stackId="a" fill={FOREST} name="In-Person" label={<BarLabel />} />
                <Bar dataKey="online"   stackId="a" fill={TEAL}   name="Online"    label={<BarLabel />} radius={[4, 4, 0, 0]} />
              </BarChart>
              <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 6 }}>
                {[{ color: FOREST, label: "In-Person" }, { color: TEAL, label: "Online" }].map((d) => (
                  <span key={d.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: INK_MUTED }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: "inline-block" }} />
                    {d.label}
                  </span>
                ))}
              </div>
            </div>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "16px 12px", background: PAPER_RAISED, border: `1px solid ${LINE}`,
              borderRadius: 10, width: 128, textAlign: "center", flexShrink: 0,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(46,110,142,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <Users size={20} style={{ color: TEAL }} />
              </div>
              <p className="font-mono" style={{ fontSize: 9, color: INK_MUTED, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0, fontWeight: 600, lineHeight: 1.4 }}>
                Total Attendance<br />Instances
              </p>
              <p className="font-display" style={{ fontSize: 32, fontWeight: 800, color: INK, margin: "6px 0 0", lineHeight: 1 }}>{ms.totalAttended}</p>
            </div>
          </div>
        </CanvasCard>

        {/* Attendance Trend (Term to Date) */}
        <CanvasCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <CanvasSectionLabel>Attendance Trend (Term to Date)</CanvasSectionLabel>
              <p className="font-mono" style={{ fontSize: 9, color: INK_MUTED, margin: "-6px 0 10px 8px" }}>
                Shaded area = {getMonthLabel(selectedMonth)}
              </p>
            </div>
            <div style={{ display: "flex", gap: 16, textAlign: "right" }}>
              {ms.prevMonth && (
                <div>
                  <p style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: INK_MUTED, margin: 0 }}>
                    Last Month ({ms.prevMonth.shortLabel})
                  </p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: INK, margin: "2px 0 0" }}>{ms.prevMonth.rate}%</p>
                </div>
              )}
              <div>
                <p style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: INK_MUTED, margin: 0 }}>
                  {ms.nMonthCount}-Month Avg
                </p>
                <p style={{ fontSize: 16, fontWeight: 700, color: BRASS, margin: "2px 0 0" }}>{ms.nMonthAvg}%</p>
              </div>
            </div>
          </div>
          {stats.perSession.length > 0 ? (
            <LineChart width={CHART2} height={130} data={stats.perSession} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid stroke={LINE} strokeDasharray="3 3" />
              {ms.monthSessions.length > 0 && (
                <ReferenceArea
                  x1={ms.monthSessions[0]?.date}
                  x2={ms.monthSessions[ms.monthSessions.length - 1]?.date}
                  fill={BRASS} fillOpacity={0.12} stroke={BRASS} strokeOpacity={0.4} strokeDasharray="4 4"
                />
              )}
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 9, fill: INK_MUTED }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: INK_MUTED }} tickFormatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="pct" stroke={BRASS} strokeWidth={2}
                dot={(props) => {
                  const inMonth = props.payload?.date?.startsWith(selectedMonth);
                  return <circle key={`dot-${props.payload?.date}`}
                    cx={props.cx} cy={props.cy} r={inMonth ? 4 : 2}
                    fill={inMonth ? BRASS : INK_MUTED}
                    stroke={inMonth ? "white" : "none"}
                    strokeWidth={inMonth ? 1.5 : 0}
                  />;
                }}
              />
            </LineChart>
          ) : (
            <p style={{ color: INK_MUTED, fontSize: 12, textAlign: "center", padding: "40px 0", margin: 0 }}>No term trend data.</p>
          )}
        </CanvasCard>
      </div>

      {/* 5. Summary Footer */}
      <div style={{
        background: INK, borderRadius: 10, padding: "16px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6, padding: "10px 14px",
            display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0,
          }}>
            <p className="font-mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", margin: 0, textTransform: "uppercase", color: "rgba(255,255,255,0.65)" }}>
              {MONTH_NAMES[parseInt(selectedMonth.split("-")[1]) - 1].slice(0, 3)} Attendance
            </p>
            <p className="font-display" style={{ fontSize: 13, fontWeight: 800, color: "#F2DF74", margin: "3px 0 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Summary</p>
          </div>
          <div style={{ display: "flex", gap: 28 }}>
            {[
              { label: "Attendance Rate", value: `${ms.overallRate}%`     },
              { label: "Avg / Meeting",   value: ms.avgAttendees          },
              { label: "Highest Week",    value: ms.highestWeekly         },
              { label: "Lowest Week",     value: ms.lowestWeekly          },
              { label: `EC (${ms.ecCount})`,      value: `${ms.ecRate}%` },
              { label: `General (${ms.gnCount})`, value: `${ms.gnRate}%` },
            ].map((item, idx) => (
              <div key={idx}>
                <p className="font-display" style={{ fontSize: 18, fontWeight: 800, color: "white", margin: 0, lineHeight: 1.1 }}>{item.value}</p>
                <p className="font-mono" style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", margin: "3px 0 0", textTransform: "uppercase", letterSpacing: "0.04em" }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#F2DF74", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Star size={18} fill="#004165" color="#004165" />
          </div>
          <p className="font-body" style={{ fontSize: 12, fontWeight: 700, fontStyle: "italic", color: "rgba(255,255,255,0.9)", margin: 0, maxWidth: 220, lineHeight: 1.4 }}>
            "Every meeting counts. Let's make {getNextMonthName(selectedMonth)} even stronger."
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function MonthlyReport({ members, sessions, attByS, stats, term }) {
  const [subView, setSubView]       = useState("dashboard");
  const [exporting, setExporting]   = useState(null);
  const [containerW, setContainerW] = useState(1152);
  const [canvasH, setCanvasH]       = useState(920);
  const dashRef    = useRef(null);
  const leaderRef  = useRef(null);
  const slideRef   = useRef(null);
  const wrapperRef = useRef(null);
  const windowWidth = useWindowWidth();
  const isMobile   = windowWidth < 640;
  const isTablet   = windowWidth < 900;
  const scale      = containerW > 0 ? Math.min(1, containerW / CANVAS_W) : 1;

  // ─── Available months ──────────────────────────────────────────────────────
  const availableMonths = useMemo(() => {
    const today = todayStr();
    const months = new Set(
      sessions.filter((s) => s.date <= today).map((s) => s.date.slice(0, 7))
    );
    return [...months].sort();
  }, [sessions]);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = todayStr();
    const months = [...new Set(
      sessions.filter((s) => s.date <= today).map((s) => s.date.slice(0, 7))
    )].sort();
    return months.length > 0 ? months[months.length - 1] : todayStr().slice(0, 7);
  });

  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth]);

  // ─── Measure container width for CSS scale ────────────────────────────────
  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver(([e]) => setContainerW(e.contentRect.width));
    ro.observe(wrapperRef.current);
    const w = wrapperRef.current.getBoundingClientRect().width;
    if (w > 0) setContainerW(w);
    return () => ro.disconnect();
  }, [subView, selectedMonth]);

  // ─── Measure canvas natural height ────────────────────────────────────────
  useEffect(() => {
    if (!dashRef.current) return;
    const update = () => { if (dashRef.current) setCanvasH(dashRef.current.offsetHeight || 920); };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(dashRef.current);
    return () => ro.disconnect();
  }, [subView, selectedMonth]);

  const monthIdx = availableMonths.indexOf(selectedMonth);
  const canPrev  = monthIdx > 0;
  const canNext  = monthIdx < availableMonths.length - 1;

  // ─── Monthly stats ────────────────────────────────────────────────────────
  const ms = useMemo(() => {
    const today = todayStr();
    const monthSessions = sessions
      .filter((s) => s.date.startsWith(selectedMonth) && s.date <= today)
      .sort((a, b) => a.date.localeCompare(b.date));

    const monthStart = `${selectedMonth}-01`;
    const monthEnd   = `${selectedMonth}-31`;

    const activeMembers = members.filter((m) => {
      if (m.joinDate  && m.joinDate  > monthEnd)   return false;
      if (m.leaveDate && m.leaveDate < monthStart)  return false;
      return true;
    });

    const perMember = activeMembers.map((m) => {
      const applicable = monthSessions.filter((s) => isEligible(m, s.date));
      const attended   = applicable.filter((s) => attByS[s.id]?.[m.id]?.p);
      const inPerson   = attended.filter((s) => attByS[s.id]?.[m.id]?.mode === "in-person");
      const online     = attended.filter((s) => attByS[s.id]?.[m.id]?.mode === "online");
      return {
        id: m.id, name: m.name, ec: m.ec,
        joinDate: m.joinDate, leaveDate: m.leaveDate,
        applicableCount: applicable.length,
        attendedCount:   attended.length,
        inPersonCount:   inPerson.length,
        onlineCount:     online.length,
        pct: applicable.length > 0 ? Math.round((attended.length / applicable.length) * 100) : null,
      };
    });

    const ranked = perMember.filter((m) => m.pct !== null).sort((a, b) => {
      if (b.pct !== a.pct) return b.pct - a.pct;
      if (b.attendedCount !== a.attendedCount) return b.attendedCount - a.attendedCount;
      return a.name.localeCompare(b.name);
    });
    ranked.forEach((m, i) => {
      m.rank = (i === 0) ? 1
        : (m.pct === ranked[i-1].pct && m.attendedCount === ranked[i-1].attendedCount)
          ? ranked[i-1].rank : i + 1;
    });
    const naMembers = perMember.filter((m) => m.pct === null)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((m) => ({ ...m, rank: "—" }));
    const leaderboard = [...ranked, ...naMembers];

    const totalMembers        = activeMembers.length;
    const meetingsHeld        = monthSessions.length;
    const membersWith100      = ranked.filter((m) => m.pct === 100);
    const membersAttendedOnce = perMember.filter((m) => m.attendedCount > 0).length;
    const totalAttendable     = perMember.reduce((s, m) => s + m.applicableCount, 0);
    const totalAttended       = perMember.reduce((s, m) => s + m.attendedCount, 0);
    const overallRate         = totalAttendable > 0 ? Math.round((totalAttended / totalAttendable) * 100) : 0;
    const totalInPerson       = perMember.reduce((s, m) => s + m.inPersonCount, 0);
    const totalOnline         = perMember.reduce((s, m) => s + m.onlineCount, 0);

    const perSession = monthSessions.map((s) => {
      const eligible = activeMembers.filter((m) => isEligible(m, s.date));
      const att = attByS[s.id] || {};
      const present = eligible.filter((m) => att[m.id]?.p).length;
      const inP     = eligible.filter((m) => att[m.id]?.p && att[m.id]?.mode === "in-person").length;
      const onl     = eligible.filter((m) => att[m.id]?.p && att[m.id]?.mode === "online").length;
      const total   = eligible.length || 1;
      return { date: s.date, label: fmtDate(s.date), present, total, inPerson: inP, online: onl,
               pct: Math.round((present / total) * 100) };
    });

    const distribution = [];
    for (let i = meetingsHeld; i >= 0; i--) {
      const count = perMember.filter((m) => m.attendedCount === i && m.applicableCount > 0).length;
      const denomLabel = meetingsHeld > 0 ? `${i}/${meetingsHeld}` : `${i}/0`;
      distribution.push({ label: denomLabel, count, meetings: i });
    }

    const weekly = perSession.map((s) => s.present);
    const avgAttendees  = weekly.length > 0 ? (weekly.reduce((a,b)=>a+b,0)/weekly.length).toFixed(1) : "—";
    const highestWeekly = weekly.length > 0 ? Math.max(...weekly) : "—";
    const lowestWeekly  = weekly.length > 0 ? Math.min(...weekly) : "—";

    const ecM = perMember.filter((m) => m.ec);
    const gnM = perMember.filter((m) => !m.ec);
    const ecRate = ecM.reduce((s,m)=>s+m.applicableCount,0) > 0
      ? Math.round(ecM.reduce((s,m)=>s+m.attendedCount,0)/ecM.reduce((s,m)=>s+m.applicableCount,0)*100) : 0;
    const gnRate = gnM.reduce((s,m)=>s+m.applicableCount,0) > 0
      ? Math.round(gnM.reduce((s,m)=>s+m.attendedCount,0)/gnM.reduce((s,m)=>s+m.applicableCount,0)*100) : 0;

    const newMembers  = members.filter((m) => m.joinDate  && m.joinDate  >= monthStart && m.joinDate  <= monthEnd);
    const leftMembers = members.filter((m) => m.leaveDate && m.leaveDate >= monthStart && m.leaveDate <= monthEnd);

    const prevRates = availableMonths
      .filter((ym) => ym < selectedMonth).slice(-5)
      .map((ym) => {
        const mSess = sessions.filter((s) => s.date.startsWith(ym) && s.date <= today);
        let tAtt = 0, tApp = 0;
        activeMembers.forEach((mb) => {
          const app = mSess.filter((s) => isEligible(mb, s.date));
          tAtt += app.filter((s) => attByS[s.id]?.[mb.id]?.p).length;
          tApp += app.length;
        });
        return { month: ym, label: getMonthLabel(ym),
                 shortLabel: MONTH_NAMES[parseInt(ym.split("-")[1])-1].slice(0,3),
                 rate: tApp > 0 ? Math.round((tAtt/tApp)*100) : 0 };
      });

    const allRates  = [...prevRates.map((r) => r.rate), overallRate];
    const nMonthAvg = allRates.length > 0 ? Math.round(allRates.reduce((a,b)=>a+b,0)/allRates.length) : 0;
    const prevMonth = prevRates[prevRates.length - 1] || null;

    return {
      monthSessions, meetingsHeld, totalMembers, overallRate,
      membersAttendedOnce, membersWith100, totalAttended, totalInPerson, totalOnline,
      perSession, perMember, leaderboard, distribution,
      avgAttendees, highestWeekly, lowestWeekly,
      ecRate, gnRate, ecCount: ecM.length, gnCount: gnM.length,
      newMembers, leftMembers, prevRates, nMonthAvg, nMonthCount: allRates.length, prevMonth,
    };
  }, [selectedMonth, members, sessions, attByS, availableMonths]);

  // ─── Export: Image ────────────────────────────────────────────────────────
  const captureImage = useCallback(async (ref, filename) => {
    if (!ref?.current) return;
    setExporting("image");
    ref.current.classList.add("mr-exporting");
    try {
      const canvas = await html2canvas(ref.current, {
        backgroundColor: PAPER, scale: 2, useCORS: true, logging: false,
      });
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) { console.error("Screenshot failed", e); }
    finally {
      ref.current.classList.remove("mr-exporting");
      setExporting(null);
    }
  }, []);

  // ─── Export: Excel ────────────────────────────────────────────────────────
  const exportExcel = useCallback(() => {
    setExporting("excel");
    const header = ["Rank","Member","Attended","Applicable","Attendance %","Status"];
    const rows = ms.leaderboard.map((m) => [
      m.rank, m.name, m.attendedCount, m.applicableCount,
      m.pct !== null ? `${m.pct}%` : "N/A", getStatus(m.pct).label,
    ]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      [`Electronics City Toastmasters Club — ${getMonthLabel(selectedMonth)} Leaderboard`],
      [`${ms.meetingsHeld} meetings held · ${ms.leaderboard.length} members ranked`],
      [],
      header, ...rows, [],
      ["Legend: 🟢 Excellent (90-100%) · 🟢 Strong (75-89%) · 🟡 Good (50-74%) · 🟠 Needs Improvement (25-49%) · 🔴 Low Attendance (0-24%)"],
      ["Attendance % = Meetings Attended × Applicable Meetings"],
      ["Applicable = meetings held on or after the member's join date"],
    ]);
    ws["!cols"] = [{wch:6},{wch:28},{wch:10},{wch:12},{wch:14},{wch:22}];
    ws["!merges"] = [{s:{r:0,c:0},e:{r:0,c:5}},{s:{r:1,c:0},e:{r:1,c:5}}];
    XLSX.utils.book_append_sheet(wb, ws, "Leaderboard");
    XLSX.writeFile(wb, `leaderboard-${selectedMonth}.xlsx`);
    setExporting(null);
  }, [ms, selectedMonth]);

  // ─── Export: PDF ─────────────────────────────────────────────────────────
  const exportPDF = useCallback(() => {
    setExporting("pdf");
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const month = getMonthLabel(selectedMonth);

      doc.setFillColor(27, 36, 48);
      doc.rect(0, 0, pageW, 28, "F");
      doc.setTextColor(239, 237, 227);
      doc.setFont("helvetica", "bold"); doc.setFontSize(14);
      doc.text("Electronics City Toastmasters Club", pageW / 2, 11, { align: "center" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      doc.text(`Member Attendance Leaderboard — ${month}`, pageW / 2, 18, { align: "center" });
      doc.text(`${ms.meetingsHeld} meetings held · ${ms.leaderboard.length} members ranked`, pageW / 2, 24, { align: "center" });

      doc.setTextColor(27, 36, 48);
      const kpis = [
        { label: "Attendance Rate", value: `${ms.overallRate}%` },
        { label: "Avg per Meeting",  value: ms.avgAttendees },
        { label: "100% Attendance",  value: ms.membersWith100.length },
        { label: "In-Person",        value: ms.totalInPerson },
        { label: "Online",           value: ms.totalOnline },
      ];
      const colW = pageW / kpis.length;
      kpis.forEach((k, i) => {
        const cx = colW * i + colW / 2;
        doc.setFillColor(247, 245, 236);
        doc.roundedRect(colW * i + 2, 31, colW - 4, 14, 2, 2, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(27, 36, 48);
        doc.text(String(k.value), cx, 38, { align: "center" });
        doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(91, 100, 114);
        doc.text(k.label.toUpperCase(), cx, 43, { align: "center" });
      });

      const statusColorMap = {
        "Excellent": [63,107,82], "Strong": [74,139,101], "Good": [156,122,46],
        "Needs Improvement": [198,122,60], "Low Attendance": [156,74,50], "Not Applicable": [91,100,114],
      };
      const tableBody = ms.leaderboard.map((m) => {
        const st = getStatus(m.pct);
        return [
          { content: String(m.rank), styles: { fontStyle: "bold", halign: "center" } },
          { content: m.name + (m.ec ? " *" : ""), styles: { fontStyle: m.pct === 100 ? "bold" : "normal" } },
          { content: String(m.attendedCount), styles: { halign: "center" } },
          { content: String(m.applicableCount), styles: { halign: "center" } },
          { content: m.pct !== null ? `${m.pct}%` : "N/A",
            styles: { halign: "center", fontStyle: "bold",
              textColor: m.pct !== null ? statusColorMap[st.label] || [27,36,48] : [91,100,114] } },
          { content: st.label, styles: { fontSize: 7.5, textColor: statusColorMap[st.label] || [91,100,114] } },
        ];
      });

      autoTable(doc, {
        startY: 50,
        head: [["Rank","Member","Attended","Applicable","Att %","Status"]],
        body: tableBody,
        theme: "grid",
        headStyles: { fillColor: [27,36,48], textColor: [239,237,227], fontSize: 8, fontStyle: "bold", halign: "center" },
        columnStyles: {
          0: { cellWidth: 12, halign: "center" }, 1: { cellWidth: 58 },
          2: { cellWidth: 18, halign: "center" }, 3: { cellWidth: 22, halign: "center" },
          4: { cellWidth: 16, halign: "center" }, 5: { cellWidth: "auto" },
        },
        alternateRowStyles: { fillColor: [247,245,236] },
        styles: { fontSize: 8.5, cellPadding: 2.5, overflow: "linebreak" },
        margin: { left: 10, right: 10 },
        didDrawPage: (data) => {
          const pg = doc.internal.getCurrentPageInfo().pageNumber;
          if (pg > 1) {
            doc.setFillColor(27,36,48); doc.rect(0,0,pageW,12,"F");
            doc.setFont("helvetica","bold"); doc.setFontSize(8); doc.setTextColor(239,237,227);
            doc.text(`ECITY Toastmasters  |  ${month} Leaderboard`, pageW/2, 8, { align: "center" });
          }
          doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.setTextColor(91,100,114);
          doc.text(`Page ${pg}`, pageW-12, doc.internal.pageSize.getHeight()-6, { align: "right" });
        },
      });

      const finalY  = doc.lastAutoTable.finalY + 6;
      const pageH   = doc.internal.pageSize.getHeight();
      const legendY = finalY + 6 > pageH - 30 ? (doc.addPage(), 15) : finalY;
      doc.setFillColor(247,245,236);
      doc.roundedRect(10, legendY, pageW-20, 22, 2, 2, "F");
      doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(91,100,114);
      doc.text("LEGEND", 14, legendY+6);
      doc.setFont("helvetica","normal"); doc.setFontSize(7);
      doc.text("Excellent (90–100%) · Strong (75–89%) · Good (50–74%) · Needs Improvement (25–49%) · Low Attendance (0–24%)", 14, legendY+12);
      doc.setTextColor(27,36,48); doc.setFont("helvetica","italic"); doc.setFontSize(7);
      doc.text("Attendance % = (Meetings Attended / Applicable Meetings) x 100 · Applicable = meetings held on or after the member's join date · * = Exec Committee", 14, legendY+19);

      const blob = doc.output("blob");
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `leaderboard-${selectedMonth}.pdf`;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); URL.revokeObjectURL(url);
    } catch (e) { console.error("PDF export failed", e); }
    finally { setExporting(null); }
  }, [ms, selectedMonth]);

  // ─── Guard: no data ────────────────────────────────────────────────────────
  if (availableMonths.length === 0) {
    return (
      <>
        <AnimStyle />
        <EmptyState icon="📋" title="No sessions yet"
          body="Start your first roll call from the Admin tab. Once a session is closed, the monthly report will appear here." />
      </>
    );
  }

  const monthHasNoSessions = ms.meetingsHeld === 0;

  return (
    <>
      <AnimStyle />
      <div className="mr-view" style={{ display: "flex", flexDirection: "column", gap: 18 }}>

        {/* Month selector */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <button id="month-prev" className="mr-month-btn"
            onClick={() => canPrev && setSelectedMonth(availableMonths[monthIdx-1])}
            disabled={!canPrev}
            style={{
              padding: "7px 11px", borderRadius: 7,
              background: canPrev ? "white" : PAPER_RAISED,
              border: `1px solid ${LINE}`, color: canPrev ? INK : LINE,
              cursor: canPrev ? "pointer" : "default",
              display: "flex", alignItems: "center",
            }}>
            <ChevronLeft size={18} />
          </button>
          <div style={{ textAlign: "center", minWidth: isMobile ? 140 : 200 }}>
            <p className="font-display" style={{ fontSize: isMobile ? 18 : 24, fontWeight: 700, lineHeight: 1.2 }}>
              {getMonthLabel(selectedMonth)}
            </p>
            <p className="font-mono" style={{ fontSize: 10, color: BRASS, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>
              Monthly Report
            </p>
          </div>
          <button id="month-next" className="mr-month-btn"
            onClick={() => canNext && setSelectedMonth(availableMonths[monthIdx+1])}
            disabled={!canNext}
            style={{
              padding: "7px 11px", borderRadius: 7,
              background: canNext ? "white" : PAPER_RAISED,
              border: `1px solid ${LINE}`, color: canNext ? INK : LINE,
              cursor: canNext ? "pointer" : "default",
              display: "flex", alignItems: "center",
            }}>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Pill toggle */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{
            display: "inline-flex", borderRadius: 8, overflow: "hidden",
            border: `1px solid ${LINE}`, background: PAPER_RAISED,
          }}>
            {[
              { id: "dashboard",   label: "📊 Dashboard"   },
              { id: "leaderboard", label: "🏆 Leaderboard" },
            ].map(({ id, label }) => (
              <button key={id} id={`subview-${id}`} className="mr-toggle-btn"
                onClick={() => setSubView(id)}
                style={{
                  padding: isMobile ? "8px 14px" : "9px 24px",
                  fontSize: isMobile ? 12 : 13, fontWeight: 600,
                  background: subView === id ? INK : "transparent",
                  color:      subView === id ? PAPER : INK_MUTED,
                  border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif",
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ══ DASHBOARD VIEW ══ */}
        {subView === "dashboard" && (
          <div className="mr-view" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {monthHasNoSessions ? (
              <EmptyState icon="📅" title={`No sessions in ${getMonthLabel(selectedMonth)}`}
                body="No meetings were held or recorded in this month. Use the month selector to view another month." />
            ) : (
              <>
                {/* Scaled on-screen canvas */}
                <div ref={wrapperRef} style={{ width: "100%", position: "relative", height: canvasH * scale, overflow: "hidden" }}>
                  <div ref={dashRef} style={{
                    position: "absolute", top: 0, left: 0,
                    transformOrigin: "top left",
                    transform: `scale(${scale})`,
                    width: CANVAS_W,
                  }}>
                    <DashboardCanvas selectedMonth={selectedMonth} ms={ms} stats={stats} />
                  </div>
                </div>

                {/* Hidden off-screen canvas for pixel-perfect export */}
                <div style={{ position: "absolute", left: "-9999px", top: 0, width: CANVAS_W, zIndex: -1000 }}>
                  <div ref={slideRef}>
                    <DashboardCanvas selectedMonth={selectedMonth} ms={ms} stats={stats} />
                  </div>
                </div>

                {/* Export button */}
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button id="btn-dashboard-image" className="mr-export-btn"
                    onClick={() => captureImage(slideRef, `dashboard-${selectedMonth}.png`)}
                    disabled={!!exporting}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      fontSize: 13, padding: "10px 22px", borderRadius: 7,
                      fontWeight: 600, background: BRASS, color: "white",
                      border: "none", cursor: exporting ? "wait" : "pointer",
                      opacity: exporting ? 0.7 : 1,
                    }}>
                    <Image size={15} />
                    {exporting === "image" ? "Saving…" : "Download Dashboard Image"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ LEADERBOARD VIEW ══ */}
        {subView === "leaderboard" && (
          <div className="mr-view" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{
              borderRadius: 10, padding: "18px 20px",
              background: `linear-gradient(135deg, ${INK} 60%, #2E3A48 100%)`,
              color: PAPER, display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: 10, boxShadow: "0 4px 16px rgba(27,36,48,0.18)",
            }}>
              <div>
                <p className="font-display" style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700 }}>
                  Member Attendance Leaderboard
                </p>
                <p className="font-mono" style={{ fontSize: 11, color: "#8a9baa", marginTop: 2 }}>
                  {getMonthLabel(selectedMonth)} · {ms.meetingsHeld} meetings · {ms.leaderboard.length} members ranked
                </p>
              </div>
              <div style={{ fontSize: 32 }}>🏆</div>
            </div>

            {monthHasNoSessions ? (
              <EmptyState icon="📅" title={`No sessions in ${getMonthLabel(selectedMonth)}`}
                body="No meetings were held in this month. Select another month using the arrows above." />
            ) : (
              <>
                <div ref={leaderRef}>
                  <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${LINE}`, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                    <table className="font-mono" style={{ fontSize: 13, width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                      <thead>
                        <tr style={{ background: PAPER_RAISED }}>
                          <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, whiteSpace: "nowrap", width: 52, borderBottom: `2px solid ${LINE}` }}>Rank</th>
                          <th className="font-body" style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, borderBottom: `2px solid ${LINE}` }}>Member</th>
                          <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, whiteSpace: "nowrap", borderBottom: `2px solid ${LINE}` }}>Attended</th>
                          <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, whiteSpace: "nowrap", borderBottom: `2px solid ${LINE}` }}>Applicable</th>
                          <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 700, whiteSpace: "nowrap", borderBottom: `2px solid ${LINE}` }}>%</th>
                          <th className="font-body" style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, whiteSpace: "nowrap", borderBottom: `2px solid ${LINE}` }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ms.leaderboard.map((m, i) => {
                          const st = getStatus(m.pct);
                          const isTop = m.pct === 100;
                          const isNA  = m.pct === null;
                          return (
                            <tr key={m.id} className="mr-row-hover" style={{
                              background: isTop ? "#F0F7F2" : i % 2 ? "white" : PAPER,
                              borderBottom: `1px solid ${LINE}`, transition: "background 0.15s ease",
                            }}>
                              <td style={{ padding: "9px 12px", textAlign: "center", fontWeight: 700, fontSize: 14, color: isTop ? FOREST : isNA ? LINE : INK }}>
                                {m.rank}
                              </td>
                              <td className="font-body" style={{ padding: "9px 12px", whiteSpace: "nowrap", fontWeight: isTop ? 600 : 400 }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  {isTop && <span style={{ fontSize: 13 }}>⭐</span>}
                                  {m.name}
                                  {m.ec && <Star size={10} style={{ color: BRASS, flexShrink: 0 }} fill={BRASS} />}
                                </span>
                                {isNA && m.joinDate && (
                                  <span style={{ fontSize: 10, color: INK_MUTED, display: "block" }}>
                                    joined {fmtDate(m.joinDate)}
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: "9px 12px", textAlign: "center" }}>{m.attendedCount}</td>
                              <td style={{ padding: "9px 12px", textAlign: "center" }}>{m.applicableCount}</td>
                              <td style={{ padding: "9px 12px", textAlign: "center", fontWeight: 700, fontSize: 14, color: st.color }}>
                                {m.pct !== null ? `${m.pct}%` : "N/A"}
                              </td>
                              <td style={{ padding: "9px 12px" }}>
                                <span style={{
                                  display: "inline-flex", alignItems: "center", gap: 4,
                                  padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                                  fontFamily: "Inter, sans-serif",
                                  background: st.bg, color: st.color, border: `1px solid ${st.color}30`,
                                }}>
                                  {st.emoji} {st.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mr-card" style={{
                    marginTop: 10, borderRadius: 10, padding: "12px 16px",
                    background: PAPER_RAISED, border: `1px solid ${LINE}`,
                  }}>
                    <p className="font-mono" style={{ fontSize: 10, textTransform: "uppercase", color: INK_MUTED, marginBottom: 6, letterSpacing: "0.06em" }}>
                      Legend
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 12, color: INK_MUTED, marginBottom: 6 }}>
                      {[
                        { e: "🟢", l: "Excellent (90–100%)" },
                        { e: "🟢", l: "Strong (75–89%)" },
                        { e: "🟡", l: "Good (50–74%)" },
                        { e: "🟠", l: "Needs Improvement (25–49%)" },
                        { e: "🔴", l: "Low Attendance (0–24%)" },
                      ].map((s) => <span key={s.l}>{s.e} {s.l}</span>)}
                    </div>
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${LINE}`, display: "flex", flexDirection: "column", gap: 5, fontSize: 11, color: INK_MUTED, lineHeight: 1.4 }}>
                      <div><span style={{ fontWeight: 600 }}>Attendance Formula:</span> (Meetings Attended / Applicable Meetings) × 100</div>
                      <div><span style={{ fontWeight: 600 }}>Applicable Meetings:</span> Meetings held on or after the member's join date.</div>
                      <div><span style={{ fontWeight: 600 }}>★ Symbol:</span> Exec Committee member.</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: isTablet ? "1fr" : "2fr 1fr", gap: 12, marginTop: 6, marginBottom: 6 }}>
                  <Card>
                    <SectionLabel>⭐ 100% Attendance ({ms.membersWith100.length})</SectionLabel>
                    {ms.membersWith100.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {ms.membersWith100.map((m) => (
                          <span key={m.id} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: "#E4EEE8", color: FOREST, fontWeight: 600, border: "1px solid #C8DDD0" }}>
                            {m.name}{m.ec ? " ★" : ""}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: INK_MUTED }}>No member achieved 100% this month.</p>
                    )}
                  </Card>
                  <Card>
                    <SectionLabel>Membership Changes</SectionLabel>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <p style={{ fontSize: 13 }}>
                        🆕 New: <strong style={{ color: FOREST }}>{ms.newMembers.length}</strong>
                        {ms.newMembers.length > 0 && <span style={{ color: INK_MUTED, fontSize: 11 }}> ({ms.newMembers.map((m) => m.name).join(", ")})</span>}
                      </p>
                      <p style={{ fontSize: 13 }}>
                        👋 Left: <strong style={{ color: RUST }}>{ms.leftMembers.length}</strong>
                        {ms.leftMembers.length > 0 && <span style={{ color: INK_MUTED, fontSize: 11 }}> ({ms.leftMembers.map((m) => m.name).join(", ")})</span>}
                      </p>
                    </div>
                  </Card>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <button id="btn-leaderboard-image" className="mr-export-btn"
                    onClick={() => captureImage(leaderRef, `leaderboard-${selectedMonth}.png`)}
                    disabled={!!exporting}
                    style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, padding: "10px 20px", borderRadius: 7, fontWeight: 600, background: TEAL, color: "white", border: "none", cursor: exporting ? "wait" : "pointer", opacity: exporting ? 0.7 : 1 }}>
                    <Image size={15} /> {exporting === "image" ? "Saving…" : "Image"}
                  </button>
                  <button id="btn-leaderboard-excel" className="mr-export-btn"
                    onClick={exportExcel} disabled={!!exporting}
                    style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, padding: "10px 20px", borderRadius: 7, fontWeight: 600, background: FOREST, color: "white", border: "none", cursor: exporting ? "wait" : "pointer", opacity: exporting ? 0.7 : 1 }}>
                    <Download size={15} /> {exporting === "excel" ? "Saving…" : "Excel"}
                  </button>
                  <button id="btn-leaderboard-pdf" className="mr-export-btn"
                    onClick={exportPDF} disabled={!!exporting}
                    style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, padding: "10px 20px", borderRadius: 7, fontWeight: 600, background: RUST, color: "white", border: "none", cursor: exporting ? "wait" : "pointer", opacity: exporting ? 0.7 : 1 }}>
                    <FileText size={15} /> {exporting === "pdf" ? "Building PDF…" : "PDF"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
