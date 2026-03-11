"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, Smartphone, X, Lightbulb, ChevronRight, Info } from 'lucide-react';

const TIPS = [
  "Mẹo: Nhấn nút 'Hỏi AI' để giải thích chi tiết hơn về các từ vựng khó.",
  "Mẹo: Bạn có thể xem mối quan hệ giữa các từ trong phần Graph Database.",
  "Mẹo: Làm bài tập hàng ngày giúp bạn ghi nhớ từ vựng lâu hơn 70%.",
  "Mẹo: Sử dụng tai nghe khi làm bài nghe để có kết quả tốt nhất.",
  "Mẹo: Bạn có thể tùy chỉnh lộ trình học trong phần Cài đặt.",
  "Gợi ý: Trình duyệt Chrome trên máy tính cho trải nghiệm mượt mà nhất."
];

export default function ScreenTips() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  // Check display size and session state
  useEffect(() => {
    const checkSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      
      const dismissed = sessionStorage.getItem('screen_tips_dismissed');
      if (!dismissed) {
        setIsVisible(true);
      }
    };

    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  // Rotate tips
  useEffect(() => {
    if (!isVisible || isMinimized) return;
    
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % TIPS.length);
    }, 8000);
    
    return () => clearInterval(interval);
  }, [isVisible, isMinimized]);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('screen_tips_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed z-[60] transition-all duration-500 ease-in-out ${
        isMinimized 
          ? 'bottom-6 left-6 w-12 h-12 rounded-full cursor-pointer hover:scale-110 shadow-lg' 
          : 'bottom-6 left-6 right-6 lg:right-auto lg:w-[400px] rounded-2xl'
      } bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-1 overflow-hidden group`}
      onClick={() => isMinimized && setIsMinimized(false)}
    >
      {isMinimized ? (
        <div className="flex items-center justify-center w-full h-full text-blue-600">
          <Lightbulb className="w-6 h-6 animate-pulse-soft" />
        </div>
      ) : (
        <div className="p-4 relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600/10 p-1.5 rounded-lg">
                {isMobile ? (
                  <Smartphone className="w-4 h-4 text-blue-600" />
                ) : (
                  <Lightbulb className="w-4 h-4 text-blue-600 animate-pulse-soft" />
                )}
              </div>
              <span className="text-sm font-semibold text-gray-800">
                {isMobile ? 'Gợi ý thiết bị' : 'Mẹo học tập'}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
                className="p-1 hover:bg-gray-100/50 rounded-md transition text-gray-400 group-hover:text-gray-600"
                title="Thu nhỏ"
              >
                <ChevronRight className="w-4 h-4 rotate-90" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
                className="p-1 hover:bg-red-50 rounded-md transition text-gray-400 hover:text-red-500"
                title="Đóng vĩnh viễn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-3 animate-fade-in">
            {isMobile && (
              <div className="bg-amber-50/50 border border-amber-200/50 p-3 rounded-xl flex gap-3 items-start">
                <Monitor className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-tight">Khuyên dùng trên máy tính</p>
                  <p className="text-[11px] text-amber-700 leading-relaxed mt-1">
                    Để học tập hiệu quả nhất với Đồ thị Tri thức (Graph) và các bài tập AI, bạn nên dùng trình duyệt Chrome trên máy tính.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-1">
              <div className="bg-blue-500 w-1 h-auto min-h-[40px] rounded-full shrink-0"></div>
              <p className="text-sm text-gray-700 leading-relaxed font-medium transition-all duration-500">
                {TIPS[currentTip]}
              </p>
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center text-[10px] text-gray-400 font-medium">
            <span>Tự động chuyển sau 8s</span>
            <div className="flex gap-1">
              {TIPS.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1 rounded-full transition-all duration-300 ${i === currentTip ? 'w-4 bg-blue-500' : 'w-1 bg-gray-200'}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
