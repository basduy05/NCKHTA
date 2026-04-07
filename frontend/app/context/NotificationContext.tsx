"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { X, AlertCircle, CheckCircle, Info, Wifi, AlertTriangle } from 'lucide-react';

type ModalType = 'info' | 'success' | 'error' | 'warning';

interface ModalState {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  isConfirm: boolean;
}

interface NotificationContextType {
  showAlert: (message: string, type?: ModalType, title?: string) => void;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
  isOffline: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    isConfirm: false
  });

  const [confirmPromise, setConfirmPromise] = useState<{ resolve: (val: boolean) => void } | null>(null);
  const [isOffline, setIsOffline] = useState(false);

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
    <NotificationContext.Provider value={{ showAlert, showConfirm, isOffline }}>
      {children}
      
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
                <h3 className="text-2xl font-black text-gray-900 leading-tight">{modal.title}</h3>
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
