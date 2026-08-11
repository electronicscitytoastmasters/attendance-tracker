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
  viewTermKey,
  archiveIndex,
  onSelectTerm,
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
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3 }}>
              <p className="font-mono" style={{
                fontSize: 11,
                color: COLORS.TM_GOLD,
                margin: 0,
                fontWeight: 600,
                letterSpacing: "0.06em",
              }}>
                ATTENDANCE TRACKER
              </p>

              {/* Term Selector Pill */}
              {term && (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <select
                    value={viewTermKey || "active"}
                    onChange={(e) => onSelectTerm && onSelectTerm(e.target.value)}
                    style={{
                      background: viewTermKey && viewTermKey !== "active" ? "#F59E0B" : "rgba(255,255,255,0.18)",
                      color: "white",
                      border: "1px solid rgba(255,255,255,0.3)",
                      borderRadius: 14,
                      padding: "2px 10px 2px 24px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      outline: "none",
                      appearance: "none",
                      WebkitAppearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 8px center",
                      paddingRight: 22,
                    }}
                  >
                    <option value="active" style={{ color: "#0F172A", fontWeight: 700 }}>
                      🗓️ {term.label} (Active)
                    </option>
                    {(archiveIndex || []).map((t) => (
                      <option key={t.start} value={t.start} style={{ color: "#0F172A", fontWeight: 600 }}>
                        🕒 {t.label} (Archived)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
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
