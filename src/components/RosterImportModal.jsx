/**
 * RosterImportModal.jsx — Interactive TI Roster CSV Sync & Review Modal with Member Merging
 */

import React, { useState, useMemo } from "react";
import {
  X,
  UserPlus,
  RefreshCw,
  UserX,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  Calendar,
  Award,
  BookOpen,
  MapPin,
  Check,
  GitMerge,
  Search,
} from "lucide-react";
import { COLORS } from "../constants/theme.js";
import { fmtDate, todayStr } from "../utils/dateUtils.js";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export default function RosterImportModal({ diff, currentMembers, onSaveMembers, onClose }) {
  const [activeTab, setActiveTab] = useState("add"); // "add" | "update" | "missing"

  // Selected state for items to add (default all checked)
  const [selectedToAdd, setSelectedToAdd] = useState(() =>
    new Set(diff.toAdd.map((_, i) => i))
  );

  // Merge map: Map<toAddIndex (number), targetMemberId (string)>
  const [merges, setMerges] = useState({});

  // Selected action for missing members: Map<memberId, 'leave' | 'keep'>
  const [missingActions, setMissingActions] = useState(() => {
    const map = {};
    diff.missingMembers.forEach((m) => {
      map[m.id] = "leave"; // default mark as left
    });
    return map;
  });

  // Track which `toAdd` row has open merge selection dropdown
  const [openMergeDropdownIdx, setOpenMergeDropdownIdx] = useState(null);

  // Available existing members for merging
  const availableMergeTargets = useMemo(() => {
    return currentMembers.sort((a, b) => a.name.localeCompare(b.name));
  }, [currentMembers]);

  const toggleSelectAdd = (idx) => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
        // Clear merge if user checks "Add as New"
        setMerges((m) => {
          const copy = { ...m };
          delete copy[idx];
          return copy;
        });
      }
      return next;
    });
  };

  const handleSelectMergeTarget = (toAddIdx, targetMemberId) => {
    if (!targetMemberId) {
      // Clear merge
      setMerges((prev) => {
        const copy = { ...prev };
        delete copy[toAddIdx];
        return copy;
      });
      // Re-enable add as new
      setSelectedToAdd((prev) => new Set(prev).add(toAddIdx));
    } else {
      setMerges((prev) => ({ ...prev, [toAddIdx]: targetMemberId }));
      // Remove from new additions list
      setSelectedToAdd((prev) => {
        const copy = new Set(prev);
        copy.delete(toAddIdx);
        return copy;
      });
    }
    setOpenMergeDropdownIdx(null);
  };

  const toggleSelectAllAdd = () => {
    // Un-merge all items first if selecting all
    setMerges({});
    if (selectedToAdd.size === diff.toAdd.length) {
      setSelectedToAdd(new Set());
    } else {
      setSelectedToAdd(new Set(diff.toAdd.map((_, i) => i)));
    }
  };

  const setMissingAction = (id, action) => {
    setMissingActions((prev) => ({ ...prev, [id]: action }));
  };

  const handleApplySync = () => {
    let updatedList = [...currentMembers];

    // Track merged member IDs so they aren't marked as missing
    const mergedTargetMemberIds = new Set(Object.values(merges));

    // 1. Apply Automatic Updates to Existing Matched Members
    diff.toUpdate.forEach(({ existingMember, tiRecord }) => {
      updatedList = updatedList.map((m) => {
        if (m.id === existingMember.id) {
          return {
            ...m,
            customerId: tiRecord.customerId || m.customerId || "",
            email: tiRecord.email || m.email || "",
            phone: tiRecord.phone || m.phone || "",
            joinDate: tiRecord.joinDate || m.joinDate || "",
            paidUntil: tiRecord.paidUntil || m.paidUntil || "",
            credentials: tiRecord.credentials || m.credentials || "",
            address: tiRecord.address || m.address || "",
            pathways: tiRecord.pathways || m.pathways || "",
            leaveDate: m.leaveDate ? null : m.leaveDate, // reactivate if was inactive
          };
        }
        return m;
      });
    });

    // 2. Apply Manual Merges (toAdd item -> existing member)
    Object.entries(merges).forEach(([idxStr, targetMemberId]) => {
      const idx = parseInt(idxStr, 10);
      const tiRecord = diff.toAdd[idx];
      if (!tiRecord) return;

      updatedList = updatedList.map((m) => {
        if (m.id === targetMemberId) {
          return {
            ...m,
            customerId: tiRecord.customerId || m.customerId || "",
            email: tiRecord.email || m.email || "",
            phone: tiRecord.phone || m.phone || "",
            joinDate: tiRecord.joinDate || m.joinDate || "",
            paidUntil: tiRecord.paidUntil || m.paidUntil || "",
            credentials: tiRecord.credentials || m.credentials || "",
            address: tiRecord.address || m.address || "",
            pathways: tiRecord.pathways || m.pathways || "",
            leaveDate: null, // clear leave date on merge
          };
        }
        return m;
      });
    });

    // 3. Add Selected New Members
    diff.toAdd.forEach((tiRecord, idx) => {
      if (selectedToAdd.has(idx) && !merges[idx]) {
        updatedList.push({
          id: uid(),
          name: tiRecord.name,
          ec: false,
          joinDate: tiRecord.joinDate || todayStr(),
          leaveDate: null,
          customerId: tiRecord.customerId || "",
          email: tiRecord.email || "",
          phone: tiRecord.phone || "",
          paidUntil: tiRecord.paidUntil || "",
          credentials: tiRecord.credentials || "",
          address: tiRecord.address || "",
          pathways: tiRecord.pathways || "",
        });
      }
    });

    // 4. Process Missing Members (Mark as Left if selected and NOT merged)
    diff.missingMembers.forEach((m) => {
      if (!mergedTargetMemberIds.has(m.id)) {
        if (missingActions[m.id] === "leave") {
          updatedList = updatedList.map((item) =>
            item.id === m.id ? { ...item, leaveDate: item.leaveDate || todayStr() } : item
          );
        }
      }
    });

    onSaveMembers(updatedList);
    onClose();
  };

  const totalMergesCount = Object.keys(merges).length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(6px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 16,
          width: "100%",
          maxWidth: 860,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          border: `1px solid ${COLORS.LINE}`,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            background: `linear-gradient(135deg, ${COLORS.TM_BLUE} 0%, #0f3d61 100%)`,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <RefreshCw size={20} /> Toastmasters Roster CSV Import & Sync
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>
              Review extracted records, resolve name variations via Merging, and confirm sync.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "white",
              width: 32,
              height: 32,
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Summary Metric Strip */}
        <div
          style={{
            padding: "16px 24px",
            background: "#F8FAFC",
            borderBottom: `1px solid ${COLORS.LINE}`,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          <div
            onClick={() => setActiveTab("add")}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: activeTab === "add" ? "#ECFDF5" : "white",
              border: `1.5px solid ${activeTab === "add" ? "#10B981" : COLORS.LINE}`,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontSize: 12, color: COLORS.INK_MUTED, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <UserPlus size={15} color="#10B981" /> New Members / Merges
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#065F46", marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
              <span>{selectedToAdd.size} new</span>
              {totalMergesCount > 0 && (
                <span style={{ fontSize: 12, background: "#D1FAE5", color: "#047857", padding: "2px 8px", borderRadius: 12, fontWeight: 700 }}>
                  {totalMergesCount} merged
                </span>
              )}
            </div>
          </div>

          <div
            onClick={() => setActiveTab("update")}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: activeTab === "update" ? "#EFF6FF" : "white",
              border: `1.5px solid ${activeTab === "update" ? COLORS.TM_BLUE : COLORS.LINE}`,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontSize: 12, color: COLORS.INK_MUTED, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <RefreshCw size={15} color={COLORS.TM_BLUE} /> Auto-Matched Updates
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.TM_BLUE, marginTop: 2 }}>
              {diff.toUpdate.length}
            </div>
          </div>

          <div
            onClick={() => setActiveTab("missing")}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: activeTab === "missing" ? "#FFF7ED" : "white",
              border: `1.5px solid ${activeTab === "missing" ? "#F97316" : COLORS.LINE}`,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontSize: 12, color: COLORS.INK_MUTED, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <UserX size={15} color="#F97316" /> Missing from CSV
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#C2410C", marginTop: 2 }}>
              {diff.missingMembers.length - totalMergesCount}
            </div>
          </div>
        </div>

        {/* Tab Content Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {/* TAB 1: NEW MEMBERS & MERGE OPTION */}
          {activeTab === "add" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: COLORS.INK_MUTED, fontWeight: 600 }}>
                  Found {diff.toAdd.length} record(s) not auto-matched. Select to add as new member or merge with an existing member.
                </span>
                {diff.toAdd.length > 0 && (
                  <button
                    onClick={toggleSelectAllAdd}
                    style={{
                      background: "none",
                      border: "none",
                      color: COLORS.TM_BLUE,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {selectedToAdd.size === diff.toAdd.length ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>

              {diff.toAdd.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: COLORS.INK_MUTED, fontSize: 14 }}>
                  <CheckCircle2 size={36} color="#10B981" style={{ marginBottom: 8 }} />
                  <div>No unmatched members. All CSV records matched existing roster!</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {diff.toAdd.map((m, idx) => {
                    const isSelected = selectedToAdd.has(idx);
                    const mergedTargetId = merges[idx];
                    const mergedTarget = mergedTargetId
                      ? currentMembers.find((item) => item.id === mergedTargetId)
                      : null;

                    return (
                      <div
                        key={idx}
                        style={{
                          padding: "14px 16px",
                          borderRadius: 10,
                          border: `1px solid ${mergedTarget ? "#3B82F6" : isSelected ? "#10B981" : COLORS.LINE}`,
                          background: mergedTarget ? "#EFF6FF" : isSelected ? "#F0FDF4" : "white",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                          {/* Member Info */}
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!!mergedTarget}
                              onChange={() => toggleSelectAdd(idx)}
                              style={{ width: 16, height: 16, accentColor: "#10B981", cursor: "pointer" }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.INK, display: "flex", alignItems: "center", gap: 8 }}>
                                {m.name}
                                {m.credentials && (
                                  <span style={{ fontSize: 11, background: "#E2E8F0", padding: "2px 6px", borderRadius: 4, color: COLORS.INK_MUTED }}>
                                    {m.credentials}
                                  </span>
                                )}
                                {m.customerId && (
                                  <span style={{ fontSize: 11, background: "#E0F2FE", padding: "2px 6px", borderRadius: 4, color: "#0369A1" }}>
                                    ID: {m.customerId}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 12, color: COLORS.INK_MUTED, marginTop: 4, display: "flex", flexWrap: "wrap", gap: 12 }}>
                                {m.email && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Mail size={12} /> {m.email}</span>}
                                {m.phone && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Phone size={12} /> {m.phone}</span>}
                                {m.paidUntil && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={12} /> Paid: {fmtDate(m.paidUntil)}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Action: Add as New vs Merge */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {mergedTarget ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.TM_BLUE, background: "#DBEAFE", padding: "4px 10px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}>
                                  <GitMerge size={14} /> Merged with "{mergedTarget.name}"
                                </span>
                                <button
                                  onClick={() => handleSelectMergeTarget(idx, null)}
                                  style={{ background: "none", border: "none", color: COLORS.INK_MUTED, cursor: "pointer" }}
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <div style={{ position: "relative" }}>
                                <button
                                  onClick={() => setOpenMergeDropdownIdx(openMergeDropdownIdx === idx ? null : idx)}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    border: `1px solid ${COLORS.TM_BLUE}`,
                                    background: "white",
                                    color: COLORS.TM_BLUE,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                  }}
                                >
                                  <GitMerge size={14} /> Merge with Existing Member...
                                </button>

                                {/* Dropdown Menu */}
                                {openMergeDropdownIdx === idx && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      right: 0,
                                      top: "100%",
                                      marginTop: 4,
                                      width: 280,
                                      maxHeight: 220,
                                      overflowY: "auto",
                                      background: "white",
                                      borderRadius: 8,
                                      boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                                      border: `1px solid ${COLORS.LINE}`,
                                      zIndex: 100,
                                      padding: 4,
                                    }}
                                  >
                                    <div style={{ padding: "6px 10px", fontSize: 11, fontWeight: 700, color: COLORS.INK_MUTED, borderBottom: `1px solid ${COLORS.LINE}` }}>
                                      Select Roster Member to Merge Into:
                                    </div>
                                    {availableMergeTargets.map((target) => (
                                      <div
                                        key={target.id}
                                        onClick={() => handleSelectMergeTarget(idx, target.id)}
                                        style={{
                                          padding: "8px 10px",
                                          fontSize: 12,
                                          fontWeight: 600,
                                          color: COLORS.INK,
                                          cursor: "pointer",
                                          borderRadius: 4,
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                      >
                                        <span>{target.name}</span>
                                        {target.leaveDate && (
                                          <span style={{ fontSize: 10, color: "#991B1B", background: "#FEE2E2", padding: "1px 4px", borderRadius: 3 }}>
                                            Inactive
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPDATED MEMBERS */}
          {activeTab === "update" && (
            <div>
              <div style={{ fontSize: 13, color: COLORS.INK_MUTED, fontWeight: 600, marginBottom: 12 }}>
                Auto-matched {diff.toUpdate.length} member(s) by Customer ID or Name. Details will be synced.
              </div>

              {diff.toUpdate.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: COLORS.INK_MUTED, fontSize: 14 }}>
                  No existing members required updates.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {diff.toUpdate.map(({ existingMember, tiRecord, changes, hasChanges }, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "12px 16px",
                        borderRadius: 10,
                        border: `1px solid ${COLORS.LINE}`,
                        background: "white",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.INK, display: "flex", alignItems: "center", gap: 8 }}>
                        {existingMember.name}
                        {tiRecord.credentials && (
                          <span style={{ fontSize: 11, background: "#E2E8F0", padding: "2px 6px", borderRadius: 4, color: COLORS.INK_MUTED }}>
                            {tiRecord.credentials}
                          </span>
                        )}
                        {changes.reactivate && (
                          <span style={{ fontSize: 11, background: "#DCFCE7", color: "#15803D", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                            Reactivating
                          </span>
                        )}
                      </div>

                      {hasChanges ? (
                        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                          {Object.entries(changes).map(([field, delta]) => {
                            if (field === "reactivate") return null;
                            return (
                              <div key={field} style={{ fontSize: 12, color: COLORS.INK_MUTED, display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontWeight: 600, textTransform: "capitalize", width: 90 }}>{field}:</span>
                                <span style={{ textDecoration: "line-through", color: "#94A3B8" }}>{delta.old || "(blank)"}</span>
                                <span>➔</span>
                                <span style={{ fontWeight: 700, color: COLORS.TM_BLUE }}>{delta.new}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: "#10B981", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                          <Check size={12} /> All fields up to date
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MISSING MEMBERS */}
          {activeTab === "missing" && (
            <div>
              <div style={{ fontSize: 13, color: COLORS.INK_MUTED, fontWeight: 600, marginBottom: 12 }}>
                {diff.missingMembers.length} member(s) active in the app were missing from the uploaded TI CSV.
              </div>

              {diff.missingMembers.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: COLORS.INK_MUTED, fontSize: 14 }}>
                  <CheckCircle2 size={36} color="#10B981" style={{ marginBottom: 8 }} />
                  <div>All current active members were found in the uploaded TI CSV!</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {diff.missingMembers.map((m) => {
                    const isMergedTarget = Object.values(merges).includes(m.id);
                    const action = missingActions[m.id] || "leave";

                    return (
                      <div
                        key={m.id}
                        style={{
                          padding: "12px 16px",
                          borderRadius: 10,
                          border: `1px solid ${isMergedTarget ? "#3B82F6" : COLORS.LINE}`,
                          background: isMergedTarget ? "#EFF6FF" : "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.INK, display: "flex", alignItems: "center", gap: 8 }}>
                            {m.name}
                            {isMergedTarget && (
                              <span style={{ fontSize: 11, background: "#DBEAFE", color: COLORS.TM_BLUE, padding: "2px 6px", borderRadius: 4, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                                <GitMerge size={12} /> Merged with incoming record
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: COLORS.INK_MUTED, marginTop: 2 }}>
                            {m.ec ? "ExCom Member" : "General Member"} • Joined: {fmtDate(m.joinDate)}
                          </div>
                        </div>

                        {!isMergedTarget && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button
                              onClick={() => setMissingAction(m.id, "leave")}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                border: action === "leave" ? "1px solid #EF4444" : `1px solid ${COLORS.LINE}`,
                                background: action === "leave" ? "#FEF2F2" : "white",
                                color: action === "leave" ? "#DC2626" : COLORS.INK_MUTED,
                                cursor: "pointer",
                              }}
                            >
                              Mark Left / Inactive
                            </button>
                            <button
                              onClick={() => setMissingAction(m.id, "keep")}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                border: action === "keep" ? `1px solid ${COLORS.TM_BLUE}` : `1px solid ${COLORS.LINE}`,
                                background: action === "keep" ? "#EFF6FF" : "white",
                                color: action === "keep" ? COLORS.TM_BLUE : COLORS.INK_MUTED,
                                cursor: "pointer",
                              }}
                            >
                              Keep Active
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "16px 24px",
            background: "#F8FAFC",
            borderTop: `1px solid ${COLORS.LINE}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: `1px solid ${COLORS.LINE}`,
              background: "white",
              color: COLORS.INK,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleApplySync}
            style={{
              padding: "10px 22px",
              borderRadius: 8,
              border: "none",
              background: `linear-gradient(135deg, ${COLORS.TM_BLUE} 0%, #0f3d61 100%)`,
              color: "white",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 2px 8px rgba(0,65,101,0.25)",
            }}
          >
            <Check size={16} /> Confirm & Sync Roster ({selectedToAdd.size} New, {diff.toUpdate.length + totalMergesCount} Updates/Merges)
          </button>
        </div>
      </div>
    </div>
  );
}
