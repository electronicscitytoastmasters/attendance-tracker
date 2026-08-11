/**
 * App.jsx — Main Application Container (Refactored with Seamless Term Switcher)
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
import { todayStr, termForDate, nextTermOf } from "./utils/dateUtils.js";
import { CheckCircle2, RotateCcw, X } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("matrix");
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [term, setTerm] = useState(null);
  const [attMap, setAttMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // Term Switcher state
  const [viewTermKey, setViewTermKey] = useState("active"); // "active" | archiveKey (start date string)
  const [archiveIndex, setArchiveIndex] = useState([]);
  const [archivedBundle, setArchivedBundle] = useState(null);
  const [autoRolloverBanner, setAutoRolloverBanner] = useState("");

  // ── Data Loader & Auto-Rollover ──────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const data = await getJSON("all");
      const idx = (await getJSON("archiveIndex")) || [];
      setArchiveIndex(idx);

      if (data) {
        let loadedTerm = data.term || termForDate(todayStr());
        let loadedSessions = data.sessions || [];
        let loadedAtt = data.attendance || {};
        let loadedMembers = data.members || [];
        const today = todayStr();

        // Check for Auto Term Rollover when term end date has passed
        if (loadedTerm && loadedTerm.end && today > loadedTerm.end) {
          const nextT = nextTermOf(loadedTerm);
          const archiveKey = loadedTerm.start;
          const bundle = {
            term: loadedTerm,
            sessions: loadedSessions,
            members: loadedMembers,
            attendance: loadedAtt,
          };

          await setJSON(`archive:${archiveKey}`, bundle);

          const newIdxEntry = {
            label: loadedTerm.label,
            start: loadedTerm.start,
            end: loadedTerm.end,
            archived_on: new Date().toISOString(),
          };
          const updatedIdx = [...idx.filter((i) => i.start !== loadedTerm.start), newIdxEntry];
          await setJSON("archiveIndex", updatedIdx);
          setArchiveIndex(updatedIdx);

          // Reset active sessions & att for new term
          loadedSessions = [];
          loadedAtt = {};
          loadedTerm = nextT;

          await setJSON("sessions", []);
          await setJSON("activeSessionId", "");
          await setJSON("term", nextT);

          setAutoRolloverBanner(`🎉 Term boundary reached! Automatically transitioned to ${nextT.label}. Previous term ${bundle.term.label} was safely archived.`);
        }

        setMembers(loadedMembers);
        setSessions(loadedSessions);
        setActiveSessionId(data.activeSessionId || "");
        setTerm(loadedTerm);
        setAttMap(loadedAtt);
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

  // Handle Term Selection from Header Pill
  const handleSelectTerm = async (key) => {
    setViewTermKey(key);
    if (key === "active") {
      setArchivedBundle(null);
    } else {
      const bundle = await getJSON(`archive:${key}`);
      if (bundle) {
        setArchivedBundle(bundle);
      } else {
        alert("Could not load archive data for this term.");
        setViewTermKey("active");
      }
    }
  };

  // View term computed properties
  const isViewingArchived = viewTermKey !== "active" && archivedBundle;
  const viewTerm = isViewingArchived ? archivedBundle.term : term;
  const viewSessions = isViewingArchived ? (archivedBundle.sessions || []) : sessions;
  const viewAttendance = isViewingArchived ? (archivedBundle.attendance || {}) : attMap;

  // Active Session helper (only applies to active term)
  const activeSession = !isViewingArchived && sessions.find((s) => s.id === activeSessionId) ? sessions.find((s) => s.id === activeSessionId) : null;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleToggleAttendance = async (sessionId, memberId, mode) => {
    if (isViewingArchived) {
      // Editing past term attendance
      const currentAtt = viewAttendance[sessionId] || {};
      let updatedAtt = { ...currentAtt };
      if (mode === null) {
        updatedAtt[memberId] = { p: false, t: null, mode: null, m: "archived" };
      } else {
        updatedAtt[memberId] = { p: true, t: new Date().toISOString(), mode, m: "archived" };
      }
      const newAtt = { ...viewAttendance, [sessionId]: updatedAtt };
      const updatedBundle = { ...archivedBundle, attendance: newAtt };
      setArchivedBundle(updatedBundle);
      await setJSON(`archive:${viewTermKey}`, updatedBundle);
      return;
    }

    // Editing active term attendance
    const currentAtt = attMap[sessionId] || {};
    let updatedAtt = { ...currentAtt };

    if (mode === null) {
      updatedAtt[memberId] = { p: false, t: null, mode: null, m: "self" };
    } else {
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
    if (isViewingArchived) {
      const updatedBundle = { ...archivedBundle, sessions: newSessions };
      setArchivedBundle(updatedBundle);
      await setJSON(`archive:${viewTermKey}`, updatedBundle);
      return;
    }
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
    const label = viewTerm?.label?.replace(/[^a-zA-Z0-9]/g, "-") || "export";
    await downloadWorkbook(members, viewSessions, viewAttendance, label);
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

    // Update archiveIndex
    const existingIdx = (await getJSON("archiveIndex")) || [];
    const newIdxEntry = {
      label: currentTerm.label,
      start: currentTerm.start,
      end: currentTerm.end,
      archived_on: new Date().toISOString(),
    };
    const updatedIdx = [...existingIdx.filter((item) => item.start !== currentTerm.start), newIdxEntry];
    await setJSON("archiveIndex", updatedIdx);
    setArchiveIndex(updatedIdx);

    // Reset for next term
    setSessions([]);
    setAttMap({});
    setActiveSessionId("");
    setTerm(nextTerm);
    setViewTermKey("active");

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
        sessions={viewSessions}
        activeSessionId={activeSessionId}
        term={viewTerm}
        viewTermKey={viewTermKey}
        archiveIndex={archiveIndex}
        onSelectTerm={handleSelectTerm}
        onExportExcel={handleExportExcel}
        onOpenArchiveModal={() => setShowArchiveModal(true)}
        storageMode={MODE}
        fileName={getFileName()}
      />

      {/* Auto-Rollover Banner */}
      {autoRolloverBanner && (
        <div style={{
          background: "#FEF3C7",
          borderBottom: "1px solid #F59E0B",
          color: "#92400E",
          padding: "10px 20px",
          fontSize: 13,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={16} color="#D97706" />
            <span>{autoRolloverBanner}</span>
          </div>
          <button
            onClick={() => setAutoRolloverBanner("")}
            style={{ background: "none", border: "none", color: "#92400E", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Viewing Archived Term Banner */}
      {isViewingArchived && (
        <div style={{
          background: "#EFF6FF",
          borderBottom: "1px solid #BFDBFE",
          color: "#1E40AF",
          padding: "8px 20px",
          fontSize: 12,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span>
            🕒 Viewing Archived Term: <strong>{viewTerm.label}</strong>. Any attendance edits will update this term's archive tab.
          </span>
          <button
            onClick={() => handleSelectTerm("active")}
            style={{
              background: "#3B82F6",
              color: "white",
              border: "none",
              borderRadius: 4,
              padding: "3px 10px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Return to Active Term ({term?.label})
          </button>
        </div>
      )}

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
            sessions={viewSessions}
            attMap={viewAttendance}
            onToggleAttendance={handleToggleAttendance}
          />
        )}

        {activeTab === "report" && (
          <MonthlyReport
            members={members}
            sessions={viewSessions}
            attendance={viewAttendance}
            term={viewTerm}
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
            sessions={viewSessions}
            term={viewTerm}
            onSaveSessions={handleSaveSessions}
            onSaveTerm={handleSaveTerm}
            activeSessionId={activeSessionId}
            onStartRollCall={handleStartRollCall}
            onStopRollCall={handleStopRollCall}
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
