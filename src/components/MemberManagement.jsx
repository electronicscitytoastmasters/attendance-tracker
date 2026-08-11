/**
 * MemberManagement.jsx — Member Roster Management (Add, Edit, EC Toggle, Delete, TI CSV Import)
 */

import React, { useState, useMemo, useRef } from "react";
import {
  Plus,
  Search,
  Star,
  Trash2,
  Edit2,
  Check,
  X,
  Filter,
  ArrowUpDown,
  Upload,
  Mail,
  Phone,
  Calendar,
  Award,
  UserX,
  Eye,
  EyeOff,
} from "lucide-react";
import { COLORS } from "../constants/theme.js";
import { fmtDate } from "../utils/dateUtils.js";
import { extractTIRoster, computeRosterDiff } from "../utils/csvParser.js";
import RosterImportModal from "./RosterImportModal.jsx";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export default function MemberManagement({ members, onSaveMembers }) {
  const [q, setQ] = useState("");
  const [filterBy, setFilterBy] = useState("active"); // Default active members
  const [sortBy, setSortBy] = useState("name-asc");
  const [showLeftMembers, setShowLeftMembers] = useState(false); // Checkbox to show/hide left members
  const [editingMember, setEditingMember] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [importDiff, setImportDiff] = useState(null);

  const fileInputRef = useRef(null);

  // Form states for Add / Edit modal
  const [name, setName] = useState("");
  const [isEc, setIsEc] = useState(false);
  const [joinDate, setJoinDate] = useState("");
  const [leaveDate, setLeaveDate] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paidUntil, setPaidUntil] = useState("");
  const [credentials, setCredentials] = useState("");
  const [pathways, setPathways] = useState("");

  // Counts excluding people who left
  const activeMembersCount = useMemo(() => members.filter((m) => !m.leaveDate).length, [members]);
  const activeEcCount = useMemo(() => members.filter((m) => !m.leaveDate && m.ec).length, [members]);
  const leftMembersCount = useMemo(() => members.filter((m) => m.leaveDate).length, [members]);

  const filtered = useMemo(() => {
    return members
      .filter((m) => {
        // Exclude left members if checkbox is unchecked (unless explicitly filtering for left members)
        if (!showLeftMembers && m.leaveDate && filterBy !== "left") return false;

        const matchSearch =
          m.name.toLowerCase().includes(q.toLowerCase()) ||
          (m.email && m.email.toLowerCase().includes(q.toLowerCase())) ||
          (m.customerId && m.customerId.toLowerCase().includes(q.toLowerCase()));
        if (!matchSearch) return false;

        if (filterBy === "active") return !m.leaveDate;
        if (filterBy === "ec") return !m.leaveDate && m.ec;
        if (filterBy === "general") return !m.leaveDate && !m.ec;
        if (filterBy === "left") return !!m.leaveDate;
        if (filterBy === "expiring") {
          if (m.leaveDate || !m.paidUntil) return false;
          const daysLeft = (new Date(m.paidUntil) - new Date()) / (1000 * 60 * 60 * 24);
          return daysLeft <= 30;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name-asc") return a.name.localeCompare(b.name);
        if (sortBy === "name-desc") return b.name.localeCompare(a.name);
        if (sortBy === "ec-first") return (b.ec - a.ec) || a.name.localeCompare(b.name);
        if (sortBy === "join-desc") return (b.joinDate || "").localeCompare(a.joinDate || "");
        if (sortBy === "join-asc") return (a.joinDate || "").localeCompare(b.joinDate || "");
        if (sortBy === "dues-asc") return (a.paidUntil || "9999").localeCompare(b.paidUntil || "9999");
        return 0;
      });
  }, [members, q, filterBy, sortBy, showLeftMembers]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const tiRecords = extractTIRoster(text);

        if (!tiRecords || tiRecords.length === 0) {
          alert("Could not extract member records from the uploaded file. Please ensure it is a valid Toastmasters roster CSV.");
          return;
        }

        const diff = computeRosterDiff(tiRecords, members);
        setImportDiff(diff);
      } catch (err) {
        console.error("Error reading CSV", err);
        alert("Failed to parse the CSV file. Please check the file format.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const resetForm = () => {
    setName("");
    setIsEc(false);
    setJoinDate("");
    setLeaveDate("");
    setCustomerId("");
    setEmail("");
    setPhone("");
    setPaidUntil("");
    setCredentials("");
    setPathways("");
  };

  const handleAddMember = () => {
    if (!name.trim()) return;
    const newMember = {
      id: uid(),
      name: name.trim(),
      ec: isEc,
      joinDate: joinDate || null,
      leaveDate: leaveDate || null,
      customerId: customerId.trim(),
      email: email.trim(),
      phone: phone.trim(),
      paidUntil: paidUntil || null,
      credentials: credentials.trim(),
      pathways: pathways.trim(),
    };
    onSaveMembers([...members, newMember]);
    resetForm();
    setShowAddModal(false);
  };

  const handleUpdateMember = () => {
    if (!editingMember || !name.trim()) return;
    const updated = members.map((m) =>
      m.id === editingMember.id
        ? {
            ...m,
            name: name.trim(),
            ec: isEc,
            joinDate: joinDate || null,
            leaveDate: leaveDate || null,
            customerId: customerId.trim(),
            email: email.trim(),
            phone: phone.trim(),
            paidUntil: paidUntil || null,
            credentials: credentials.trim(),
            pathways: pathways.trim(),
          }
        : m
    );
    onSaveMembers(updated);
    setEditingMember(null);
    resetForm();
  };

  const handleDeleteMember = (id) => {
    if (window.confirm("Are you sure you want to remove this member from the roster?")) {
      onSaveMembers(members.filter((m) => m.id !== id));
    }
  };

  const handleToggleEC = (id) => {
    onSaveMembers(
      members.map((m) => (m.id === id ? { ...m, ec: !m.ec } : m))
    );
  };

  const openEdit = (m) => {
    setEditingMember(m);
    setName(m.name || "");
    setIsEc(!!m.ec);
    setJoinDate(m.joinDate || "");
    setLeaveDate(m.leaveDate || "");
    setCustomerId(m.customerId || "");
    setEmail(m.email || "");
    setPhone(m.phone || "");
    setPaidUntil(m.paidUntil || "");
    setCredentials(m.credentials || "");
    setPathways(m.pathways || "");
  };

  return (
    <div style={{ maxWidth: 1050, margin: "0 auto", padding: "24px 16px" }}>
      {/* Hidden File Input for CSV Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />

      {/* Top Header & Actions */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 20,
        flexWrap: "wrap",
      }}>
        <div>
          <h2 className="font-display" style={{ margin: 0, fontSize: 22, color: COLORS.INK }}>
            Club Roster
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: COLORS.INK_MUTED, display: "flex", alignItems: "center", gap: 6 }}>
            <span>Total <strong>{activeMembersCount}</strong> active members (<strong>{activeEcCount}</strong> Executive Committee)</span>
            {leftMembersCount > 0 && (
              <span style={{ fontSize: 12, background: "#F1F5F9", color: "#64748B", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>
                {leftMembersCount} left
              </span>
            )}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Upload TI CSV Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="app-button"
            style={{
              background: "white",
              color: COLORS.TM_BLUE,
              border: `1.5px solid ${COLORS.TM_BLUE}`,
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Upload size={16} /> Upload TI Roster (.csv)
          </button>

          {/* Add New Member Button */}
          <button
            onClick={() => {
              setEditingMember(null);
              resetForm();
              setShowAddModal(true);
            }}
            className="app-button"
            style={{
              background: COLORS.TM_BLUE,
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Plus size={16} /> Add New Member
          </button>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Sort & Show Left Toggle */}
      <div style={{
        background: "white",
        borderRadius: 12,
        padding: "16px",
        border: `1px solid ${COLORS.LINE}`,
        marginBottom: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {/* Search Input */}
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: COLORS.INK_MUTED,
              }}
            />
            <input
              type="text"
              placeholder="Search by member name, email, or Customer ID..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: 8,
                border: `1px solid ${COLORS.LINE}`,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Filter By Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Filter size={14} color={COLORS.INK_MUTED} />
            <select
              value={filterBy}
              onChange={(e) => {
                setFilterBy(e.target.value);
                if (e.target.value === "left") setShowLeftMembers(true);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${COLORS.LINE}`,
                fontSize: 13,
                background: "white",
                outline: "none",
              }}
            >
              <option value="active">Active Members Only</option>
              <option value="all">All Roster Members</option>
              <option value="ec">Executive Committee</option>
              <option value="general">General Members</option>
              <option value="expiring">Dues Expiring Soon (&le;30 days)</option>
              <option value="left">Left / Past Members</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ArrowUpDown size={14} color={COLORS.INK_MUTED} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${COLORS.LINE}`,
                fontSize: 13,
                background: "white",
                outline: "none",
              }}
            >
              <option value="name-asc">Name (A ➔ Z)</option>
              <option value="name-desc">Name (Z ➔ A)</option>
              <option value="ec-first">EC Members First</option>
              <option value="join-desc">Joined Recently</option>
              <option value="join-asc">Joined Oldest</option>
              <option value="dues-asc">Dues Expiring Soonest</option>
            </select>
          </div>
        </div>

        {/* Sub-strip: Checkbox to show/hide left members & Active Count display */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, paddingTop: 8, borderTop: `1px solid ${COLORS.LINE}` }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: COLORS.INK, cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={showLeftMembers}
              onChange={(e) => setShowLeftMembers(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: COLORS.TM_BLUE, cursor: "pointer" }}
            />
            {showLeftMembers ? <Eye size={15} color={COLORS.TM_BLUE} /> : <EyeOff size={15} color={COLORS.INK_MUTED} />}
            <span>Show members who left the club {leftMembersCount > 0 && `(${leftMembersCount})`}</span>
          </label>

          <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.INK_MUTED }}>
            Showing <strong>{filtered.length}</strong> member(s)
            {showLeftMembers && leftMembersCount > 0 && (
              <span style={{ marginLeft: 4, color: "#991B1B" }}>
                ({filtered.filter((m) => m.leaveDate).length} left)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div style={{
        background: "white",
        borderRadius: 12,
        border: `1px solid ${COLORS.LINE}`,
        overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
          <thead>
            <tr style={{ background: COLORS.PAPER_RAISED, borderBottom: `2px solid ${COLORS.LINE}` }}>
              <th style={{ padding: "12px 12px", textAlign: "center", width: 60 }}>Sl. No.</th>
              <th style={{ padding: "12px 16px" }}>Member Details</th>
              <th style={{ padding: "12px 12px", textAlign: "center", width: 130 }}>Exec Committee</th>
              <th style={{ padding: "12px 12px", textAlign: "center" }}>Joined Date</th>
              <th style={{ padding: "12px 12px", textAlign: "center" }}>Dues Paid Until</th>
              <th style={{ padding: "12px 16px", textAlign: "right", width: 90 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: "center", color: COLORS.INK_MUTED }}>
                  No members match the selected filter.
                </td>
              </tr>
            ) : (
              filtered.map((m, idx) => (
                <tr
                  key={m.id}
                  style={{
                    borderBottom: `1px solid ${COLORS.LINE}`,
                    background: m.leaveDate ? "#FEF2F2" : idx % 2 === 0 ? "white" : "#FAFAF7",
                    opacity: m.leaveDate ? 0.75 : 1,
                  }}
                >
                  {/* Sl. No. */}
                  <td style={{ padding: "12px 12px", textAlign: "center", fontWeight: 700, color: COLORS.INK_MUTED, fontSize: 12 }}>
                    {idx + 1}
                  </td>

                  {/* Member Details */}
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 700, color: COLORS.INK, display: "flex", alignItems: "center", gap: 8 }}>
                      {m.name}
                      {m.credentials && (
                        <span style={{ fontSize: 11, background: "#E2E8F0", padding: "1px 6px", borderRadius: 4, color: COLORS.INK_MUTED }}>
                          {m.credentials}
                        </span>
                      )}
                      {m.customerId && (
                        <span style={{ fontSize: 11, background: "#E0F2FE", padding: "1px 6px", borderRadius: 4, color: "#0369A1" }}>
                          #{m.customerId}
                        </span>
                      )}
                      {m.leaveDate && (
                        <span style={{ fontSize: 11, background: "#FEE2E2", color: "#991B1B", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                          Left on {fmtDate(m.leaveDate)}
                        </span>
                      )}
                    </div>

                    {/* Sub details: email, phone, pathways */}
                    <div style={{ fontSize: 12, color: COLORS.INK_MUTED, marginTop: 3, display: "flex", flexWrap: "wrap", gap: 12 }}>
                      {m.email && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Mail size={12} /> {m.email}
                        </span>
                      )}
                      {m.phone && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Phone size={12} /> {m.phone}
                        </span>
                      )}
                      {m.pathways && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: COLORS.TM_BLUE, fontWeight: 600 }}>
                          <Award size={12} /> {m.pathways}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* EC Status */}
                  <td style={{ padding: "12px 12px", textAlign: "center" }}>
                    <button
                      onClick={() => handleToggleEC(m.id)}
                      style={{
                        background: m.ec ? "#FFF4D6" : "transparent",
                        color: m.ec ? COLORS.BRASS : COLORS.INK_MUTED,
                        border: `1px solid ${m.ec ? COLORS.BRASS : COLORS.LINE}`,
                        borderRadius: 12,
                        padding: "3px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Star size={12} fill={m.ec ? COLORS.BRASS : "none"} />
                      {m.ec ? "EC Member" : "Member"}
                    </button>
                  </td>

                  {/* Joined Date */}
                  <td style={{ padding: "12px 12px", textAlign: "center", color: COLORS.INK_MUTED, fontSize: 12 }}>
                    {m.joinDate ? fmtDate(m.joinDate) : "—"}
                  </td>

                  {/* Dues Paid Until */}
                  <td style={{ padding: "12px 12px", textAlign: "center", color: COLORS.INK_MUTED, fontSize: 12 }}>
                    {m.paidUntil ? (
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        background: new Date(m.paidUntil) < new Date() ? "#FEE2E2" : "#ECFDF5",
                        color: new Date(m.paidUntil) < new Date() ? "#991B1B" : "#065F46",
                      }}>
                        {fmtDate(m.paidUntil)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                      <button
                        onClick={() => openEdit(m)}
                        title="Edit Member"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: COLORS.TEAL,
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteMember(m.id)}
                        title="Delete Member"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: COLORS.RUST,
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Roster Sync Preview Modal */}
      {importDiff && (
        <RosterImportModal
          diff={importDiff}
          currentMembers={members}
          onSaveMembers={onSaveMembers}
          onClose={() => setImportDiff(null)}
        />
      )}

      {/* Add / Edit Modal */}
      {(showAddModal || editingMember) && (
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
            padding: 24,
            maxWidth: 480,
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
          }}>
            <h3 className="font-display" style={{ margin: "0 0 16px", fontSize: 18, color: COLORS.INK }}>
              {editingMember ? "Edit Member Details" : "Add New Member"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.INK_MUTED, marginBottom: 4 }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. TM John Doe"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: `1px solid ${COLORS.LINE}`,
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  id="ecCheckbox"
                  checked={isEc}
                  onChange={(e) => setIsEc(e.target.checked)}
                />
                <label htmlFor="ecCheckbox" style={{ fontSize: 13, fontWeight: 600, color: COLORS.INK, cursor: "pointer" }}>
                  Executive Committee (EC) Member
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.INK_MUTED, marginBottom: 4 }}>
                    Customer ID
                  </label>
                  <input
                    type="text"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    placeholder="e.g. 01234567"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: `1px solid ${COLORS.LINE}`,
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.INK_MUTED, marginBottom: 4 }}>
                    Credentials
                  </label>
                  <input
                    type="text"
                    value={credentials}
                    onChange={(e) => setCredentials(e.target.value)}
                    placeholder="e.g. DTM, PM5"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: `1px solid ${COLORS.LINE}`,
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.INK_MUTED, marginBottom: 4 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: `1px solid ${COLORS.LINE}`,
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.INK_MUTED, marginBottom: 4 }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: `1px solid ${COLORS.LINE}`,
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.INK_MUTED, marginBottom: 4 }}>
                    Join Date (Member Since)
                  </label>
                  <input
                    type="date"
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: `1px solid ${COLORS.LINE}`,
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.INK_MUTED, marginBottom: 4 }}>
                    Dues Paid Until
                  </label>
                  <input
                    type="date"
                    value={paidUntil}
                    onChange={(e) => setPaidUntil(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: `1px solid ${COLORS.LINE}`,
                      fontSize: 13,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.INK_MUTED, marginBottom: 4 }}>
                  Leave Date (optional)
                </label>
                <input
                  type="date"
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: `1px solid ${COLORS.LINE}`,
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.INK_MUTED, marginBottom: 4 }}>
                  Pathways Track
                </label>
                <input
                  type="text"
                  value={pathways}
                  onChange={(e) => setPathways(e.target.value)}
                  placeholder="e.g. Presentation Mastery"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: `1px solid ${COLORS.LINE}`,
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingMember(null);
                  resetForm();
                }}
                style={{
                  background: COLORS.PAPER_RAISED,
                  color: COLORS.INK,
                  border: `1px solid ${COLORS.LINE}`,
                  borderRadius: 6,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={editingMember ? handleUpdateMember : handleAddMember}
                style={{
                  background: COLORS.TM_BLUE,
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {editingMember ? "Save Changes" : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
