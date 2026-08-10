/**
 * MemberManagement.jsx — Member Roster Management (Add, Edit, EC Toggle, Delete)
 */

import React, { useState, useMemo } from "react";
import { Plus, Search, Star, Trash2, Edit2, Check, X, Filter, ArrowUpDown } from "lucide-react";
import { COLORS } from "../constants/theme.js";
import { fmtDate } from "../utils/dateUtils.js";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export default function MemberManagement({ members, onSaveMembers }) {
  const [q, setQ] = useState("");
  const [filterBy, setFilterBy] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");
  const [editingMember, setEditingMember] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [isEc, setIsEc] = useState(false);
  const [joinDate, setJoinDate] = useState("");
  const [leaveDate, setLeaveDate] = useState("");

  const filtered = useMemo(() => {
    return members
      .filter((m) => {
        const matchSearch = m.name.toLowerCase().includes(q.toLowerCase());
        if (!matchSearch) return false;

        if (filterBy === "ec") return m.ec;
        if (filterBy === "general") return !m.ec;
        if (filterBy === "active") return !m.leaveDate;
        if (filterBy === "left") return !!m.leaveDate;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name-asc") return a.name.localeCompare(b.name);
        if (sortBy === "name-desc") return b.name.localeCompare(a.name);
        if (sortBy === "ec-first") return (b.ec - a.ec) || a.name.localeCompare(b.name);
        if (sortBy === "join-desc") return (b.joinDate || "").localeCompare(a.joinDate || "");
        if (sortBy === "join-asc") return (a.joinDate || "").localeCompare(b.joinDate || "");
        return 0;
      });
  }, [members, q, filterBy, sortBy]);

  const handleAddMember = () => {
    if (!name.trim()) return;
    const newMember = {
      id: uid(),
      name: name.trim(),
      ec: isEc,
      joinDate: joinDate || null,
      leaveDate: leaveDate || null,
    };
    onSaveMembers([...members, newMember]);
    setName("");
    setIsEc(false);
    setJoinDate("");
    setLeaveDate("");
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
          }
        : m
    );
    onSaveMembers(updated);
    setEditingMember(null);
    setName("");
    setIsEc(false);
    setJoinDate("");
    setLeaveDate("");
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
    setName(m.name);
    setIsEc(m.ec);
    setJoinDate(m.joinDate || "");
    setLeaveDate(m.leaveDate || "");
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px" }}>
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
          <p style={{ margin: "2px 0 0", fontSize: 13, color: COLORS.INK_MUTED }}>
            Total {members.length} members ({members.filter((m) => m.ec).length} Executive Committee)
          </p>
        </div>

        <button
          onClick={() => {
            setEditingMember(null);
            setName("");
            setIsEc(false);
            setJoinDate("");
            setLeaveDate("");
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

      {/* Filter & Sort Toolbar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
        flexWrap: "wrap",
      }}>
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
            placeholder="Search member by name..."
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
            onChange={(e) => setFilterBy(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: `1px solid ${COLORS.LINE}`,
              fontSize: 13,
              background: "white",
              color: COLORS.INK,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <option value="all">Filter: All Members ({members.length})</option>
            <option value="active">Filter: Active Members Only</option>
            <option value="ec">Filter: Exec Committee Only (★)</option>
            <option value="general">Filter: General Members Only</option>
            <option value="left">Filter: Inactive / Left Members</option>
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
              color: COLORS.INK,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <option value="name-asc">Sort: Name (A – Z)</option>
            <option value="name-desc">Sort: Name (Z – A)</option>
            <option value="ec-first">Sort: Exec Committee First (★)</option>
            <option value="join-desc">Sort: Newest Joined First</option>
            <option value="join-asc">Sort: Oldest Joined First</option>
          </select>
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
              <th style={{ padding: "12px 16px" }}>Member Name</th>
              <th style={{ padding: "12px 12px", textAlign: "center", width: 120 }}>Exec Committee</th>
              <th style={{ padding: "12px 12px", textAlign: "center" }}>Joined Date</th>
              <th style={{ padding: "12px 12px", textAlign: "center" }}>Left Date</th>
              <th style={{ padding: "12px 16px", textAlign: "right", width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, idx) => (
              <tr
                key={m.id}
                style={{
                  borderBottom: `1px solid ${COLORS.LINE}`,
                  background: idx % 2 === 0 ? "white" : "#FAFAF7",
                }}
              >
                <td style={{ padding: "12px 16px", fontWeight: 600, color: COLORS.INK }}>
                  {m.name}
                </td>
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
                <td style={{ padding: "12px 12px", textAlign: "center", color: COLORS.INK_MUTED, fontSize: 12 }}>
                  {m.joinDate ? fmtDate(m.joinDate) : "—"}
                </td>
                <td style={{ padding: "12px 12px", textAlign: "center", color: COLORS.INK_MUTED, fontSize: 12 }}>
                  {m.leaveDate ? fmtDate(m.leaveDate) : "—"}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                    <button
                      onClick={() => openEdit(m)}
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
            ))}
          </tbody>
        </table>
      </div>

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
            maxWidth: 420,
            width: "100%",
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

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.INK_MUTED, marginBottom: 4 }}>
                  Join Date (optional)
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
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingMember(null);
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
