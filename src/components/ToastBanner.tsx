"use client";

import React from "react";

type ToastVariant = "success" | "error";

const VARIANT_STYLES: Record<ToastVariant, { body: string; glow: string; icon: string; title: string }> = {
  success: {
    body: "bg-gradient-to-r from-emerald-500 to-green-500",
    glow: "shadow-[0_8px_32px_rgba(34,197,94,0.35)]",
    icon: "text-emerald-500",
    title: "CONGRATULATIONS",
  },
  error: {
    body: "bg-gradient-to-r from-rose-500 to-red-500",
    glow: "shadow-[0_8px_32px_rgba(244,63,94,0.35)]",
    icon: "text-rose-500",
    title: "UH OHH!",
  },
};

export function ToastBanner({
  variant,
  title,
  message,
  onClose,
  alertId,
  shake = false,
}: {
  variant: ToastVariant;
  title?: string;
  message: string;
  onClose?: () => void;
  alertId?: string;
  shake?: boolean;
}) {
  const s = VARIANT_STYLES[variant];
  return (
    <div
      role="alert"
      aria-live="assertive"
      id={alertId}
      className={`relative overflow-hidden rounded-2xl ${s.body} ${s.glow} ${shake ? "animate-shake" : ""}`}
    >
      <div className="relative flex items-center gap-3 pl-20 sm:pl-24 pr-14 sm:pr-16 py-3.5 sm:py-4">
        {/* Left white disc with outline icon */}
        <span aria-hidden className="absolute -left-9 sm:-left-10 top-1/2 -translate-y-1/2 w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white" />
        <span className={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 ${s.icon}`}>
          {variant === "success" ? (
            <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          )}
        </span>

        {/* Copy */}
        <span className="relative flex-1 min-w-0">
          <span className="block text-white font-black tracking-[0.14em] text-xs sm:text-sm leading-tight">
            {title || s.title}
          </span>
          <span className="block text-white/90 text-[11px] sm:text-xs leading-snug mt-0.5">{message}</span>
        </span>

        {/* Right white disc with close */}
        <span aria-hidden className="absolute -right-9 sm:-right-10 top-1/2 -translate-y-1/2 w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white" />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss message"
            className={`absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 ${s.icon} hover:opacity-70 transition p-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
