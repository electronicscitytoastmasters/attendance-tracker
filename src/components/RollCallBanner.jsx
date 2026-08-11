/**
 * RollCallBanner.jsx — Active roll call status and QR code controls
 */

import React, { useState } from "react";
import { QrCode, UserCheck, X } from "lucide-react";
import { COLORS } from "../constants/theme.js";
import { fmtDate } from "../utils/dateUtils.js";

export default function RollCallBanner({
  activeSession,
  onStartRollCall,
  onStopRollCall,
  sessions,
}) {
  const [showQR, setShowQR] = useState(false);
  const checkinUrl = `${window.location.origin}${window.location.pathname}#checkin`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(checkinUrl)}`;

  if (!activeSession) return null;

  return (
    <div style={{
      background: activeSession ? "#EAF4EE" : COLORS.PAPER_RAISED,
      borderBottom: `1px solid ${COLORS.LINE}`,
      padding: "12px 24px",
    }}>
      <div style={{
        maxWidth: 1280,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
      }}>
        {activeSession ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: COLORS.FOREST,
              boxShadow: `0 0 0 4px rgba(63,107,82,0.2)`,
            }} />
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: COLORS.INK }}>
                Roll Call OPEN for {activeSession.label} ({fmtDate(activeSession.date)})
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: COLORS.INK_MUTED }}>
                Members can check in at: <code className="font-mono">{checkinUrl}</code>
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <UserCheck size={18} style={{ color: COLORS.INK_MUTED }} />
            <p style={{ margin: 0, fontSize: 13, color: COLORS.INK_MUTED }}>
              No active roll call session. Select a Saturday session to open roll call for member check-in.
            </p>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {activeSession ? (
            <>
              <button
                onClick={() => setShowQR(true)}
                className="app-button"
                style={{
                  background: COLORS.TEAL,
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <QrCode size={14} /> Show QR Code
              </button>

              <button
                onClick={onStopRollCall}
                className="app-button"
                style={{
                  background: COLORS.RUST,
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Stop Roll Call
              </button>
            </>
          ) : (
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onStartRollCall(e.target.value);
                  e.target.value = "";
                }
              }}
              defaultValue=""
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: `1px solid ${COLORS.LINE}`,
                background: "white",
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.INK,
                cursor: "pointer",
              }}
            >
              <option value="" disabled>Start Roll Call for session...</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({fmtDate(s.date)})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(27,36,48,0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 20,
        }}>
          <div style={{
            background: "white",
            borderRadius: 16,
            padding: 32,
            maxWidth: 380,
            width: "100%",
            textAlign: "center",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
            position: "relative",
          }}>
            <button
              onClick={() => setShowQR(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: COLORS.INK_MUTED,
              }}
            >
              <X size={20} />
            </button>

            <h3 className="font-display" style={{ margin: "0 0 6px", fontSize: 20, color: COLORS.INK }}>
              Scan to Check In
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: COLORS.INK_MUTED }}>
              {activeSession?.label}
            </p>

            <img
              src={qrImageUrl}
              alt="Check-in QR Code"
              style={{ width: 220, height: 220, borderRadius: 8, border: `1px solid ${COLORS.LINE}` }}
            />

            <p className="font-mono" style={{ margin: "16px 0 0", fontSize: 11, color: COLORS.INK_MUTED, wordBreak: "break-all" }}>
              {checkinUrl}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
