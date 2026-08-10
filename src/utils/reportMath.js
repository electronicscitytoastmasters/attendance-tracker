/**
 * reportMath.js — Pure calculation functions for Monthly Reports
 */

import { isEligible, fmtDate, getMonthLabel, todayStr } from "./dateUtils.js";

export function calcMonthlyStats(members, sessions, attendance, ym) {
  if (!ym || !sessions || !members) {
    return {
      meetingsHeld: 0,
      monthSessions: [],
      perSession: [],
      memberStats: [],
      distribution: [],
      membersWith100: [],
      newMembers: [],
      leftMembers: [],
      executiveInsight: "",
    };
  }

  const today = todayStr();

  const monthSessions = sessions
    .filter((s) => s.date.startsWith(ym))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Occurred meetings only
  const occurredMonthSessions = monthSessions.filter((s) => s.date <= today);
  const meetingsHeld = occurredMonthSessions.length;

  // Active members during this month
  const activeMembers = members.filter((m) => {
    const monthStart = `${ym}-01`;
    const monthEnd = `${ym}-31`;
    const join = m.joinDate || "2000-01-01";
    const leave = m.leaveDate || null;
    return join <= monthEnd && (!leave || leave >= monthStart);
  });

  const perSession = occurredMonthSessions.map((sess) => {
    const eligible = activeMembers.filter((m) => isEligible(m, sess.date));
    const attObj = attendance[sess.id] || {};
    let present = 0, inPerson = 0, online = 0;

    eligible.forEach((m) => {
      const rec = attObj[m.id];
      if (rec?.p) {
        present++;
        if (rec.mode === "online") online++;
        else inPerson++;
      }
    });

    const total = eligible.length || 1;
    const pct = Math.round((present / total) * 100);
    return {
      id: sess.id,
      date: sess.date,
      label: sess.label,
      present,
      total,
      pct,
      inPerson,
      online,
    };
  });

  const memberStats = activeMembers.map((m) => {
    // Applicable meetings = occurred meetings on or after join date & before leave date
    const eligibleSess = occurredMonthSessions.filter((s) => isEligible(m, s.date));
    let attendedCount = 0, inPerson = 0, online = 0;

    eligibleSess.forEach((s) => {
      const rec = attendance[s.id]?.[m.id];
      if (rec?.p) {
        attendedCount++;
        if (rec.mode === "online") online++;
        else inPerson++;
      }
    });

    const applicableCount = eligibleSess.length;
    const pct = applicableCount > 0 ? Math.round((attendedCount / applicableCount) * 100) : null;
    return {
      member: m,
      id: m.id,
      name: m.name,
      ec: m.ec,
      joinDate: m.joinDate,
      leaveDate: m.leaveDate,
      attendedCount,
      applicableCount,
      pct,
      inPerson,
      online,
    };
  });

  const totalPossible = perSession.reduce((sum, s) => sum + s.total, 0);
  const totalActual = perSession.reduce((sum, s) => sum + s.present, 0);
  const overallRatePct = totalPossible > 0 ? Math.round((totalActual / totalPossible) * 100) : 0;

  const totalInPerson = perSession.reduce((sum, s) => sum + s.inPerson, 0);
  const totalOnline = perSession.reduce((sum, s) => sum + s.online, 0);

  const inPersonRatePct = totalPossible > 0 ? Math.round((totalInPerson / totalPossible) * 100) : 0;
  const onlineRatePct = totalPossible > 0 ? Math.round((totalOnline / totalPossible) * 100) : 0;

  const avgAttendancePct = perSession.length > 0
    ? Math.round(perSession.reduce((acc, s) => acc + s.pct, 0) / perSession.length)
    : 0;

  const distribution = Array.from({ length: meetingsHeld + 1 }, (_, i) => {
    const count = memberStats.filter((ms) => ms.attendedCount === i).length;
    return { meetings: i, label: `${i}/${meetingsHeld}`, count };
  });

  const membersWith100 = memberStats.filter((ms) => ms.pct === 100).map((ms) => ms.member);
  const newMembers = activeMembers.filter((m) => m.joinDate && m.joinDate.startsWith(ym));
  const leftMembers = members.filter((m) => m.leaveDate && m.leaveDate.startsWith(ym));

  const attendedAtLeastOne = memberStats.filter((m) => m.attendedCount >= 1).length;
  const highestWeek = perSession.length > 0 ? Math.max(...perSession.map((s) => s.present)) : 0;
  const lowestWeek = perSession.length > 0 ? Math.min(...perSession.map((s) => s.present)) : 0;

  const ecMembers = memberStats.filter((m) => m.ec);
  const genMembers = memberStats.filter((m) => !m.ec);

  const ecAttended = ecMembers.reduce((sum, m) => sum + m.attendedCount, 0);
  const ecApplicable = ecMembers.reduce((sum, m) => sum + m.applicableCount, 0);
  const ecRatePct = ecApplicable > 0 ? Math.round((ecAttended / ecApplicable) * 100) : 0;

  const genAttended = genMembers.reduce((sum, m) => sum + m.attendedCount, 0);
  const genApplicable = genMembers.reduce((sum, m) => sum + m.applicableCount, 0);
  const genRatePct = genApplicable > 0 ? Math.round((genAttended / genApplicable) * 100) : 0;

  // Term-to-date trend across all occurred sessions
  const occurredTermSessions = sessions
    .filter((s) => s.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const termTrend = occurredTermSessions.map((sess) => {
    const eligible = members.filter((m) => isEligible(m, sess.date));
    const attObj = attendance[sess.id] || {};
    let present = 0;
    eligible.forEach((m) => {
      if (attObj[m.id]?.p) present++;
    });
    const total = eligible.length || 1;
    const pct = Math.round((present / total) * 100);
    return {
      id: sess.id,
      date: sess.date,
      label: sess.label,
      present,
      total,
      pct,
      isCurrentMonth: sess.date.startsWith(ym),
    };
  });

  // Calculate previous month & 2-month average stats
  const [yearStr, monthStr] = ym.split("-");
  const yearNum = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);
  const prevMonthNum = monthNum === 1 ? 12 : monthNum - 1;
  const prevYearNum = monthNum === 1 ? yearNum - 1 : yearNum;
  const prevYm = `${prevYearNum}-${String(prevMonthNum).padStart(2, "0")}`;
  const prevMonthLabel = getMonthLabel(prevYm).slice(0, 3).toUpperCase();

  const prevMonthSessions = termTrend.filter((s) => s.date.startsWith(prevYm));
  const prevMonthRatePct = prevMonthSessions.length > 0
    ? Math.round(prevMonthSessions.reduce((sum, s) => sum + s.pct, 0) / prevMonthSessions.length)
    : overallRatePct;

  const currentAndPrevSessions = termTrend.filter((s) => s.date.startsWith(ym) || s.date.startsWith(prevYm));
  const twoMonthAvgPct = currentAndPrevSessions.length > 0
    ? Math.round(currentAndPrevSessions.reduce((sum, s) => sum + s.pct, 0) / currentAndPrevSessions.length)
    : overallRatePct;

  const executiveInsight = getWeeklyAttendanceInsight(perSession);

  return {
    meetingsHeld,
    monthSessions: occurredMonthSessions,
    totalMembers: activeMembers.length,
    perSession,
    memberStats,
    avgAttendancePct,
    overallRatePct,
    inPersonRatePct,
    onlineRatePct,
    totalInPerson,
    totalOnline,
    totalInstances: totalInPerson + totalOnline,
    attendedAtLeastOne,
    highestWeek,
    lowestWeek,
    ecCount: ecMembers.length,
    ecRatePct,
    genCount: genMembers.length,
    genRatePct,
    termTrend,
    prevMonthLabel,
    lastMonthRatePct: prevMonthRatePct,
    twoMonthAvgPct,
    distribution,
    membersWith100,
    newMembers,
    leftMembers,
    executiveInsight,
  };
}

export function getWeeklyAttendanceInsight(perSession) {
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
