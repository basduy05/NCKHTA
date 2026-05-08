"use client";
import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  /** On mobile, render as a bottom sheet instead of a centred dialog. Default true. */
  mobileSheet?: boolean;
  closeOnBackdrop?: boolean;
}

const sizeClass: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  mobileSheet = true,
  closeOnBackdrop = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={() => closeOnBackdrop && onClose()}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative bg-white w-full ${sizeClass[size]}
          ${mobileSheet
            ? "rounded-t-3xl md:rounded-3xl pb-safe"
            : "rounded-3xl"}
          shadow-2xl overflow-hidden flex flex-col max-h-[90vh]
          animate-duo-pop`}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 shrink-0">
            <h3 className="text-lg font-extrabold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="p-2 -mr-2 rounded-xl text-gray-500 hover:bg-gray-100 transition"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="px-6 py-3 flex-1 min-h-0 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-6 py-4 bg-gray-50/60 flex justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
