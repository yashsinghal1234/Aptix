"use client";

import React, { useState } from "react";

export interface VolumeCategoryItem {
  label: string;
  value: string | number;
  percentage: number; // 0 to 100
  color: "emerald" | "blue" | "pink" | "amber" | "violet";
}

export interface StripedVolumeCardProps {
  title?: string;
  totalValue?: string;
  changeBadge?: {
    value: string;
    isPositive?: boolean;
  };
  categories?: VolumeCategoryItem[];
  theme?: "dark" | "light";
  className?: string;
}

const DEFAULT_CATEGORIES: VolumeCategoryItem[] = [
  { label: "Online Payments", value: "$26,800", percentage: 65, color: "emerald" },
  { label: "Subscriptions", value: "$10,400", percentage: 40, color: "blue" },
  { label: "In-Store Sales", value: "$4,340", percentage: 22, color: "pink" },
];

export function StripedVolumeCard({
  title = "Gross Volume",
  totalValue = "$41,540",
  changeBadge = { value: "15%", isPositive: true },
  categories = DEFAULT_CATEGORIES,
  theme = "dark",
  className = "",
}: StripedVolumeCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Distinct color palettes matching the green, blue, pink striped bars from the reference image
  const colorMap = {
    emerald: {
      bg: "bg-emerald-500",
      gradient: "repeating-linear-gradient(45deg, rgba(255,255,255,0.36) 0px, rgba(255,255,255,0.36) 3.5px, transparent 3.5px, transparent 7.5px), #10b981",
      glow: "shadow-[0_0_12px_rgba(16,185,129,0.3)]",
    },
    blue: {
      bg: "bg-blue-500",
      gradient: "repeating-linear-gradient(45deg, rgba(255,255,255,0.36) 0px, rgba(255,255,255,0.36) 3.5px, transparent 3.5px, transparent 7.5px), #3b82f6",
      glow: "shadow-[0_0_12px_rgba(59,130,246,0.3)]",
    },
    pink: {
      bg: "bg-pink-500",
      gradient: "repeating-linear-gradient(45deg, rgba(255,255,255,0.36) 0px, rgba(255,255,255,0.36) 3.5px, transparent 3.5px, transparent 7.5px), #ec4899",
      glow: "shadow-[0_0_12px_rgba(236,72,153,0.3)]",
    },
    amber: {
      bg: "bg-amber-500",
      gradient: "repeating-linear-gradient(45deg, rgba(255,255,255,0.36) 0px, rgba(255,255,255,0.36) 3.5px, transparent 3.5px, transparent 7.5px), #f59e0b",
      glow: "shadow-[0_0_12px_rgba(245,158,11,0.3)]",
    },
    violet: {
      bg: "bg-purple-500",
      gradient: "repeating-linear-gradient(45deg, rgba(255,255,255,0.36) 0px, rgba(255,255,255,0.36) 3.5px, transparent 3.5px, transparent 7.5px), #8b5cf6",
      glow: "shadow-[0_0_12px_rgba(139,92,246,0.3)]",
    },
  };

  const [currentTheme, setCurrentTheme] = useState<"dark" | "light">(theme);
  const isDark = currentTheme === "dark";

  return (
    <div
      className={`rounded-[32px] p-6 sm:p-7 transition-all duration-300 relative ${
        isDark
          ? "bg-[#0a0c10] border border-neutral-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-white"
          : "bg-white border border-neutral-200/80 shadow-[0_20px_40px_rgba(0,0,0,0.06)] text-neutral-900"
      } ${className}`}
    >
      {/* Top Header: Title & ••• More Options Button */}
      <div className="flex items-center justify-between">
        <h3
          className={`text-base sm:text-lg font-bold tracking-tight ${
            isDark ? "text-neutral-200" : "text-neutral-900"
          }`}
        >
          {title}
        </h3>

        {/* ••• Action Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isDark
                ? "border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900"
                : "border border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50"
            }`}
            aria-label="Options"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>

          {/* Simple Dropdown Menu */}
          {menuOpen && (
            <div
              className={`absolute right-0 mt-2 w-48 rounded-2xl p-1.5 shadow-xl border z-30 animate-in fade-in zoom-in-95 duration-150 ${
                isDark
                  ? "bg-[#12151e] border-neutral-800 text-neutral-300"
                  : "bg-white border-neutral-200 text-neutral-700"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setCurrentTheme(isDark ? "light" : "dark");
                  setMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                  isDark ? "hover:bg-neutral-800 hover:text-white text-neutral-300" : "hover:bg-neutral-100 text-neutral-700"
                }`}
              >
                <span>Switch to {isDark ? "Light" : "Dark"} Mode</span>
                {isDark ? (
                  <svg className="w-3.5 h-3.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                )}
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  isDark ? "hover:bg-neutral-800 hover:text-white" : "hover:bg-neutral-100"
                }`}
              >
                Export CSV Breakdown
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  isDark ? "hover:bg-neutral-800 hover:text-white" : "hover:bg-neutral-100"
                }`}
              >
                View Historical Log
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Metric & Percentage Badge */}
      <div className="flex items-center gap-3.5 mt-3 mb-6">
        <span
          className={`text-4xl sm:text-5xl font-black tracking-tight leading-none ${
            isDark ? "text-white" : "text-neutral-950"
          }`}
        >
          {totalValue}
        </span>

        {changeBadge && (
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-xs ${
              changeBadge.isPositive !== false
                ? isDark
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                : isDark
                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                : "bg-rose-50 text-rose-700 border border-rose-200/60"
            }`}
          >
            <span className="text-[10px]">
              {changeBadge.isPositive !== false ? "▲" : "▼"}
            </span>
            <span>{changeBadge.value}</span>
          </div>
        )}
      </div>

      {/* Subtle Horizontal Divider */}
      <div
        className={`w-full h-px mb-5 ${
          isDark ? "bg-neutral-800/80" : "bg-neutral-100"
        }`}
      />

      {/* Category Rows with Candy-Stripe Diagonal Hatched Progress Bars */}
      <div className="space-y-4 sm:space-y-5">
        {categories.map((cat, idx) => {
          const style = colorMap[cat.color] || colorMap.emerald;

          return (
            <div key={idx} className="space-y-1.5">
              {/* Category Label and Value */}
              <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                <span className={isDark ? "text-neutral-400" : "text-neutral-500"}>
                  {cat.label}
                </span>
                <span
                  className={`font-bold ${
                    isDark ? "text-neutral-200" : "text-neutral-900"
                  }`}
                >
                  {cat.value}
                </span>
              </div>

              {/* Progress Bar Track */}
              <div
                className={`w-full h-2.5 sm:h-3 rounded-full overflow-hidden ${
                  isDark ? "bg-neutral-900/90" : "bg-neutral-100"
                }`}
              >
                {/* Diagonal Striped Fill matching the user's reference image */}
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(Math.max(cat.percentage, 5), 100)}%`,
                    background: style.gradient,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
