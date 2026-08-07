/**
 * FileSetup.jsx — First-run UI for excel mode
 *
 * Shown when MODE="excel" and no file handle is available.
 * The user picks or creates their attendance Excel file once;
 * subsequent page loads auto-reconnect via IndexedDB.
 */

import React, { useState } from "react";
import { pickFile, MODE } from "./storage.js";

const INK       = "#1B2430";
const INK_MUTED = "#5B6472";
const PAPER     = "#EFEDE3";
const LINE      = "#D9D2C0";
const BRASS     = "#9C7A2E";

export default function FileSetup({ onReady }) {
  const [status, setStatus] = useState("idle"); // "idle" | "working" | "error"
  const [errMsg, setErrMsg] = useState("");

  if (MODE !== "excel") return null;

  const HAS_FS_API = "showOpenFilePicker" in window;

  const connect = async (createNew) => {
    setStatus("working");
    setErrMsg("");
    const ok = await pickFile(createNew);
    if (ok) {
      onReady();
    } else {
      setStatus("error");
      setErrMsg(createNew
        ? "Couldn't create the file. Please try again."
        : "Couldn't open the file. Make sure it's a valid .xlsx file.");
    }
  };

  return (
    <div style={{
      minHeight: "100svh", display: "flex", alignItems: "center",
      justifyContent: "center", background: PAPER, padding: 24,
      fontFamily: "Inter, sans-serif",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap');`}</style>

      <div style={{
        maxWidth: 420, width: "100%", borderRadius: 16,
        background: "white", border: `1px solid ${LINE}`,
        padding: "36px 32px", textAlign: "center",
        boxShadow: "0 4px 24px rgba(27,36,48,0.08)",
      }}>
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: "#F7F5EC", border: `1px solid ${LINE}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, margin: "0 auto 20px",
        }}>
          📊
        </div>

        <h1 style={{
          fontFamily: "Fraunces, serif", fontSize: 22,
          color: INK, marginBottom: 10, lineHeight: 1.2,
        }}>
          Connect your data file
        </h1>

        <p style={{ fontSize: 14, color: INK_MUTED, lineHeight: 1.6, marginBottom: 28 }}>
          Attendance data is stored in a local Excel workbook that you control —
          it auto-saves every time you make a change.
          Choose an existing file or create a new one.
        </p>

        {!HAS_FS_API ? (
          <div style={{
            fontSize: 13, color: "#9C4A32", padding: "14px 16px",
            background: "#FDF3F0", borderRadius: 10, border: "1px solid #F0C8BC",
            textAlign: "left", lineHeight: 1.6,
          }}>
            <strong>Browser not supported.</strong><br />
            Please open this app in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>
            to use local file storage, or switch to Google Sheets mode in <code>src/storage.js</code>.
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              <button
                id="btn-open-file"
                onClick={() => connect(false)}
                disabled={status === "working"}
                style={{
                  padding: "13px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                  background: INK, color: PAPER, border: "none",
                  opacity: status === "working" ? 0.5 : 1,
                  cursor: status === "working" ? "not-allowed" : "pointer",
                  transition: "opacity 0.15s",
                }}
              >
                📂 Open existing file
              </button>

              <button
                id="btn-create-file"
                onClick={() => connect(true)}
                disabled={status === "working"}
                style={{
                  padding: "13px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                  background: PAPER, color: INK, border: `1px solid ${LINE}`,
                  opacity: status === "working" ? 0.5 : 1,
                  cursor: status === "working" ? "not-allowed" : "pointer",
                  transition: "opacity 0.15s",
                }}
              >
                ✨ Create new file
              </button>
            </div>

            {status === "working" && (
              <p style={{ fontSize: 13, color: INK_MUTED, marginBottom: 8 }}>
                Connecting…
              </p>
            )}
            {status === "error" && (
              <p style={{ fontSize: 13, color: "#9C4A32", background: "#FDF3F0",
                padding: "10px 14px", borderRadius: 8, textAlign: "left" }}>
                {errMsg}
              </p>
            )}
          </>
        )}

        <p style={{ fontSize: 12, color: INK_MUTED, marginTop: 24, lineHeight: 1.6 }}>
          After connecting once, the app remembers your file. You may need to
          click <em>"Reconnect"</em> after a browser restart.
        </p>
      </div>
    </div>
  );
}
