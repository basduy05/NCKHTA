"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext";
import { usePresence } from "../../hooks/usePresence";
import {
  Search, Plus, Send, Users, User, Smile, MoreVertical,
  Check, CheckCheck, RefreshCw, X, Hash, MessageSquare,
  Sparkles, Circle
} from "lucide-react";

interface ChatMember {
  id: number;
  name: string;
  email: string;
  role?: string;
  is_online?: boolean;
}

interface ChatRoom {
  id: number;
  name: string;
  room_type: "direct" | "group";
  avatar_url?: string;
  created_by?: number;
  updated_at: string;
  my_role?: string;
  latest_message?: {
    id: number;
    content: string;
    sender_id: number;
    sender_name: string;
    created_at: string;
  };
  unread_count?: number;
  other_user?: ChatMember;
  member_count?: number;
}

interface ChatMessage {
  id: number;
  room_id: number;
  sender_id: number;
  sender_name: string;
  sender_role?: string;
  message_type: "text" | "system" | "image";
  content: string;
  created_at: string;
}

interface Props {
  API_URL: string;
}

const COMMON_EMOJIS = ["👍", "❤️", "🔥", "😂", "🎉", "👏", "💡", "✨", "📚", "🙏"];

export default function ChatTab({ API_URL }: Props) {
  const { user, token, authFetch } = useAuth();
  const { isUserOnline } = usePresence();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // State
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [roomFilter, setRoomFilter] = useState<"all" | "direct" | "group">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [typingUsers, setTypingUsers] = useState<{ [userId: number]: string }>({});

  // Modals
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [userSearchText, setUserSearchText] = useState("");
  const [searchedUsers, setSearchedUsers] = useState<ChatMember[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Group creation form
  const [groupName, setGroupName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Refs
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeRoom = rooms.find(r => r.id === activeRoomId) || null;

  // Scroll to bottom helper
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  // 1. Fetch Rooms List
  const fetchRooms = useCallback(async (selectFirst = false) => {
    if (!token) return;
    try {
      const res = await authFetch(`${API_URL}/chat/rooms`);
      if (res.ok) {
        const data: ChatRoom[] = await res.json();
        setRooms(data);
        if (selectFirst && data.length > 0 && !activeRoomId) {
          setActiveRoomId(data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load rooms", e);
    } finally {
      setIsLoadingRooms(false);
    }
  }, [token, API_URL, authFetch, activeRoomId]);

  useEffect(() => {
    fetchRooms(true);
  }, [fetchRooms]);

  // 2. Fetch Messages for active room
  const fetchMessages = useCallback(async (roomId: number) => {
    if (!token) return;
    setIsLoadingMessages(true);
    try {
      const res = await authFetch(`${API_URL}/chat/rooms/${roomId}/messages?limit=60`);
      if (res.ok) {
        const data: ChatMessage[] = await res.json();
        setMessages(data);
        setTimeout(() => scrollToBottom(false), 50);
      }
      // Mark as read
      authFetch(`${API_URL}/chat/rooms/${roomId}/read`, { method: "POST" });
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, unread_count: 0 } : r));
    } catch (e) {
      console.error("Failed to fetch messages", e);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [token, API_URL, authFetch]);

  useEffect(() => {
    if (activeRoomId) {
      fetchMessages(activeRoomId);
    } else {
      setMessages([]);
    }
  }, [activeRoomId, fetchMessages]);

  // 3. WebSocket Setup for Active Room
  useEffect(() => {
    if (!activeRoomId || !token) return;

    // Build WS URL
    const wsBase = API_URL.replace(/^http/, "ws");
    const wsUrl = `${wsBase}/chat/ws/${activeRoomId}?token=${token}`;

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      // connected
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);

        if (data.type === "message" && data.message) {
          const newMsg: ChatMessage = data.message;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom(true);

          // Update room latest_message in rooms list
          setRooms(prev => prev.map(r => {
            if (r.id === newMsg.room_id) {
              return {
                ...r,
                latest_message: {
                  id: newMsg.id,
                  content: newMsg.content,
                  sender_id: newMsg.sender_id,
                  sender_name: newMsg.sender_name,
                  created_at: newMsg.created_at
                },
                updated_at: newMsg.created_at
              };
            }
            return r;
          }));
        } else if (data.type === "typing") {
          const { user_id, user_name, is_typing } = data;
          if (user_id !== user?.id) {
            setTypingUsers(prev => {
              const updated = { ...prev };
              if (is_typing) {
                updated[user_id] = user_name;
              } else {
                delete updated[user_id];
              }
              return updated;
            });
          }
        }
      } catch (err) {
        console.error("WS message parse error:", err);
      }
    };

    ws.onerror = (err) => {
      console.warn("WebSocket error:", err);
    };

    ws.onclose = () => {
      // Reconnect after 3s if still in the same room
      reconnectTimeoutRef.current = setTimeout(() => {
        if (activeRoomId) {
          // Reconnection will trigger through state or fetch
        }
      }, 3000);
    };

    // Heartbeat ping interval to keep connection active
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [activeRoomId, token, API_URL, user?.id]);

  // 4. Send message handler
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || !activeRoomId) return;

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "message",
        content: trimmed,
        message_type: "text"
      }));
      setInputText("");

      // Notify stop typing
      socketRef.current.send(JSON.stringify({
        type: "typing",
        is_typing: false
      }));
    }
  };

  // 5. Typing notification throttle
  const handleInputChange = (val: string) => {
    setInputText(val);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "typing",
        is_typing: true
      }));

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: "typing",
            is_typing: false
          }));
        }
      }, 2000);
    }
  };

  // 6. User search for new direct chat
  const searchUsers = async (query: string) => {
    setUserSearchText(query);
    setIsSearchingUsers(true);
    try {
      const res = await authFetch(`${API_URL}/chat/users/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const list = await res.json();
        setSearchedUsers(list);
      }
    } catch {
      // ignore
    } finally {
      setIsSearchingUsers(false);
    }
  };

  // 7. Start Direct Chat with user
  const startDirectChat = async (targetUserId: number) => {
    try {
      const res = await authFetch(`${API_URL}/chat/rooms/direct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id: targetUserId })
      });
      if (res.ok) {
        const room = await res.json();
        setShowNewChatModal(false);
        setUserSearchText("");
        setSearchedUsers([]);
        await fetchRooms(false);
        setActiveRoomId(room.id);
      }
    } catch (err) {
      console.error("Failed to start direct chat", err);
    }
  };

  // 8. Create Group Room
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length === 0) return;

    setIsCreatingGroup(true);
    try {
      const res = await authFetch(`${API_URL}/chat/rooms/group`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          member_ids: selectedUserIds
        })
      });
      if (res.ok) {
        const room = await res.json();
        setShowNewGroupModal(false);
        setGroupName("");
        setSelectedUserIds([]);
        await fetchRooms(false);
        setActiveRoomId(room.id);
      }
    } catch (err) {
      console.error("Failed to create group", err);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Filter rooms
  const filteredRooms = rooms.filter(r => {
    if (roomFilter === "direct" && r.room_type !== "direct") return false;
    if (roomFilter === "group" && r.room_type !== "group") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (r.name || r.other_user?.name || "").toLowerCase();
      return name.includes(q);
    }
    return true;
  });

  const typingNames = Object.values(typingUsers);

  return (
    <div className="flex h-[calc(100vh-145px)] min-h-[580px] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      
      {/* ── LEFT SIDEBAR: Conversations List ──────────────────────────── */}
      <div className="w-80 md:w-96 flex-shrink-0 flex flex-col border-r border-gray-200 bg-gray-50/50">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center font-bold">
              <MessageSquare size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">Tin nhắn</h2>
              <p className="text-xs text-gray-500">Trò chuyện trực tuyến</p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              id="btn-new-chat"
              type="button"
              onClick={() => { setShowNewChatModal(true); searchUsers(""); }}
              title="Tin nhắn mới"
              className="p-2 text-gray-600 hover:text-[var(--brand)] hover:bg-gray-100 rounded-lg transition"
            >
              <Plus size={18} />
            </button>
            <button
              id="btn-new-group"
              type="button"
              onClick={() => { setShowNewGroupModal(true); searchUsers(""); }}
              title="Tạo nhóm"
              className="p-2 text-gray-600 hover:text-[var(--brand)] hover:bg-gray-100 rounded-lg transition"
            >
              <Users size={18} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="p-3 bg-white border-b border-gray-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm hội thoại..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 transition"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center space-x-1 mt-2.5">
            {[
              { id: "all", label: "Tất cả" },
              { id: "direct", label: "Cá nhân" },
              { id: "group", label: "Nhóm" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRoomFilter(tab.id as any)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  roomFilter === tab.id
                    ? "bg-[var(--brand)] text-white shadow-xs"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {isLoadingRooms ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-xs">
              <RefreshCw size={20} className="animate-spin mb-2 text-[var(--brand)]" />
              Đang tải danh sách...
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-gray-600">Chưa có cuộc trò chuyện nào</p>
              <p className="mt-1">Bắt đầu trò chuyện với bạn bè hoặc lập nhóm học tập.</p>
              <div className="mt-4 flex items-center justify-center space-x-2">
                <button
                  type="button"
                  onClick={() => { setShowNewChatModal(true); searchUsers(""); }}
                  className="px-3 py-1.5 bg-[var(--brand)] text-white font-medium rounded-lg text-xs hover:bg-[var(--brand-dark)] transition shadow-xs"
                >
                  + Tin nhắn mới
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewGroupModal(true); searchUsers(""); }}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 font-medium rounded-lg text-xs hover:bg-gray-300 transition"
                >
                  Tạo nhóm
                </button>
              </div>
            </div>
          ) : (
            filteredRooms.map(room => {
              const isDirect = room.room_type === "direct";
              const targetUser = room.other_user;
              const isOnline = isDirect && targetUser ? isUserOnline(targetUser.id) : false;
              const isSelected = room.id === activeRoomId;
              const displayName = isDirect ? (targetUser?.name || room.name || "Người dùng") : room.name;

              return (
                <div
                  key={room.id}
                  onClick={() => setActiveRoomId(room.id)}
                  className={`p-3.5 flex items-center space-x-3 cursor-pointer transition select-none ${
                    isSelected
                      ? "bg-[var(--brand)]/10 border-l-4 border-[var(--brand)]"
                      : "hover:bg-white/80"
                  }`}
                >
                  {/* Avatar with online dot */}
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {isDirect ? (
                        displayName.charAt(0).toUpperCase()
                      ) : (
                        <Users size={18} />
                      )}
                    </div>
                    {isDirect && (
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                          isOnline ? "bg-emerald-500" : "bg-gray-300"
                        }`}
                        title={isOnline ? "Đang online" : "Ngoại tuyến"}
                      />
                    )}
                  </div>

                  {/* Room details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">
                        {displayName}
                      </h4>
                      {room.latest_message && (
                        <span className="text-[10px] text-gray-400">
                          {new Date(room.latest_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500 truncate max-w-[170px]">
                        {room.latest_message ? (
                          <>
                            {room.latest_message.sender_id === user?.id ? "Bạn: " : ""}
                            {room.latest_message.content}
                          </>
                        ) : (
                          <span className="italic text-gray-400">Chưa có tin nhắn</span>
                        )}
                      </p>

                      {Boolean(room.unread_count && room.unread_count > 0) && (
                        <span className="ml-2 px-1.5 py-0.5 bg-[var(--brand)] text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                          {room.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT MAIN: Chat Messages Area ─────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white">
        {activeRoom ? (
          <>
            {/* Chat Top Header */}
            <div className="px-6 py-3.5 border-b border-gray-200 flex items-center justify-between bg-white shadow-xs z-10">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {activeRoom.room_type === "direct" ? (
                      (activeRoom.other_user?.name || activeRoom.name || "U").charAt(0).toUpperCase()
                    ) : (
                      <Users size={18} />
                    )}
                  </div>
                  {activeRoom.room_type === "direct" && activeRoom.other_user && (
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        isUserOnline(activeRoom.other_user.id) ? "bg-emerald-500" : "bg-gray-300"
                      }`}
                    />
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                    <span>{activeRoom.room_type === "direct" ? (activeRoom.other_user?.name || activeRoom.name) : activeRoom.name}</span>
                    {activeRoom.room_type === "group" && (
                      <span className="text-[11px] font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {activeRoom.member_count || 2} thành viên
                      </span>
                    )}
                  </h3>

                  <p className="text-xs text-gray-500 flex items-center space-x-1">
                    {activeRoom.room_type === "direct" && activeRoom.other_user ? (
                      isUserOnline(activeRoom.other_user.id) ? (
                        <span className="text-emerald-600 font-medium flex items-center">
                          <Circle size={8} className="fill-emerald-500 text-emerald-500 mr-1" /> Đang hoạt động
                        </span>
                      ) : (
                        <span>Ngoại tuyến</span>
                      )
                    ) : (
                      <span>Nhóm học tập iEdu</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/40">
              {isLoadingMessages ? (
                <div className="flex justify-center items-center py-16 text-gray-400 text-xs">
                  <RefreshCw size={20} className="animate-spin mb-2 text-[var(--brand)]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-xs text-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center mb-3">
                    <Sparkles size={24} />
                  </div>
                  <p className="font-semibold text-gray-700 text-sm">Gửi lời chào đầu tiên!</p>
                  <p className="text-gray-400 mt-1">Bắt đầu trao đổi bài học, từ vựng hoặc hỏi đáp cùng nhau.</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.sender_id === user?.id;
                  const isSystem = msg.message_type === "system";

                  if (isSystem) {
                    return (
                      <div key={msg.id || idx} className="flex justify-center my-2">
                        <span className="px-3 py-1 bg-gray-200/70 text-gray-600 text-[11px] rounded-full">
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex items-end space-x-2 ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      {!isMe && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-400 to-slate-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {msg.sender_name ? msg.sender_name.charAt(0).toUpperCase() : "U"}
                        </div>
                      )}

                      <div className={`max-w-[70%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        {!isMe && activeRoom.room_type === "group" && (
                          <span className="text-[11px] text-gray-500 font-medium ml-1 mb-0.5">
                            {msg.sender_name}
                          </span>
                        )}

                        <div
                          className={`px-4 py-2.5 rounded-2xl text-sm break-words shadow-2xs ${
                            isMe
                              ? "bg-[var(--brand)] text-white rounded-br-xs"
                              : "bg-white text-gray-800 border border-gray-200/80 rounded-bl-xs"
                          }`}
                        >
                          {msg.content}
                        </div>

                        <span className="text-[10px] text-gray-400 mt-1 px-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {typingNames.length > 0 && (
                <div className="flex items-center space-x-2 text-xs text-gray-400 italic">
                  <div className="flex space-x-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                  <span>{typingNames.join(", ")} đang soạn tin...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Emoji Bar */}
            <div className="px-6 pt-2 bg-white flex items-center space-x-2 overflow-x-auto">
              <span className="text-xs text-gray-400 flex items-center">
                <Smile size={14} className="mr-1" />
              </span>
              {COMMON_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setInputText(prev => prev + emoji)}
                  className="px-2 py-0.5 hover:bg-gray-100 rounded-lg text-sm transition"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Message Input Bar */}
            <div className="p-4 bg-white border-t border-gray-100">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Nhập tin nhắn..."
                  value={inputText}
                  onChange={e => handleInputChange(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 transition"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-3 bg-[var(--brand)] text-white rounded-xl hover:bg-[var(--brand-dark)] transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center justify-center"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-base font-bold text-gray-700">Chọn một cuộc trò chuyện</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              Chọn từ danh sách bên trái hoặc nhấn dấu + để bắt đầu nhắn tin với bạn học hoặc thầy cô.
            </p>
          </div>
        )}
      </div>

      {/* ── MODAL: New Direct Chat ─────────────────────────────────────── */}
      {/* ── MODAL: New Direct Chat ─────────────────────────────────────── */}
      {mounted && showNewChatModal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Tin nhắn mới</h3>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Tìm theo tên hoặc email..."
                  value={userSearchText}
                  onChange={e => searchUsers(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
                />
              </div>

              <div className="mt-4 max-h-64 overflow-y-auto divide-y divide-gray-100">
                {isSearchingUsers ? (
                  <div className="py-8 text-center text-xs text-gray-400">
                    <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-[var(--brand)]" />
                    Đang tìm kiếm...
                  </div>
                ) : searchedUsers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400">
                    {userSearchText ? "Không tìm thấy người dùng phù hợp." : "Nhập tên hoặc email để tìm bạn bè."}
                  </div>
                ) : (
                  searchedUsers.map(u => {
                    const online = isUserOnline(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => startDirectChat(u.id)}
                        className="py-3 px-2 flex items-center justify-between hover:bg-gray-50 rounded-xl cursor-pointer transition"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <span
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                online ? "bg-emerald-500" : "bg-gray-300"
                              }`}
                            />
                          </div>

                          <div>
                            <h4 className="text-sm font-semibold text-gray-800">{u.name}</h4>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>

                        <span className="text-xs text-[var(--brand)] font-semibold">Nhắn tin</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: New Group Chat ──────────────────────────────────────── */}
      {mounted && showNewGroupModal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Tạo nhóm học tập mới</h3>
              <button
                type="button"
                onClick={() => setShowNewGroupModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Tên nhóm</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nhóm Luyện Thi IELTS 7.0"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Chọn thành viên ({selectedUserIds.length} đã chọn)
                </label>
                <input
                  type="text"
                  placeholder="Tìm thành viên để thêm..."
                  value={userSearchText}
                  onChange={e => searchUsers(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-100 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 mb-2"
                />

                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl p-2">
                  {searchedUsers.length === 0 ? (
                    <div className="py-4 text-center text-xs text-gray-400">
                      Tìm kiếm người dùng để mời vào nhóm
                    </div>
                  ) : (
                    searchedUsers.map(u => {
                      const isSelected = selectedUserIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            setSelectedUserIds(prev =>
                              isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id]
                            );
                          }}
                          className="py-2 px-2 flex items-center justify-between hover:bg-gray-50 rounded-lg cursor-pointer transition"
                        >
                          <div className="flex items-center space-x-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{u.name}</p>
                              <p className="text-[10px] text-gray-400">{u.email}</p>
                            </div>
                          </div>

                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-[var(--brand)] focus:ring-0"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewGroupModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!groupName.trim() || selectedUserIds.length === 0 || isCreatingGroup}
                  className="flex-1 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white text-sm font-semibold rounded-xl transition disabled:opacity-40"
                >
                  {isCreatingGroup ? "Đang tạo..." : "Tạo nhóm"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
