/**
 * csvParser.js — Toastmasters International WHQ Roster CSV Parser & Diff Engine
 */

/**
 * Robust CSV Line Splitter handling quotes, escaped quotes (""), and internal commas.
 */
export function parseCSVText(csvText) {
  const lines = [];
  let currentLine = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n in \r\n
      }
      currentLine.push(currentField.trim());
      if (currentLine.some((f) => f.length > 0)) {
        lines.push(currentLine);
      }
      currentLine = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    if (currentLine.some((f) => f.length > 0)) {
      lines.push(currentLine);
    }
  }

  return lines;
}

/**
 * Clean & normalize full name from TI export.
 * Handles "Last, First" or "First Last" formatting and strips excess spaces.
 */
export function normalizeName(rawName) {
  if (!rawName) return '';
  let clean = rawName.trim().replace(/\s+/g, ' ');
  if (clean.includes(',')) {
    const parts = clean.split(',').map((p) => p.trim());
    if (parts.length === 2) {
      clean = `${parts[1]} ${parts[0]}`;
    }
  }
  return clean;
}

/**
 * Standardize date strings to YYYY-MM-DD or return raw if unrecognized.
 */
export function normalizeDate(rawDate) {
  if (!rawDate) return '';
  const d = new Date(rawDate);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return rawDate.trim();
}

/**
 * Extracts structured member records from parsed CSV matrix.
 */
export function extractTIRoster(csvText) {
  const rows = parseCSVText(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const findIdx = (possibleNames) => {
    return headers.findIndex((h) =>
      possibleNames.some((p) => h === p.toLowerCase() || h.includes(p.toLowerCase()))
    );
  };

  const idxMap = {
    customerId: findIdx(['customer id', 'customer #', 'member id']),
    name: findIdx(['name', 'member name']),
    credentials: findIdx(['credentials']),
    company: findIdx(['company / in care of', 'company']),
    addr1: findIdx(['addr l1', 'address 1', 'addr 1']),
    addr2: findIdx(['addr l2', 'address 2', 'addr 2']),
    addr3: findIdx(['addr l3', 'address 3', 'addr 3']),
    city: findIdx(['city']),
    state: findIdx(['state/province', 'state', 'province']),
    country: findIdx(['country']),
    zip: findIdx(['zip-code', 'zip code', 'zip', 'postal code']),
    email: findIdx(['email', 'primary email']),
    mobilePhone: findIdx(['mobile phone', 'mobile']),
    homePhone: findIdx(['home phone', 'home']),
    addPhone: findIdx(['additional phone', 'other phone', 'phone']),
    paidUntil: findIdx(['paid until', 'dues paid until']),
    joinDate: findIdx(['member of club since', 'club join date', 'join date']),
    origJoinDate: findIdx(['original join date']),
    status: findIdx(['status (*)', 'status']),
    pathways: findIdx(['pathways enrolled', 'pathways']),
  };

  const records = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const val = (idx) => (idx !== -1 && row[idx] ? row[idx].trim() : '');

    const rawName = val(idxMap.name);
    if (!rawName) continue; // skip rows without name

    const name = normalizeName(rawName);
    const customerId = val(idxMap.customerId);

    // Conditional Phone selection
    const mobile = val(idxMap.mobilePhone);
    const home = val(idxMap.homePhone);
    const additional = val(idxMap.addPhone);
    const phone = mobile || home || additional || '';

    // Combined Address
    const addressParts = [
      val(idxMap.company),
      val(idxMap.addr1),
      val(idxMap.addr2),
      val(idxMap.addr3),
      val(idxMap.city),
      val(idxMap.state),
      val(idxMap.zip),
      val(idxMap.country),
    ].filter((p) => p && p !== 'N/A' && p !== '-');

    const address = addressParts.join(', ');

    records.push({
      customerId,
      name,
      credentials: val(idxMap.credentials),
      email: val(idxMap.email),
      phone,
      address,
      paidUntil: normalizeDate(val(idxMap.paidUntil)),
      joinDate: normalizeDate(val(idxMap.joinDate)),
      originalJoinDate: normalizeDate(val(idxMap.origJoinDate)),
      status: val(idxMap.status) || 'Active',
      pathways: val(idxMap.pathways),
    });
  }

  return records;
}

/**
 * Compares TI extracted records with current active member list.
 */
export function computeRosterDiff(tiRecords, currentMembers) {
  const toAdd = [];
  const toUpdate = [];
  const matchedMemberIds = new Set();

  tiRecords.forEach((ti) => {
    // 1. Try matching by Customer ID
    let match = ti.customerId
      ? currentMembers.find((m) => m.customerId && String(m.customerId).trim() === String(ti.customerId).trim())
      : null;

    // 2. Secondary match by normalized Name
    if (!match) {
      const tiNameLower = ti.name.toLowerCase();
      match = currentMembers.find((m) => m.name.toLowerCase().trim() === tiNameLower);
    }

    if (match) {
      matchedMemberIds.add(match.id);

      // Determine what changed
      const changes = {};
      if (ti.customerId && match.customerId !== ti.customerId) changes.customerId = { old: match.customerId || '', new: ti.customerId };
      if (ti.email && match.email !== ti.email) changes.email = { old: match.email || '', new: ti.email };
      if (ti.phone && match.phone !== ti.phone) changes.phone = { old: match.phone || '', new: ti.phone };
      if (ti.joinDate && match.joinDate !== ti.joinDate) changes.joinDate = { old: match.joinDate || '', new: ti.joinDate };
      if (ti.paidUntil && match.paidUntil !== ti.paidUntil) changes.paidUntil = { old: match.paidUntil || '', new: ti.paidUntil };
      if (ti.credentials && match.credentials !== ti.credentials) changes.credentials = { old: match.credentials || '', new: ti.credentials };
      if (ti.address && match.address !== ti.address) changes.address = { old: match.address || '', new: ti.address };
      if (ti.pathways && match.pathways !== ti.pathways) changes.pathways = { old: match.pathways || '', new: ti.pathways };

      // Check if was previously marked inactive
      if (match.leaveDate) changes.reactivate = { old: match.leaveDate, new: null };

      toUpdate.push({
        existingMember: match,
        tiRecord: ti,
        changes,
        hasChanges: Object.keys(changes).length > 0,
      });
    } else {
      toAdd.push(ti);
    }
  });

  // Members currently active in the app but missing from the TI CSV
  const missingMembers = currentMembers.filter(
    (m) => !m.leaveDate && !matchedMemberIds.has(m.id)
  );

  return {
    toAdd,
    toUpdate,
    missingMembers,
    totalParsed: tiRecords.length,
  };
}
