/**
 * Header.jsx — Application Header and Navigation bar
 */

import React from "react";
import { Users, BarChart3, Settings2, Download, Calendar, Star, Shield } from "lucide-react";
import { COLORS } from "../constants/theme.js";
import tmLogo from "../ToastmastersLogoColor.png";

export default function Header({
  activeTab,
  setActiveTab,
  members,
  sessions,
  activeSessionId,
  term,
  onExportExcel,
  onOpenArchiveModal,
  storageMode,
  fileName,
}) {
  return (
    <header style={{
      background: COLORS.TM_BLUE,
      borderBottom: `4px solid ${COLORS.BRASS}`,
      color: "white",
      padding: "16px 24px",
      boxShadow: "0 4px 20px rgba(0,65,101,0.15)",
    }}>
      <div style={{
        maxWidth: 1280,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
      }}>
        {/* Logo and title */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img
            src={tmLogo}
            alt="Toastmasters International"
            style={{ height: 44, width: "auto" }}
          />
          <div>
            <h1 className="font-display" style={{
              fontSize: 20,
              fontWeight: 700,
              margin: 0,
              color: "white",
              lineHeight: 1.1,
            }}>
              Electronics City Toastmasters
            </h1>
            <p className="font-mono" style={{
              fontSize: 11,
              color: COLORS.TM_GOLD,
              margin: "3px 0 0 0",
              fontWeight: 600,
              letterSpacing: "0.06em",
            }}>
              ATTENDANCE TRACKER {term ? `• ${term.label}` : ""}
            </p>
          </div>
        </div>

        {/* Navigation tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`app-nav-btn ${activeTab === "matrix" ? "tab-active" : ""}`}
            style={{
              background: activeTab === "matrix" ? "rgba(255,255,255,0.15)" : "transparent",
              border: "none",
              borderRadius: 6,
              color: "white",
              padding: "8px 14px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Users size={16} /> Attendance Matrix
          </button>

          <button
            onClick={() => setActiveTab("report")}
            className={`app-nav-btn ${activeTab === "report" ? "tab-active" : ""}`}
            style={{
              background: activeTab === "report" ? "rgba(255,255,255,0.15)" : "transparent",
              border: "none",
              borderRadius: 6,
              color: "white",
              padding: "8px 14px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <BarChart3 size={16} /> Monthly Dashboard
          </button>

          <button
            onClick={() => setActiveTab("members")}
            className={`app-nav-btn ${activeTab === "members" ? "tab-active" : ""}`}
            style={{
              background: activeTab === "members" ? "rgba(255,255,255,0.15)" : "transparent",
              border: "none",
              borderRadius: 6,
              color: "white",
              padding: "8px 14px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Star size={16} /> Roster ({members.length})
          </button>

          <button
            onClick={() => setActiveTab("sessions")}
            className={`app-nav-btn ${activeTab === "sessions" ? "tab-active" : ""}`}
            style={{
              background: activeTab === "sessions" ? "rgba(255,255,255,0.15)" : "transparent",
              border: "none",
              borderRadius: 6,
              color: "white",
              padding: "8px 14px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Calendar size={16} /> Sessions ({sessions.length})
          </button>

          <button
            onClick={() => setActiveTab("admin")}
            className={`app-nav-btn ${activeTab === "admin" ? "tab-active" : ""}`}
            style={{
              background: activeTab === "admin" ? "rgba(255,255,255,0.15)" : "transparent",
              border: "none",
              borderRadius: 6,
              color: "white",
              padding: "8px 14px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Shield size={16} /> Admin
          </button>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={onExportExcel}
            className="app-button"
            style={{
              background: COLORS.BRASS,
              color: "white",
              border: "none",
              borderRadius: 6,
              padding: "8px 14px",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Download size={14} /> Export Excel
          </button>
        </div>
      </div>
    </header>
  );
}
