/**
 * exportUtils.js — Dynamic lazy-loaded export utilities for Excel, PNG, and PDF.
 * Avoids including xlsx, jspdf, and html2canvas in the main bundle.
 */

import { todayStr, fmtDate, fmtTimeIST, isEligible, getMonthLabel } from "./dateUtils.js";
import { getAttendanceStatus } from "../constants/theme.js";

/**
 * Downloads attendance data as a multi-sheet Excel workbook (.xlsx)
 */
export async function downloadWorkbook(membersList, sessionsList, attMap, filenameLabel) {
  const XLSX = await import("xlsx");
  const today = todayStr();
  const sorted = sessionsList.slice().sort((a, b) => a.date.localeCompare(b.date));
  const occurred = sorted.filter((s) => s.date <= today);
  const membersSorted = membersList
    .slice()
    .sort((a, b) => (b.ec - a.ec) || a.name.localeCompare(b.name));

  const perMemberStats = membersSorted.map((m) => {
    const eligible = occurred.filter((s) => isEligible(m, s.date));
    const attended = eligible.filter((s) => attMap[s.id]?.[m.id]?.p).length;
    const pct = eligible.length ? Math.round((attended / eligible.length) * 100) : 0;
    return { id: m.id, attended, pct };
  });

  const perSessionStats = occurred.map((s) => {
    const eligible = membersSorted.filter((m) => isEligible(m, s.date));
    const present = eligible.filter((m) => attMap[s.id]?.[m.id]?.p).length;
    const total = eligible.length || 1;
    return { id: s.id, present, total, pct: Math.round((present / total) * 100) };
  });

  const header = [
    "Member", "Role",
    ...sorted.map((s) => fmtDate(s.date)),
    "Present", "Term % (to date)",
  ];

  const rows = membersSorted.map((m) => {
    const pm = perMemberStats.find((p) => p.id === m.id);
    const cells = sorted.map((s) => {
      if (s.date > today) return "Not yet happened";
      if (!isEligible(m, s.date)) return "—";
      const rec = attMap[s.id]?.[m.id];
      if (!rec?.p) return "Absent";
      return rec.mode === "online" ? "Online" : "In-Person";
    });
    return [m.name, m.ec ? "Exec Committee" : "Member", ...cells, pm.attended, `${pm.pct}%`];
  });

  const weekRow = [
    "Week attendance % (occurred only)", "",
    ...sorted.map((s) => {
      const sp = perSessionStats.find((p) => p.id === s.id);
      return sp ? `${sp.pct}%` : "—";
    }),
    "", "",
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([header, ...rows, [], weekRow]),
    "Term Matrix"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Name", "Role", "Joined", "Left"],
      ...membersList.map((m) => [
        m.name, m.ec ? "EC" : "Member",
        m.joinDate ? fmtDate(m.joinDate) : "—",
        m.leaveDate ? fmtDate(m.leaveDate) : "",
      ]),
    ]),
    "Members"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Date", "Label", "Present", "Total", "%"],
      ...perSessionStats.map((s) => {
        const sess = sorted.find((x) => x.id === s.id);
        return [sess.date, sess.label, s.present, s.total, s.pct];
      }),
    ]),
    "Sessions"
  );

  const timeRows = [];
  occurred.forEach((s) => {
    membersSorted.forEach((m) => {
      const rec = attMap[s.id]?.[m.id];
      if (rec?.p) {
        timeRows.push([
          fmtDate(s.date), m.name,
          rec.mode === "online" ? "Online" : "In-Person",
          fmtTimeIST(rec.t),
        ]);
      }
    });
  });

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Session", "Member", "Mode", "Checked in (IST)"],
      ...timeRows,
    ]),
    "Check-in Times"
  );

  XLSX.writeFile(wb, `attendance-${filenameLabel}.xlsx`);
}

/**
 * Downloads member leaderboard data as an Excel file (.xlsx)
 */
