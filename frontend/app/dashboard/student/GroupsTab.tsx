"use client";
import React, { useState, useEffect } from "react";
import {
  Users, Plus, LogIn, Trophy, Target, Copy, Check, Sparkles,
  ArrowRight, ShieldCheck, Flame, BookMarked, UserPlus, LogOut,
  Calendar, Layers, Clock
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";

interface Group {
  id: number;
  name: string;
  description?: string;
  invite_code: string;
  owner_name?: string;
  member_count: number;
  max_members?: number;
  my_role?: string;
  is_joined?: number;
}

interface Member {
  id: number;
  name: string;
  email: string;
  points: number;
  vocab_count: number;
  role: string;
}

interface Challenge {
  id: number;
  title: string;
  target_type: string;
  target_value: number;
  end_date?: string;
}

interface GroupsTabProps {
  API_URL: string;
}

export default function GroupsTab({ API_URL }: GroupsTabProps) {
  const { authFetch, user } = useAuth();
  const { showAlert, showConfirm } = useNotification();

  const [activeSubTab, setActiveSubTab] = useState<"my" | "explore">("my");
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Group Details State
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // New challenge modal
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeTarget, setChallengeTarget] = useState(50);
  const [creatingChallenge, setCreatingChallenge] = useState(false);

  const fetchMyGroups = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_URL}/groups/my-groups`);
      if (res.ok) {
        setMyGroups(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicGroups = async () => {
    try {
      const res = await authFetch(`${API_URL}/groups/public`);
      if (res.ok) {
        setPublicGroups(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMyGroups();
    fetchPublicGroups();
  }, []);

  const openGroupDetails = async (groupId: number) => {
    setSelectedGroupId(groupId);
    setLoadingDetails(true);
    try {
      const res = await authFetch(`${API_URL}/groups/${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedGroup(data.group);
        setMembers(data.members || []);
        setChallenges(data.challenges || []);
      }
    } catch (e) {
      console.error(e);
      showAlert("Lỗi khi tải thông tin nhóm.", "error");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!createName.trim()) return showAlert("Vui lòng nhập tên nhóm!", "warning");
    try {
      setCreating(true);
      const res = await authFetch(`${API_URL}/groups/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim(), description: createDesc.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        showAlert("Tạo nhóm thành công!", "success");
        setShowCreateModal(false);
        setCreateName("");
        setCreateDesc("");
        await fetchMyGroups();
        openGroupDetails(json.group_id);
      } else {
        showAlert("Không thể tạo nhóm lúc này.", "error");
      }
    } catch (e) {
      console.error(e);
      showAlert("Lỗi kết nối khi tạo nhóm.", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!inviteCodeInput.trim()) return showAlert("Vui lòng nhập mã mời 6 ký tự!", "warning");
    try {
      setJoining(true);
      const res = await authFetch(`${API_URL}/groups/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: inviteCodeInput.trim().toUpperCase() }),
      });
      const json = await res.json();
      if (res.ok) {
        showAlert(json.message || "Tham gia nhóm thành công!", "success");
        setInviteCodeInput("");
        await fetchMyGroups();
        if (json.group_id) openGroupDetails(json.group_id);
      } else {
        showAlert(json.detail || "Mã mời không đúng hoặc nhóm đã đầy.", "error");
      }
    } catch (e) {
      console.error(e);
      showAlert("Lỗi kết nối khi tham gia nhóm.", "error");
    } finally {
      setJoining(false);
    }
  };

  const handleCreateChallenge = async () => {
    if (!challengeTitle.trim() || !selectedGroupId) return;
    try {
      setCreatingChallenge(true);
      const res = await authFetch(`${API_URL}/groups/${selectedGroupId}/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: challengeTitle.trim(),
          target_type: "words_learned",
          target_value: Number(challengeTarget) || 50,
        }),
      });
      if (res.ok) {
        showAlert("Đã tạo thử thách nhóm mới!", "success");
        setShowChallengeModal(false);
        setChallengeTitle("");
        openGroupDetails(selectedGroupId);
      }
    } catch (e) {
      console.error(e);
      showAlert("Lỗi khi tạo thử thách.", "error");
    } finally {
      setCreatingChallenge(false);
    }
  };

  const handleLeaveGroup = async (groupId: number) => {
    const confirmed = await showConfirm("Bạn có chắc chắn muốn rời khỏi nhóm này không?");
    if (!confirmed) return;
    try {
      const res = await authFetch(`${API_URL}/groups/${groupId}/leave`, { method: "DELETE" });
      if (res.ok) {
        showAlert("Đã rời nhóm thành công.", "info");
        setSelectedGroupId(null);
        fetchMyGroups();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyInviteCode = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-600 via-emerald-600 to-indigo-700 text-white p-6 md:p-8 shadow-lg">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-3">
            <Users size={14} className="text-yellow-300" />
            <span>Cộng đồng & Thi đua học tập</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Nhóm Học tập & Thử thách (Study Groups)
          </h1>
          <p className="text-teal-100 text-sm md:text-base leading-relaxed">
            Học cùng bạn bè, chia sẻ mục tiêu mỗi tuần và cùng nhau tích lũy từ vựng. Thi đua trên bảng xếp hạng nhóm để nhận huy hiệu thành tích!
          </p>
        </div>
      </div>

      {/* Selected Group View */}
      {selectedGroupId && selectedGroup ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in duration-200">
          {/* Top navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => { setSelectedGroupId(null); setSelectedGroup(null); }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition"
            >
              ← Quay lại danh sách nhóm
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyInviteCode(selectedGroup.invite_code)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 text-xs font-bold transition hover:bg-teal-100"
                title="Sao chép mã mời chia sẻ cho bạn bè"
              >
                {copiedCode ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>Mã mời: {selectedGroup.invite_code}</span>
              </button>

              <button
                onClick={() => handleLeaveGroup(selectedGroup.id)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-red-50 hover:text-red-600 text-gray-500 text-xs transition"
              >
                <LogOut size={13} />
                <span>Rời nhóm</span>
              </button>
            </div>
          </div>

          {/* Group Header Info */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
                👥
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {selectedGroup.name}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedGroup.description || "Nhóm học tập tiếng Anh cùng iEdu"}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 font-medium">
                  <span>Trưởng nhóm: <strong>{selectedGroup.owner_name || "Học sinh"}</strong></span>
                  <span>•</span>
                  <span>{members.length} thành viên</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowChallengeModal(true)}
              className="px-4 py-2.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 font-semibold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Target size={15} /> Tạo thử thách mới
            </button>
          </div>

          {/* Leaderboard & Challenges Split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Members Leaderboard */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Trophy size={18} className="text-yellow-500" />
                  Bảng xếp hạng thành viên
                </h3>
                <span className="text-xs text-gray-400">Xếp theo điểm tích lũy</span>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                {members.map((m, idx) => (
                  <div key={m.id} className="p-4 flex items-center justify-between gap-3 hover:bg-gray-50/80 transition">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 text-center font-extrabold text-sm ${
                        idx === 0 ? "text-yellow-500" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-amber-600" : "text-gray-400"
                      }`}>
                        #{idx + 1}
                      </span>
                      <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 font-bold flex items-center justify-center text-sm border border-teal-100">
                        {m.name ? m.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-gray-900 dark:text-gray-100">
                            {m.name}
                          </p>
                          {m.role === "owner" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                              Trưởng nhóm
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          {m.vocab_count || 0} từ đã lưu
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-extrabold text-teal-600 dark:text-teal-400">
                        {m.points || 0}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">điểm</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Challenges Panel */}
            <div className="space-y-4">
              <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Target size={18} className="text-indigo-500" />
                Thử thách của nhóm
              </h3>

              {challenges.length === 0 ? (
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl p-6 text-center border border-dashed border-gray-200 text-gray-400 text-xs">
                  Chưa có thử thách nào đang diễn ra. Hãy bấm "Tạo thử thách mới"!
                </div>
              ) : (
                <div className="space-y-3">
                  {challenges.map((c) => (
                    <div key={c.id} className="bg-gradient-to-br from-indigo-50/50 to-teal-50/40 dark:from-gray-800 dark:to-gray-800 p-4 rounded-2xl border border-indigo-100/80 dark:border-gray-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 uppercase">
                          Thử thách
                        </span>
                        <span className="text-xs font-bold text-indigo-600">
                          Mục tiêu: {c.target_value} từ
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                        {c.title}
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Cùng nhau ôn tập và tích lũy đủ từ vựng trước thời hạn!
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Groups Directory */
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm">
            {/* Tabs */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setActiveSubTab("my")}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition ${
                  activeSubTab === "my"
                    ? "bg-white dark:bg-gray-900 text-teal-600 shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                Nhóm của tôi ({myGroups.length})
              </button>
              <button
                onClick={() => setActiveSubTab("explore")}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition ${
                  activeSubTab === "explore"
                    ? "bg-white dark:bg-gray-900 text-teal-600 shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                Khám phá nhóm ({publicGroups.length})
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  placeholder="Nhập mã mời..."
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  className="px-3 py-1 text-xs bg-transparent outline-none uppercase font-mono w-28 text-gray-800 dark:text-gray-200"
                  maxLength={6}
                />
                <button
                  onClick={handleJoinByCode}
                  disabled={joining || !inviteCodeInput.trim()}
                  className="px-3 py-1 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {joining ? "..." : "Tham gia"}
                </button>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus size={15} /> Tạo nhóm mới
              </button>
            </div>
          </div>

          {/* Groups Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-44 rounded-2xl bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : (activeSubTab === "my" ? myGroups : publicGroups).length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
              <Users size={48} className="mx-auto text-gray-300 mb-3" />
              <h3 className="font-bold text-gray-900 dark:text-gray-100">
                {activeSubTab === "my" ? "Bạn chưa tham gia nhóm học nào" : "Chưa có nhóm công khai"}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Hãy tạo một nhóm mới hoặc nhập mã mời của bạn bè để cùng học tập!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(activeSubTab === "my" ? myGroups : publicGroups).map((g) => (
                <div
                  key={g.id}
                  onClick={() => openGroupDetails(g.id)}
                  className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 p-5 shadow-sm hover:shadow-md hover:border-teal-300 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-lg">
                        👥
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold">
                        {g.member_count || 1} thành viên
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 group-hover:text-teal-600 transition">
                      {g.name}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                      {g.description || "Nhóm học tiếng Anh cùng thi đua mỗi ngày."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <span className="text-xs font-mono text-gray-400">
                      Mã: {g.invite_code}
                    </span>
                    <span className="text-xs font-semibold text-teal-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Vào nhóm <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Tạo nhóm học tập mới
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Tên nhóm</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Hội Chiến Thần Từ Vựng B2"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Mục tiêu / Mô tả nhóm</label>
                <textarea
                  rows={3}
                  placeholder="Ví dụ: Mỗi ngày học ít nhất 10 từ vựng và làm 1 quiz ngữ pháp..."
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-xs"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={creating}
                className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 transition disabled:opacity-50"
              >
                {creating ? "Đang tạo..." : "Xác nhận tạo nhóm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Challenge Modal */}
      {showChallengeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Tạo thử thách cho nhóm
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Tiêu đề thử thách</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chinh phục 50 từ vựng tuần này"
                  value={challengeTitle}
                  onChange={(e) => setChallengeTitle(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Mục tiêu số từ cần học</label>
                <input
                  type="number"
                  value={challengeTarget}
                  onChange={(e) => setChallengeTarget(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowChallengeModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-xs"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateChallenge}
                disabled={creatingChallenge}
                className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 transition disabled:opacity-50"
              >
                {creatingChallenge ? "Đang lưu..." : "Bắt đầu thử thách"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
