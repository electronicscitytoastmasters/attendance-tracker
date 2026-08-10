/**
 * App.jsx — Main Application Container (Refactored & Modularized)
 */

import React, { useState, useEffect, useCallback } from "react";
import { getJSON, setJSON, MODE, getFileName } from "./storage.js";
import Header from "./components/Header.jsx";
import RollCallBanner from "./components/RollCallBanner.jsx";
import AttendanceMatrix from "./components/AttendanceMatrix.jsx";
import MemberManagement from "./components/MemberManagement.jsx";
import SessionManagement from "./components/SessionManagement.jsx";
import AdminTab from "./components/AdminTab.jsx";
import ArchiveModal from "./components/ArchiveModal.jsx";
import MonthlyReport from "./MonthlyReport.jsx";
import { downloadWorkbook } from "./utils/exportUtils.js";
import { COLORS } from "./constants/theme.js";

export default function App() {
  const [activeTab, setActiveTab] = useState("matrix");
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [term, setTerm] = useState(null);
  const [attMap, setAttMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // ── Data Loader ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const data = await getJSON("all");
      if (data) {
        setMembers(data.members || []);
        setSessions(data.sessions || []);
        setActiveSessionId(data.activeSessionId || "");
        setTerm(data.term || null);
        setAttMap(data.attendance || {});
      }
    } catch (e) {
      console.error("App: loadData failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Active Session helper
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleToggleAttendance = async (sessionId, memberId, mode) => {
    const currentAtt = attMap[sessionId] || {};
    let updatedAtt = { ...currentAtt };

    if (mode === null) {
      // Mark absent
      updatedAtt[memberId] = { p: false, t: null, mode: null, m: "self" };
    } else {
      // Mark present with mode
      updatedAtt[memberId] = {
        p: true,
        t: new Date().toISOString(),
        mode: mode,
        m: "self",
      };
    }

    const newMap = { ...attMap, [sessionId]: updatedAtt };
    setAttMap(newMap);
    await setJSON(`att:${sessionId}`, updatedAtt);
  };

  const handleSaveMembers = async (newMembers) => {
    setMembers(newMembers);
    await setJSON("members", newMembers);
  };

  const handleSaveSessions = async (newSessions) => {
    setSessions(newSessions);
    await setJSON("sessions", newSessions);
  };

  const handleSaveTerm = async (newTerm) => {
    setTerm(newTerm);
    await setJSON("term", newTerm);
  };

  const handleStartRollCall = async (sessionId) => {
    setActiveSessionId(sessionId);
    await setJSON("activeSessionId", sessionId);
  };

  const handleStopRollCall = async () => {
    setActiveSessionId("");
    await setJSON("activeSessionId", "");
  };

  const handleExportExcel = async () => {
    const label = term?.label?.replace(/[^a-zA-Z0-9]/g, "-") || "export";
    await downloadWorkbook(members, sessions, attMap, label);
  };

  const handleArchiveTerm = async (currentTerm, nextTerm) => {
    const archiveKey = currentTerm.start;
    const bundle = {
      term: currentTerm,
      sessions,
      members,
      attendance: attMap,
    };

    await setJSON(`archive:${archiveKey}`, bundle);

    // Reset for next term
    setSessions([]);
    setAttMap({});
    setActiveSessionId("");
    setTerm(nextTerm);

    await setJSON("sessions", []);
    await setJSON("activeSessionId", "");
    await setJSON("term", nextTerm);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: COLORS.PAPER,
        fontFamily: "Inter, sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: COLORS.INK_MUTED, fontSize: 14 }}>Loading Attendance Tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.PAPER, color: COLORS.INK, fontFamily: "Inter, sans-serif" }}>
      {/* App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        members={members}
        sessions={sessions}
        activeSessionId={activeSessionId}
        term={term}
        onExportExcel={handleExportExcel}
        onOpenArchiveModal={() => setShowArchiveModal(true)}
        storageMode={MODE}
        fileName={getFileName()}
      />

      {/* Active Roll Call Banner */}
      <RollCallBanner
        activeSession={activeSession}
        onStartRollCall={handleStartRollCall}
        onStopRollCall={handleStopRollCall}
        sessions={sessions}
      />

      {/* Main Tab Views */}
      <main style={{ paddingBottom: 40 }}>
        {activeTab === "matrix" && (
          <AttendanceMatrix
            members={members}
            sessions={sessions}
            attMap={attMap}
            onToggleAttendance={handleToggleAttendance}
          />
        )}

        {activeTab === "report" && (
          <MonthlyReport
            members={members}
            sessions={sessions}
            attendance={attMap}
            term={term}
          />
        )}

        {activeTab === "members" && (
          <MemberManagement
            members={members}
            onSaveMembers={handleSaveMembers}
          />
        )}

        {activeTab === "sessions" && (
          <SessionManagement
            sessions={sessions}
            term={term}
            onSaveSessions={handleSaveSessions}
            onSaveTerm={handleSaveTerm}
          />
        )}

        {activeTab === "admin" && (
          <AdminTab
            term={term}
            sessions={sessions}
            members={members}
            activeSessionId={activeSessionId}
            attendance={attMap}
            onStartRollCall={handleStartRollCall}
            onStopRollCall={handleStopRollCall}
            onOpenArchiveModal={() => setShowArchiveModal(true)}
            onSaveSessions={handleSaveSessions}
            onToggleAttendance={handleToggleAttendance}
            onExportExcel={handleExportExcel}
          />
        )}
      </main>

      {/* End-of-Term Archive Modal */}
      <ArchiveModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        term={term}
        sessions={sessions}
        members={members}
        attendanceMap={attMap}
        onArchiveTerm={handleArchiveTerm}
      />
    </div>
  );
}