export async function downloadLeaderboardExcel(rankedMembers, filenameLabel) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const rows = rankedMembers.map((m) => [
    m.rankDisplay,
    m.name,
    m.ec ? "Exec Committee" : "Member",
    m.attendedCount,
    m.applicableCount,
    m.pct !== null ? `${m.pct}%` : "N/A",
  ]);
  const ws = XLSX.utils.aoa_to_sheet([
    ["Rank", "Member Name", "Role", "Meetings Attended", "Applicable Meetings", "Attendance Rate"],
    ...rows,
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Leaderboard");
  XLSX.writeFile(wb, `leaderboard-${filenameLabel}.xlsx`);
}

/**
 * Downloads a DOM element as a high-DPI PNG image
 */
export async function downloadElementAsPNG(element, filename) {
  if (!element) return;
  const html2canvasModule = await import("html2canvas");
  const html2canvas = html2canvasModule.default || html2canvasModule;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#EFEDE3",
    logging: false,
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

/**
 * Smart multi-page PDF generator that slices HTML canvas at exact row boundaries,
 * preventing any table row from being cut in half, and adding crisp header banners & table headers on page 2+.
 */
export async function downloadSmartMultiPagePDF(element, filename, titleText = "ECITY Toastmasters Leaderboard") {
  if (!element) return;
  const html2canvasModule = await import("html2canvas");
  const html2canvas = html2canvasModule.default || html2canvasModule;
  const jsPDFModule = await import("jspdf");
  const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF || jsPDFModule;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#EFEDE3",
    logging: false,
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210 mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm
  const margin = 10;
  const printWidth = pdfWidth - margin * 2; // 190 mm
  const maxPrintHeight = pdfHeight - margin * 2; // 277 mm

  // Scale factor between canvas 2x pixels and mm print width
  const mmPerPx = printWidth / canvas.width;

  // Get bottom Y offset of each <tr> in 2x canvas pixels
  const trElements = Array.from(element.querySelectorAll("tr"));
  const elementRect = element.getBoundingClientRect();
  const rowCutPoints = trElements
    .map((tr) => {
      const rect = tr.getBoundingClientRect();
      return Math.round((rect.bottom - elementRect.top) * 2); // 2x scale factor
    })
    .sort((a, b) => a - b);

  let yStart = 0;
  let pageIndex = 0;

  // Height allocated for Header Banner + Table Header on Page 2+ (in mm)
  const headerBannerHeightMm = 12;
  const tableHeaderHeightMm = 10;
  const page2HeaderTotalMm = headerBannerHeightMm + tableHeaderHeightMm + 2; // 24mm

  while (yStart < canvas.height) {
    const isFirstPage = pageIndex === 0;
    const availablePrintHeightMm = isFirstPage ? maxPrintHeight : (maxPrintHeight - page2HeaderTotalMm);
    const availableCanvasPx = availablePrintHeightMm / mmPerPx;

    let yTarget = yStart + availableCanvasPx;
    let yCut = canvas.height;

    if (yTarget < canvas.height) {
      // Find last table row bottom edge that fits in available canvas height
      const validCuts = rowCutPoints.filter((y) => y > yStart + 80 && y <= yTarget);
      if (validCuts.length > 0) {
        yCut = validCuts[validCuts.length - 1];
      } else {
        yCut = yTarget;
      }
    }

    const sliceHeight = yCut - yStart;
    if (sliceHeight <= 0) break;

    // Create slice canvas
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeight;
    const ctx = sliceCanvas.getContext("2d");
    ctx.drawImage(
      canvas,
      0, yStart, canvas.width, sliceHeight,
      0, 0, canvas.width, sliceHeight
    );

    const sliceImgData = sliceCanvas.toDataURL("image/png");
    const printSliceHeight = sliceHeight * mmPerPx;

    if (!isFirstPage) {
      pdf.addPage();

      // 1. Render Top Dark Navy Header Banner at top of Page 2+
      pdf.setFillColor(27, 36, 48); // #1B2430
      pdf.roundedRect(margin, margin, printWidth, headerBannerHeightMm, 2, 2, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text(titleText, pdfWidth / 2, margin + 7.5, { align: "center" });

      // 2. Render Dark Table Header Row right under banner
      const thY = margin + headerBannerHeightMm + 1;
      pdf.setFillColor(21, 32, 43); // #15202B
      pdf.rect(margin, thY, printWidth, tableHeaderHeightMm, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");

      // Draw Column Titles matching table layout
      pdf.text("Rank", margin + 10, thY + 6.5, { align: "center" });
      pdf.text("Member", margin + 24, thY + 6.5, { align: "left" });
      pdf.text("Attended", margin + 115, thY + 6.5, { align: "center" });
      pdf.text("Applicable", margin + 145, thY + 6.5, { align: "center" });
      pdf.text("Att %", margin + 168, thY + 6.5, { align: "center" });
      pdf.text("Status", margin + 178, thY + 6.5, { align: "left" });

      // 3. Draw row slice right below repeated table header
      const rowsY = thY + tableHeaderHeightMm + 1;
      pdf.addImage(sliceImgData, "PNG", margin, rowsY, printWidth, printSliceHeight);
    } else {
      // Page 1 prints whole slice starting at top margin
      pdf.addImage(sliceImgData, "PNG", margin, margin, printWidth, printSliceHeight);
    }

    // Page footer at bottom right
    pdf.setTextColor(120, 120, 120);
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `Page ${pageIndex + 1}`,
      pdfWidth - margin - 5,
      pdfHeight - 6
    );

    yStart = yCut;
    pageIndex++;
  }

  pdf.save(filename);
}

export async function downloadElementAsPDF(element, filename) {
  return downloadSmartMultiPagePDF(element, filename);
}
