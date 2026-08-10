/**
 * theme.js — Centralized Design Tokens & Color Palette
 */

export const COLORS = {
  INK: "#1B2430",
  INK_MUTED: "#5B6472",
  PAPER: "#EFEDE3",
  PAPER_RAISED: "#F7F5EC",
  BRASS: "#9C7A2E",
  RUST: "#9C4A32",
  FOREST: "#3F6B52",
  TEAL: "#2E6E8E",
  LINE: "#D9D2C0",
  AMBER: "#C67A3C",
  TM_BLUE: "#004165",
  TM_RED: "#C8102E",
  TM_GOLD: "#FDBB30",
};

export function getAttendanceStatus(pct) {
  if (pct === null || pct === undefined) {
    return { label: "Not Applicable", color: COLORS.INK_MUTED, bg: "#F0EEE8", emoji: "⚪" };
  }
  if (pct >= 90) return { label: "Excellent", color: COLORS.FOREST, bg: "#E4EEE8", emoji: "🟢" };
  if (pct >= 75) return { label: "Strong", color: "#4A8B65", bg: "#EBF3EE", emoji: "🟢" };
  if (pct >= 50) return { label: "Good", color: COLORS.BRASS, bg: "#F5EFDE", emoji: "🟡" };
  if (pct >= 25) return { label: "Needs Improvement", color: COLORS.AMBER, bg: "#F7EDDF", emoji: "🟠" };
  return { label: "Low Attendance", color: COLORS.RUST, bg: "#F5E5E0", emoji: "🔴" };
}
