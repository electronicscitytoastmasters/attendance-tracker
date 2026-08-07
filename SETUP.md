# Setup Guide — Electronics City Toastmasters Attendance Tracker

## What You're Building

```
Members scan QR / open link
        ↓
React app on GitHub Pages (free)
        ↓
Google Apps Script Web App
        ↓
Google Sheet (your data, always backed up)
```

---

## Step 1 — Install Node.js (one time)

1. Go to **https://nodejs.org** and download the **LTS** version
2. Run the installer — accept all defaults
3. After installation, open a **new** PowerShell window and verify:
   ```
   node --version   # should print v20.x.x or similar
   npm --version    # should print 10.x.x or similar
   ```

---

## Step 2 — Install project dependencies

Open PowerShell and run:

```powershell
cd "d:\Toastmasters\Ecity\Tools\MemberAttendence"
npm install
```

This installs React, Vite, the Excel library, chart library, and icons.

---

## Step 3 — Run locally (test before publishing)

```powershell
npm run dev
```

Open your browser to **http://localhost:5173/attendance/**

You should see the full attendance tracker. Try:
- Admin tab → Add a few member names → click "Add members"
- Admin tab → "Open this Saturday's roll call"  
- Check-in tab → tap a member's name → In-Person or Online
- Dashboard tab → see the live count

> Data is saved in your browser's localStorage at this stage.  
> Once you switch to Google Sheets mode (Step 5), data will be shared across devices.

---

## Step 4 — Set up Google Sheets backend

### 4a. Create the Google Sheet

1. Go to **https://sheets.new** — this creates a new Google Sheet
2. Name it **"Ecity Toastmasters Attendance"** (top-left, click "Untitled")
3. Leave it empty — the Apps Script will create the "KV" tab automatically

### 4b. Open Apps Script editor

1. In your Google Sheet, click **Extensions → Apps Script**
2. A new tab opens with a code editor

### 4c. Paste the backend code

1. Delete everything in the editor (Ctrl+A, Delete)
2. Open the file: `google-apps-script\Code.gs` in your project folder
3. Copy its entire contents and paste into the Apps Script editor
4. Click **Save** (floppy disk icon or Ctrl+S)
5. Name the project **"Attendance Tracker"** when prompted

### 4d. Deploy as Web App

1. Click **Deploy → New deployment**
2. Click the gear icon ⚙ next to "Select type" → choose **Web app**
3. Fill in:
   - Description: `Attendance Tracker v1`
   - **Execute as**: `Me` (your Google account)
   - **Who has access**: `Anyone` ← **important** — this lets the React app call it
4. Click **Deploy**
5. Click **Authorize access** → choose your Google account → click **Allow**
6. Copy the **Web app URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```
   Keep this URL safe — you'll need it in the next step.

### 4e. Test the Web App

Open the Web App URL in your browser. You should see:
```json
{"status":"ok","timestamp":"2026-..."}
```
If you see that, the backend is working! ✅

---

## Step 5 — Connect React app to Google Sheets

Open the file `src\storage.js` and make two changes:

```js
// Line 15: Change "local" to "sheets"
const MODE = "sheets";

// Line 16: Paste your Web App URL from Step 4d
const SHEETS_URL = "https://script.google.com/macros/s/YOUR_ID_HERE/exec";
```

Save the file, then test again with `npm run dev`. Now data goes to Google Sheets!

Open your Google Sheet — you'll see a new tab called **KV** with your data rows.

---

## Step 6 — Create GitHub repository

1. Go to **https://github.com/new**
2. Repository name: `attendance` (or anything you like)
3. Set to **Public** (required for free GitHub Pages)
4. Click **Create repository**
5. Copy the repository URL — it looks like:
   ```
   https://github.com/YOURUSERNAME/attendance.git
   ```

### 6a. Update vite.config.js

Open `vite.config.js` and update the base to match your repo name:
```js
base: '/attendance/',   // replace 'attendance' with your actual repo name
```

### 6b. Update package.json homepage

Open `package.json`, find the `"scripts"` section, and note the deploy script is already there.

---

## Step 7 — Push to GitHub and deploy

Open PowerShell in your project folder:

```powershell
# Initialize git
git init
git add .
git commit -m "Initial commit — Ecity attendance tracker"

# Link to your GitHub repo (paste your URL from Step 6)
git remote add origin https://github.com/YOURUSERNAME/attendance.git
git branch -M main
git push -u origin main

# Deploy to GitHub Pages
npm run deploy
```

The `npm run deploy` command builds the app and publishes it to GitHub Pages.

### 7a. Enable GitHub Pages

1. Go to your GitHub repo → **Settings → Pages**
2. Under "Branch", select `gh-pages` → `/root`
3. Click **Save**

After 1–2 minutes, your site is live at:
```
https://YOURUSERNAME.github.io/attendance/
```

---

## Step 8 — Meeting day setup

### Before the meeting (secretary, 5 minutes)
1. Open the app on your device
2. Go to **Admin → Today's roll call → Open this Saturday's roll call**
3. That's it — members can now check in!

### During the meeting
- **Display the QR code**: Admin tab → QR check-in code → paste your GitHub Pages URL → QR appears
- Project the QR on screen, or share the link on WhatsApp
- Members open the link on their phones, tap their name, tap In-Person or Online

### After the meeting (secretary)
1. Dashboard → **Prepare update to share** → paste to WhatsApp group
2. Admin → Fix any mistakes in the "Fix a session manually" section
3. Admin → **Download term attendance workbook** for records

---

## Step 9 — QR Code for the projector

1. Open the app → Admin tab
2. Scroll to "QR check-in code"
3. Paste your GitHub Pages URL
4. QR code appears — screenshot it and show on projector

---

## Updating deployments later

Whenever you make code changes:

```powershell
cd "d:\Toastmasters\Ecity\Tools\MemberAttendence"
git add .
git commit -m "Describe your change"
git push
npm run deploy
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm` not found | Restart PowerShell after installing Node.js |
| QR doesn't work | Make sure the GitHub Pages site URL is correct |
| Data not syncing across devices | Verify `MODE = "sheets"` and `SHEETS_URL` is set in `storage.js` |
| Apps Script returns error | Re-deploy the Web App (step 4d) and re-authorize |
| Members see old data | Clear browser cache or try incognito mode (cache issue) |
| App shows "Couldn't load" | Check your internet connection; Apps Script has ~30-second cold start |
