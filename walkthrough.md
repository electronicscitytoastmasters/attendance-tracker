# Walkthrough — Attendance Tracker Build

## What Was Built

A complete, production-ready, beautiful attendance tracker for the Electronics City Toastmasters Club. It supports both local Excel file storage and a shared multi-tab Google Sheets backend, featuring a secure routing structure:

- **Base URL** (e.g. `https://yourname.github.io/attendance/`) -> Shows only the **Member Check-in** page. It is safe to share with all members.
- **Admin Path** (e.g. `https://yourname.github.io/attendance/#admin`) -> Directs to a **PIN-protected Admin Panel** for the club secretary.

---

## Files Created & Updated

```
d:\Toastmasters\Ecity\Tools\MemberAttendence\
├── package.json              — Node project + dependencies + deploy script
├── vite.config.js            — Vite + GitHub Pages base path
├── index.html                — HTML entry point with Google Fonts & Lucide icons
├── .gitignore                — Excludes node_modules and build outputs
├── README.md                 — Quick start commands
├── SETUP.md                  — Complete step-by-step setup guide
├── src/
│   ├── main.jsx              — React router (routes based on window.location.hash)
│   ├── index.css             — Global CSS reset
│   ├── config.js             — Configuration file storing the ADMIN_PIN
│   ├── idb.js                — IndexedDB helper (persists local file handle across reloads)
│   ├── storage.js            — Multi-tab storage adapter (local ↔ Excel file ↔ Google Sheets)
│   ├── App.jsx               — Renders full Admin control panel & analytics dashboard
│   ├── FileSetup.jsx         — First-run UI for creating/connecting the local Excel file
│   └── CheckinPage.jsx       — Clean, user-friendly check-in UI for members
└── google-apps-script/
    └── Code.gs               — Multi-tab Apps Script backend (paste into Apps Script editor)
```

---

## Technical & Architecture Highlights

### 1. Multi-Tab Human-Readable Layout
Instead of serializing raw JSON blobs, both the local Excel file and the Google Sheets backend share the exact same 5-tab, human-readable spreadsheet layout:
- **`Config`**: Stores term parameters and active session IDs.
- **`Members`**: Club member roster with join/leave dates and system IDs.
- **`Sessions`**: Pre-calculated Saturday session dates.
- **`Attendance`**: Row-by-row logs of check-ins containing session dates, names, present flags, online/in-person status, and timestamps.
- **`Archive_Index`**: Catalog of past completed terms.
- **`Arch_*`**: Archive tables generated when a term is archived.

### 2. User-Gesture File Persistence (`src/idb.js`)
Chrome/Edge require explicit permission to access files on every session.
- The app stores the chosen `FileSystemFileHandle` inside IndexedDB.
- On refresh, if the browser denies silent re-connection, the member check-in page shows a **Reconnect file** button.
- Clicking the button runs the permission dialog in a user-gesture context, restoring live-sync within one click.

### 3. Secure Hash-Routing Reversal
- Any random navigation or URL correction default-routes to the safe **Check-in** screen.
- Navigating to `#admin` prompts for the club PIN (configured in `src/config.js`), storing the authenticated token in `sessionStorage` (which expires when the browser tab is closed).

---

## Deployment & Setup Guide

| Step | Action | Estimated Time |
|---|---|---|
| 1 | Open [src/config.js](file:///d:/Toastmasters/Ecity/Tools/MemberAttendence/src/config.js) and change `ADMIN_PIN` | 1 min |
| 2 | Open [src/storage.js](file:///d:/Toastmasters/Ecity/Tools/MemberAttendence/src/storage.js) and switch `MODE = "sheets"` | 1 min |
| 3 | Follow Setup Steps 4–5 in [SETUP.md](file:///d:/Toastmasters/Ecity/Tools/MemberAttendence/SETUP.md) for Google Sheets backend | 10 min |
| 4 | Deploy Apps Script as Web App & copy the URL | 5 min |
| 5 | Paste URL in `SHEETS_URL` in [src/storage.js](file:///d:/Toastmasters/Ecity/Tools/MemberAttendence/src/storage.js) | 1 min |
| 6 | Push code to private GitHub repository & run `npm run deploy` | 5 min |
