"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { X, AlertCircle, CheckCircle, Info, Wifi, AlertTriangle } from 'lucide-react';

export type ModalType = 'info' | 'success' | 'error' | 'warning';

export interface ModalState {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  isConfirm: boolean;
}

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'assignment' | 'chat' | 'grade' | 'system';
  timestamp: string;
  isRead: boolean;
  link?: string;
}

interface NotificationContextType {
  showAlert: (message: string, type?: ModalType, title?: string) => void;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
  showToast: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error', category?: 'assignment' | 'chat' | 'grade' | 'system', link?: string) => void;
  isOffline: boolean;
  notifications: NotificationRecord[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const NOTIFICATIONS_STORAGE_KEY = "iedu_notifications_history";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    isConfirm: false
  });

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmPromise, setConfirmPromise] = useState<{ resolve: (val: boolean) => void } | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  // Fetch real notifications from backend
  const fetchBackendNotifications = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('eam_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/notifications?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.notifications) && data.notifications.length > 0) {
          setNotifications(data.notifications);
          localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(data.notifications));
        }
      }
    } catch (e) {
      // Offline fallback: keep localStorage data
    }
  }, []);

  // Load notification history on mount and sync with backend
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load notifications history', e);
    }
    fetchBackendNotifications();
  }, [fetchBackendNotifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const next = prev.map(n => n.id === id ? { ...n, isRead: true } : n);
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    const token = typeof window !== 'undefined' ? localStorage.getItem('eam_token') : null;
    if (token) {
      fetch(`${API_URL}/notifications/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, isRead: true }));
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    const token = typeof window !== 'undefined' ? localStorage.getItem('eam_token') : null;
    if (token) {
      fetch(`${API_URL}/notifications/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    try {
      localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
    } catch (e) {}
    const token = typeof window !== 'undefined' ? localStorage.getItem('eam_token') : null;
    if (token) {
      fetch(`${API_URL}/notifications/clear-all`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const showToast = useCallback((
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    category: 'assignment' | 'chat' | 'grade' | 'system' = 'system',
    link?: string
  ) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);

    // Save into notification history
    setNotifications(prev => {
      const newRecord: NotificationRecord = {
        id,
        title,
        message,
        type,
        category,
        timestamp: new Date().toISOString(),
        isRead: false,
        link,
      };
      const next = [newRecord, ...prev].slice(0, 50);
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  // Connect to SSE notifications stream with resilient exponential backoff
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('eam_token');
    if (!token) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let retryDelay = 1000; // start with 1s
    const MAX_RETRY_DELAY = 30000; // max 30s
    let isCleanedUp = false;

    const connectSSE = () => {
      if (isCleanedUp) return;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      try {
        eventSource = new EventSource(`${API_URL}/notifications/stream?token=${encodeURIComponent(token)}`);

        eventSource.onopen = () => {
          // Reset retry delay on successful connection
          retryDelay = 1000;
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data.type && data.type !== 'CONNECTED') {
              const toastType = data.type === 'ERROR' ? 'error' : 
                                data.type === 'WARNING' ? 'warning' :
                                data.type === 'SUCCESS' || data.type === 'NEW_ASSIGNMENT' ? 'success' : 'info';
              const category = data.category || (data.type === 'NEW_ASSIGNMENT' ? 'assignment' :
                               data.type === 'CHAT' ? 'chat' :
                               data.type === 'GRADE' ? 'grade' : 'system');
              showToast(data.title || 'Thông báo mới', data.message || '', toastType, category, data.link);
              fetchBackendNotifications();
            }
          } catch (e) {
            // ignore non-json heartbeat pings
          }
        };

        eventSource.onerror = () => {
          if (isCleanedUp) return;
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }

          // Schedule reconnect with exponential backoff
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(() => {
            connectSSE();
          }, retryDelay);

          // Double the backoff up to max
          retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
        };
      } catch (err) {
        if (isCleanedUp) return;
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => {
          connectSSE();
        }, retryDelay);
        retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
      }
    };

    connectSSE();

    // Reconnect immediately when browser comes back online or tab becomes visible
    const handleImmediateReconnect = () => {
      if (document.visibilityState === "visible" && !isCleanedUp) {
        retryDelay = 1000;
        connectSSE();
      }
    };

    window.addEventListener("online", handleImmediateReconnect);
    document.addEventListener("visibilitychange", handleImmediateReconnect);

    return () => {
      isCleanedUp = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      window.removeEventListener("online", handleImmediateReconnect);
      document.removeEventListener("visibilitychange", handleImmediateReconnect);
    };
  }, [showToast]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      setIsOffline(!navigator.onLine);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showAlert = useCallback((message: string, type: ModalType = 'info', title?: string) => {
    const defaultTitles = {
      info: 'Thông báo',
      success: 'Thành công',
      error: 'Lỗi',
      warning: 'Cảnh báo'
    };
    setModal({
      isOpen: true,
      type,
      title: title || defaultTitles[type],
      message,
      isConfirm: false
    });
  }, []);

  const showConfirm = useCallback((message: string, title: string = 'Xác nhận') => {
    setModal({
      isOpen: true,
      type: 'warning',
      title,
      message,
      isConfirm: true
    });
    return new Promise<boolean>((resolve) => {
      setConfirmPromise({ resolve });
    });
  }, []);

  const handleClose = useCallback(() => {
    setModal(prev => ({ ...prev, isOpen: false }));
    if (confirmPromise) {
      confirmPromise.resolve(false);
      setConfirmPromise(null);
    }
  }, [confirmPromise]);

  const handleConfirmAction = useCallback(() => {
    setModal(prev => ({ ...prev, isOpen: false }));
    if (confirmPromise) {
      confirmPromise.resolve(true);
      setConfirmPromise(null);
    }
  }, [confirmPromise]);

  return (
    <NotificationContext.Provider value={{
      showAlert,
      showConfirm,
      showToast,
      isOffline,
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      clearAllNotifications
    }}>
      {children}
      
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-[120] flex flex-col gap-3 max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div 
            key={t.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-xl backdrop-blur-md border flex items-start gap-3 animate-slide-down transition-all ${
              t.type === 'success' ? 'bg-white/95 border-emerald-200 text-emerald-950 shadow-emerald-500/10' :
              t.type === 'error' ? 'bg-white/95 border-rose-200 text-rose-950 shadow-rose-500/10' :
              t.type === 'warning' ? 'bg-white/95 border-amber-200 text-amber-950 shadow-amber-500/10' :
              'bg-white/95 border-blue-200 text-blue-950 shadow-blue-500/10'
            }`}
          >
            <div className={`p-2 rounded-xl mt-0.5 ${
              t.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
              t.type === 'error' ? 'bg-rose-100 text-rose-600' :
              t.type === 'warning' ? 'bg-amber-100 text-amber-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              {t.type === 'success' && <CheckCircle size={18} />}
              {t.type === 'error' && <AlertCircle size={18} />}
              {t.type === 'warning' && <AlertTriangle size={18} />}
              {t.type === 'info' && <Info size={18} />}
            </div>
            <div className="flex-1 pr-2">
              <h4 className="text-sm font-bold leading-snug">{t.title}</h4>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{t.message}</p>
            </div>
            <button 
              onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
              className="text-gray-400 hover:text-gray-700 p-1"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Network Status Bar */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white px-4 py-3 flex items-center justify-center gap-3 animate-slide-down shadow-lg">
          <Wifi size={20} className="animate-pulse" />
          <span className="text-sm font-bold tracking-wide">Mất kết nối Internet. Vui lòng kiểm tra lại đường truyền!</span>
        </div>
      )}

      {/* Global Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 !mt-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={handleClose} />
          <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-gray-100">
            <div className={`h-2.5 w-full ${
              modal.type === 'success' ? 'bg-green-500' :
              modal.type === 'error' ? 'bg-red-500' :
              modal.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
            }`} />
            
            <div className="p-10">
              <div className="flex flex-col items-center text-center mb-8">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-sm ${
                  modal.type === 'success' ? 'bg-green-50 text-green-600' :
                  modal.type === 'error' ? 'bg-red-50 text-red-600' :
                  modal.type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                }`}>
                  {modal.type === 'success' && <CheckCircle size={40} />}
                  {modal.type === 'error' && <AlertCircle size={40} />}
                  {modal.type === 'warning' && <AlertTriangle size={40} />}
                  {modal.type === 'info' && <Info size={40} />}
                </div>
                <h3 className="text-xl font-bold text-[var(--ink-1)] leading-tight">{modal.title}</h3>
              </div>
              
              <p className="text-gray-600 text-center leading-relaxed mb-10 text-lg">{modal.message}</p>
              
              <div className="flex gap-4">
                {modal.isConfirm ? (
                  <>
                    <button 
                      onClick={handleClose}
                      className="flex-1 px-6 py-4 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-2xl transition-all border border-gray-100"
                    >
                      Hủy bỏ
                    </button>
                    <button 
                      onClick={handleConfirmAction}
                      className={`flex-1 px-6 py-4 text-white font-bold rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] ${
                        modal.type === 'success' ? 'bg-green-600 hover:bg-green-700 shadow-green-100' :
                        modal.type === 'error' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' :
                        modal.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-100' : 
                        'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
                      }`}
                    >
                      Xác nhận
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleClose}
                    className="w-full px-6 py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-2xl shadow-xl shadow-gray-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Đóng
                  </button>
                )}
              </div>
            </div>
            
            <button 
              onClick={handleClose}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
