/**
 * AdminGate.jsx — PIN-protected admin access screen
 *
 * Shown when the URL contains #admin.
 * The user must enter the correct PIN (set in config.js) to unlock the admin App.
 * Once unlocked, the session is remembered for the current browser tab only —
 * closing the tab requires the PIN again.
 *
 * Security model:
 *   - Members who access the base URL always see CheckinPage (no admin).
 *   - Knowing the URL "#admin" alone is not enough — the PIN is required.
 *   - The session unlocks only in this tab (sessionStorage, not localStorage).
 *   - A wrong PIN shows an error and clears the input.
 */

import React, { useState, useRef, useEffect } from "react";
import App from "./App.jsx";
import { ADMIN_PIN } from "./config.js";

// ─── Design tokens ────────────────────────────────────────────────────────────
const INK       = "#1B2430";
const INK_MUTED = "#5B6472";
const PAPER     = "#EFEDE3";
const LINE      = "#D9D2C0";
const BRASS     = "#9C7A2E";
const RUST      = "#9C4A32";

// Session storage key — tab-scoped unlock
const SESSION_KEY = "ecat_admin_unlocked";

export default function AdminGate() {
  // Check if already unlocked in this tab session
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "true"
  );
  const [pin,    setPin]    = useState("");
  const [error,  setError]  = useState(false);
  const [shaking, setShaking] = useState(false);

  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  // If already unlocked → render the full admin app immediately
  if (unlocked) return <App />;

  const submit = () => {
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem(SESSION_KEY, "true");
      sessionStorage.setItem("ecat_admin_pin", pin);
      setUnlocked(true);
    } else {
      setError(true);
      setPin("");
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  };

  return (
    <div style={{
      minHeight: "100svh", display: "flex", alignItems: "center",
      justifyContent: "center", background: INK,
      fontFamily: "Inter, sans-serif", padding: 24,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
        .shake { animation: shake 0.45s ease; }
        #admin-pin-input:focus { outline: 2px solid ${BRASS}; outline-offset: 1px; }
      `}</style>

      <div
        className={shaking ? "shake" : ""}
        style={{
          width: "100%", maxWidth: 360, borderRadius: 16,
          background: "#222c38", border: "1px solid #2e3a48",
          padding: "40px 32px", textAlign: "center",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Lock icon */}
        <div style={{
          width: 60, height: 60, borderRadius: 14, margin: "0 auto 20px",
          background: "#1B2430", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 28,
          border: "1px solid #2e3a48",
        }}>
          🔐
        </div>

        <p style={{
          fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
          color: BRASS, fontFamily: "IBM Plex Mono, monospace", marginBottom: 6,
        }}>
          Admin access
        </p>
        <h1 style={{
          fontFamily: "Fraunces, serif", fontSize: 20,
          color: PAPER, marginBottom: 6,
        }}>
          Electronics City Toastmasters
        </h1>
        <p style={{ fontSize: 13, color: INK_MUTED, marginBottom: 28 }}>
          Secretary only — enter your admin PIN
        </p>

        {/* PIN input */}
        <input
          ref={inputRef}
          id="admin-pin-input"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => { setPin(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="••••"
          autoComplete="current-password"
          style={{
            width: "100%", padding: "12px 14px", borderRadius: 10,
            border: `1px solid ${error ? RUST : "#2e3a48"}`,
            background: "#1B2430", color: PAPER,
            fontSize: 24, textAlign: "center", letterSpacing: "0.3em",
            fontFamily: "IBM Plex Mono, monospace",
            boxSizing: "border-box", marginBottom: 10,
            transition: "border-color 0.15s",
          }}
        />

        {/* Error message */}
        <div style={{
          height: 18, marginBottom: 14, fontSize: 12,
          color: RUST, fontWeight: 600,
          opacity: error ? 1 : 0, transition: "opacity 0.15s",
        }}>
          Incorrect PIN — try again
        </div>

        {/* Unlock button */}
        <button
          id="btn-admin-unlock"
          onClick={submit}
          style={{
            width: "100%", padding: "12px 20px", borderRadius: 10,
            background: BRASS, color: "#FFF",
            fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer",
            transition: "opacity 0.15s",
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = "0.88"}
          onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
        >
          Unlock Admin →
        </button>

        <p style={{ fontSize: 12, color: "#3d5066", marginTop: 24 }}>
          This session closes when you close the tab.
        </p>
      </div>
    </div>
  );
}
