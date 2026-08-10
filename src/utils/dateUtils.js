/**
 * dateUtils.js — Centralized IST date and time utilities
 */

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function nowIST() {
  return new Date(Date.now() + IST_OFFSET_MS);
}

export function toLocalDateStr(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayStr() {
  return toLocalDateStr(nowIST());
}

export function fmtDate(dStr) {
  if (!dStr) return "";
  return new Date(dStr + "T00:00:00Z").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function fmtTimeIST(iso) {
  if (!iso) return "";
  const ist = new Date(new Date(iso).getTime() + IST_OFFSET_MS);
  let h = ist.getUTCHours();
  const m = String(ist.getUTCMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm} IST`;
}

export function ymdToDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function isEligible(member, dateStr) {
  if (!member) return false;
  const join = member.joinDate || "2000-01-01";
  const leave = member.leaveDate || null;
  return dateStr >= join && (!leave || dateStr <= leave);
}

export function termForDate(dateStr) {
  const [y, m] = dateStr.split("-").map(Number);
  return m <= 6
    ? { start: `${y}-01-01`, end: `${y}-06-30`, label: `Jan – Jun ${y}` }
    : { start: `${y}-07-01`, end: `${y}-12-31`, label: `Jul – Dec ${y}` };
}

export function nextTermOf(t) {
  const d = ymdToDate(t.end);
  d.setUTCDate(d.getUTCDate() + 1);
  return termForDate(toLocalDateStr(d));
}

export function allSaturdaysInRange(startStr, endStr) {
  const start = ymdToDate(startStr);
  const end = ymdToDate(endStr);
  const d = new Date(start);
  while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
  const out = [];
  while (d <= end) {
    out.push(toLocalDateStr(d));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return out;
}

export function getMonthLabel(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function getNextMonthName(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-").map(Number);
  return MONTH_NAMES[m % 12];
}

export function upcomingSaturdayStr() {
  const today = todayStr();
  const d = ymdToDate(today);
  const day = d.getUTCDay();
  const diff = (6 - day + 7) % 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return toLocalDateStr(d);
}
