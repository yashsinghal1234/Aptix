"use client";

import React, { useState } from "react";

// ============================================================================
// 1. Overview Control Header Component
// ============================================================================
export function ZentraOverviewHeader({
  title = "Overview",
  onAddWidget,
}: {
  title?: string;
  onAddWidget?: () => void;
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-2">
      {/* Title & Link Icon */}
      <div className="flex items-center gap-3">
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          {title}
        </h1>
        <button
          type="button"
          className="w-7 h-7 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center border border-neutral-800 transition shadow-xs cursor-pointer"
          title="Copy direct link"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        </button>
      </div>

      {/* Date & Filter Controls */}
      <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm font-medium">
        {/* Primary Date Range */}
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0d0f17] hover:bg-[#151926] text-neutral-200 border border-neutral-800/80 transition cursor-pointer shadow-xs"
        >
          <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Jan 01 – July 31</span>
          <svg className="w-3 h-3 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <span className="text-neutral-500 text-xs font-semibold px-0.5">compared to</span>

        {/* Comparison Date Range */}
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0d0f17] hover:bg-[#151926] text-neutral-200 border border-neutral-800/80 transition cursor-pointer shadow-xs"
        >
          <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Aug 01 – Dec 31</span>
          <svg className="w-3 h-3 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Frequency Dropdown */}
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0d0f17] hover:bg-[#151926] text-neutral-200 border border-neutral-800/80 transition cursor-pointer shadow-xs"
        >
          <span>Daily</span>
          <svg className="w-3 h-3 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Add Widget Button */}
        <button
          type="button"
          onClick={onAddWidget}
          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#181b24] hover:bg-[#222736] text-neutral-200 hover:text-white border border-neutral-700/60 font-semibold transition cursor-pointer shadow-xs ml-1"
        >
          <span>Add widget</span>
          <span className="text-base leading-none font-normal">+</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 2. Stepped 3D Funnel Waterfall Card ("Payments" / "Assessment Flow")
// ============================================================================
export function ZentraFunnelCard() {
  const [promptText, setPromptText] = useState(
    "I want to know what caused the drop-off from authorized to"
  );

  return (
    <div className="relative rounded-[28px] bg-[#090b11] border border-[#1b1f2e] p-6 sm:p-7 overflow-hidden shadow-2xl flex flex-col justify-between group">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Payments</h2>
        <button
          type="button"
          className="w-8 h-8 rounded-full hover:bg-neutral-800/60 text-neutral-500 hover:text-neutral-300 flex items-center justify-center transition cursor-pointer"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-5 gap-2 text-left mb-6">
        <div>
          <p className="text-[11px] sm:text-xs text-neutral-400 font-medium truncate">Initiated Payments</p>
          <p className="text-xl sm:text-2xl font-black text-neutral-200 mt-1">65.2k</p>
        </div>
        <div>
          <p className="text-[11px] sm:text-xs text-neutral-400 font-medium truncate">Authorized Payments</p>
          <p className="text-xl sm:text-2xl font-black text-neutral-200 mt-1">54.8k</p>
        </div>
        <div>
          <p className="text-[11px] sm:text-xs text-neutral-400 font-medium truncate">Successful Payments</p>
          <p className="text-xl sm:text-2xl font-black text-white mt-1">48.6k</p>
        </div>
        <div>
          <p className="text-[11px] sm:text-xs text-neutral-400 font-medium truncate">Payouts to Merchants</p>
          <p className="text-xl sm:text-2xl font-black text-neutral-300 mt-1">38.3k</p>
        </div>
        <div>
          <p className="text-[11px] sm:text-xs text-neutral-400 font-medium truncate">Completed Transactions</p>
          <p className="text-xl sm:text-2xl font-black text-neutral-300 mt-1">32.9k</p>
        </div>
      </div>

      {/* 3D Isometric Stepped Cascade Visual Graphic */}
      <div className="relative w-full h-48 sm:h-56 my-2">
        {/* Y-Axis Guidelines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-neutral-600 font-mono">
          <div className="border-b border-neutral-800/40 w-full pb-1">70k</div>
          <div className="border-b border-neutral-800/40 w-full pb-1">60k</div>
          <div className="border-b border-neutral-800/40 w-full pb-1">50k</div>
          <div className="border-b border-neutral-800/40 w-full pb-1">40k</div>
          <div className="border-b border-neutral-800/40 w-full pb-1">30k</div>
        </div>

        {/* Stepped Cascade Bars */}
        <div className="absolute inset-0 pl-7 flex items-end justify-between gap-1.5 sm:gap-2.5 pb-2">
          {/* Step 1: 65.2k */}
          <div className="relative w-[18%] h-[92%] flex flex-col justify-end">
            <div className="w-full h-full rounded-t-xl bg-gradient-to-b from-[#2563eb] to-[#1e3a8a] relative overflow-hidden shadow-[0_0_20px_rgba(37,99,235,0.3)] border-t border-x border-[#3b82f6]/50">
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0px, rgba(255,255,255,0.2) 2px, transparent 2px, transparent 8px)",
                }}
              />
              <div className="absolute -top-1 left-0 right-0 h-3 bg-gradient-to-r from-blue-300 to-indigo-300 rounded-full blur-[1px] opacity-75" />
            </div>
          </div>

          {/* Step 2: 54.8k */}
          <div className="relative w-[18%] h-[78%] flex flex-col justify-end">
            <div className="w-full h-full rounded-t-xl bg-gradient-to-b from-[#1d4ed8] to-[#172554] relative overflow-hidden border-t border-x border-[#2563eb]/40">
              <div
                className="absolute inset-0 opacity-35"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 2px, transparent 2px, transparent 8px)",
                }}
              />
              <div className="absolute -top-1 left-0 right-0 h-2.5 bg-blue-400 rounded-full blur-[1px] opacity-60" />
            </div>
          </div>

          {/* Step 3: 48.6k (Active / Highlighted Block) */}
          <div className="relative w-[18%] h-[68%] flex flex-col justify-end z-20">
            {/* Floating Tooltip */}
            <div className="absolute -top-12 -left-12 sm:-left-16 z-30 whitespace-nowrap bg-black/90 backdrop-blur-md text-white text-[10px] sm:text-xs font-semibold px-3 py-1.5 rounded-full border border-neutral-700 shadow-xl flex items-center gap-1.5 animate-bounce">
              <span className="font-bold text-white">48.6k</span>
              <span className="text-neutral-400">transactions</span>
              <span className="text-neutral-600">|</span>
              <span className="text-neutral-300">Conversion:</span>
              <span className="text-emerald-400 font-bold">89%</span>
              <span className="text-neutral-600">|</span>
              <span className="text-rose-400 font-bold">Drop-off: -11%</span>
            </div>

            <div className="w-full h-full rounded-t-xl bg-gradient-to-b from-[#3b82f6] via-[#2563eb] to-[#0f172a] relative overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.4)] border-t-2 border-x border-white/60">
              <div
                className="absolute inset-0 opacity-45"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, rgba(255,255,255,0.25) 0px, rgba(255,255,255,0.25) 2px, transparent 2px, transparent 8px)",
                }}
              />
              <div className="absolute -top-1.5 left-0 right-0 h-3 bg-white rounded-full blur-[1px] opacity-90" />
            </div>
          </div>

          {/* Step 4: 38.3k */}
          <div className="relative w-[18%] h-[54%] flex flex-col justify-end">
            <div className="w-full h-full rounded-t-xl bg-gradient-to-b from-[#1e40af] to-[#090d16] relative overflow-hidden border-t border-x border-blue-500/30">
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 2px, transparent 2px, transparent 8px)",
                }}
              />
              <div className="absolute -top-1 left-0 right-0 h-2 bg-blue-400 rounded-full blur-[1px] opacity-50" />
            </div>
          </div>

          {/* Step 5: 32.9k */}
          <div className="relative w-[18%] h-[46%] flex flex-col justify-end">
            <div className="w-full h-full rounded-t-xl bg-gradient-to-b from-[#172554] to-[#030712] relative overflow-hidden border-t border-x border-blue-600/25">
              <div
                className="absolute inset-0 opacity-25"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 2px, transparent 2px, transparent 8px)",
                }}
              />
              <div className="absolute -top-1 left-0 right-0 h-1.5 bg-blue-500 rounded-full blur-[1px] opacity-40" />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive AI Query Box at Bottom */}
      <div className="mt-4 pt-3 border-t border-neutral-800/80">
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
          <span className="flex items-center gap-1.5 font-medium text-neutral-300">
            <span className="text-amber-400 text-sm">✨</span> What would you like to explore next?
          </span>
          <button type="button" className="text-neutral-500 hover:text-white transition">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>

        <div className="relative flex items-center bg-[#0d0f17] border border-neutral-800 rounded-2xl px-4 py-2.5 shadow-inner focus-within:border-neutral-600 transition">
          <span className="text-xs sm:text-sm text-neutral-200 truncate flex-1">
            {promptText}
            <span className="inline-block ml-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 text-xs">
              /successful payments
            </span>
            <span className="inline-block w-1.5 h-4 bg-amber-400 ml-1.5 animate-pulse align-middle" />
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. Gross Volume Card with Diagonal Hatched Progress Bars
// ============================================================================
export function ZentraVolumeCard() {
  return (
    <div className="rounded-[28px] bg-[#090b11] border border-[#1b1f2e] p-6 sm:p-7 shadow-2xl flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-neutral-200 tracking-tight">Gross Volume</h2>
        <button
          type="button"
          className="w-8 h-8 rounded-full hover:bg-neutral-800/60 text-neutral-500 hover:text-neutral-300 flex items-center justify-center transition cursor-pointer"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </button>
      </div>

      {/* Main KPI Stat */}
      <div className="flex items-center gap-3 my-5">
        <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">$41,540</span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold text-xs">
          <span>▲</span> 15%
        </span>
      </div>

      {/* Segment Breakdown with Diagonal Hatched Progress Bars */}
      <div className="space-y-4 pt-2">
        {/* Item 1: Online Payments */}
        <div>
          <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
            <span className="text-neutral-400">Online Payments</span>
            <span className="text-white font-bold">$26,800</span>
          </div>
          <div className="w-full h-3.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/80 p-0.5">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{
                width: "82%",
                backgroundImage:
                  "repeating-linear-gradient(45deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 4px, transparent 4px, transparent 8px)",
              }}
            />
          </div>
        </div>

        {/* Item 2: Subscriptions */}
        <div>
          <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
            <span className="text-neutral-400">Subscriptions</span>
            <span className="text-white font-bold">$10,400</span>
          </div>
          <div className="w-full h-3.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/80 p-0.5">
            <div
              className="h-full rounded-full bg-[#3b82f6]"
              style={{
                width: "55%",
                backgroundImage:
                  "repeating-linear-gradient(45deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 4px, transparent 4px, transparent 8px)",
              }}
            />
          </div>
        </div>

        {/* Item 3: In-Store Sales */}
        <div>
          <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
            <span className="text-neutral-400">In-Store Sales</span>
            <span className="text-white font-bold">$4,340</span>
          </div>
          <div className="w-full h-3.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/80 p-0.5">
            <div
              className="h-full rounded-full bg-[#ec4899]"
              style={{
                width: "30%",
                backgroundImage:
                  "repeating-linear-gradient(45deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 4px, transparent 4px, transparent 8px)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. Stepped Line Retention Chart Card
// ============================================================================
export function ZentraRetentionCard() {
  return (
    <div className="rounded-[28px] bg-[#090b11] border border-[#1b1f2e] p-6 sm:p-7 shadow-2xl flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base sm:text-lg font-bold text-neutral-200 tracking-tight">Retention</h2>
        <button
          type="button"
          className="w-8 h-8 rounded-full hover:bg-neutral-800/60 text-neutral-500 hover:text-neutral-300 flex items-center justify-center transition cursor-pointer"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </button>
      </div>

      {/* Chart Canvas */}
      <div className="relative w-full h-44 my-2 flex flex-col justify-end">
        {/* Floating Tooltip Indicator */}
        <div className="absolute top-2 left-[36%] z-20 px-2.5 py-1 rounded-full bg-white text-black font-extrabold text-[11px] shadow-lg border border-neutral-200">
          42%
        </div>

        {/* Stepped SVG with vertical hatch pattern */}
        <svg className="w-full h-full overflow-visible" viewBox="0 0 300 120" preserveAspectRatio="none">
          <defs>
            <pattern id="pinkHatch" width="6" height="120" patternUnits="userSpaceOnUse">
              <line x1="3" y1="0" x2="3" y2="120" stroke="#f43f5e" strokeWidth="1" strokeOpacity="0.35" />
            </pattern>
          </defs>

          {/* Vertical hatch fill underneath the stepped curve */}
          <path
            d="M 10 95 L 45 95 L 45 75 L 75 75 L 75 65 L 115 65 L 115 35 L 135 35 L 135 48 L 155 48 L 155 58 L 180 58 L 180 90 L 220 90 L 220 78 L 260 78 L 260 88 L 290 88 L 290 120 L 10 120 Z"
            fill="url(#pinkHatch)"
          />

          {/* Stepped line path */}
          <path
            d="M 10 95 L 45 95 L 45 75 L 75 75 L 75 65 L 115 65 L 115 35 L 135 35 L 135 48 L 155 48 L 155 58 L 180 58 L 180 90 L 220 90 L 220 78 L 260 78 L 260 88 L 290 88"
            fill="none"
            stroke="#f43f5e"
            strokeWidth="2.5"
            strokeLinejoin="miter"
          />
        </svg>

        {/* X-Axis Months */}
        <div className="flex justify-between items-center text-[10px] text-neutral-500 font-semibold pt-2 border-t border-neutral-800/80">
          <span>Jan</span>
          <span>Feb</span>
          <span>Mar</span>
          <span>Apr</span>
          <span>May</span>
          <span>Jun</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. Activity Dot-Matrix Cards (Transactions & Customers)
// ============================================================================
export function ZentraActivityDotCard() {
  return (
    <div className="space-y-4">
      {/* Sub-Card 1: Transactions */}
      <div className="rounded-[28px] bg-[#090b11] border border-[#1b1f2e] p-5 sm:p-6 shadow-2xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-neutral-300">Transactions</span>
          <button type="button" className="text-neutral-500 hover:text-neutral-300">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </button>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="shrink-0">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">106k</span>
          </div>

          {/* Dot Matrix Histogram (Green) */}
          <div className="relative flex items-end gap-1.5 h-16 pt-5">
            {/* Peak Tooltip */}
            <div className="absolute -top-1 left-[38%] -translate-x-1/2 px-2 py-0.5 rounded-full bg-white text-black font-extrabold text-[9px] shadow-md whitespace-nowrap">
              Peak: Wed
            </div>

            {/* Columns of dots */}
            {[
              [2],
              [3],
              [2],
              [4],
              [7, true], // peak column
              [5],
              [3],
              [4],
              [2],
              [2],
              [3],
              [2],
            ].map(([dots, isPeak], colIdx) => (
              <div key={colIdx} className="flex flex-col-reverse gap-1">
                {Array.from({ length: Number(dots) }).map((_, dIdx) => (
                  <span
                    key={dIdx}
                    className={`w-2 h-2 rounded-full ${
                      isPeak
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                        : "bg-emerald-500/50"
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="text-right shrink-0">
            <p className="text-[10px] text-neutral-500 font-semibold">vs last period</p>
            <p className="text-sm font-bold text-white mt-0.5">+34,002</p>
          </div>
        </div>
      </div>

      {/* Sub-Card 2: Customers */}
      <div className="rounded-[28px] bg-[#090b11] border border-[#1b1f2e] p-5 sm:p-6 shadow-2xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-neutral-300">Customers</span>
          <button type="button" className="text-neutral-500 hover:text-neutral-300">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </button>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="shrink-0">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">1,284</span>
          </div>

          {/* Dot Matrix Histogram (Blue) */}
          <div className="relative flex items-end gap-1.5 h-16 pt-5">
            {/* Highest Tooltip */}
            <div className="absolute -top-1 left-[50%] -translate-x-1/2 px-2 py-0.5 rounded-full bg-white text-black font-extrabold text-[9px] shadow-md whitespace-nowrap">
              Highest: Thu
            </div>

            {/* Columns of dots */}
            {[
              [2],
              [2],
              [3],
              [2],
              [4],
              [6, true], // peak column
              [3],
              [4],
              [2],
              [3],
              [2],
            ].map(([dots, isPeak], colIdx) => (
              <div key={colIdx} className="flex flex-col-reverse gap-1">
                {Array.from({ length: Number(dots) }).map((_, dIdx) => (
                  <span
                    key={dIdx}
                    className={`w-2 h-2 rounded-full ${
                      isPeak
                        ? "bg-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                        : "bg-[#0284c7]/50"
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="text-right shrink-0">
            <p className="text-[10px] text-neutral-500 font-semibold">vs last period</p>
            <p className="text-sm font-bold text-white mt-0.5">+320</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 6. Radiant Holographic Gradient Feature Card ("Insights")
// ============================================================================
export function ZentraInsightCard() {
  return (
    <div className="relative rounded-[28px] overflow-hidden p-7 shadow-2xl flex flex-col justify-between border border-white/10 min-h-[320px]">
      {/* Radiant Glowing Background matching Image */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#0284c7] via-[#9333ea] to-[#ea580c] opacity-90" />
      
      {/* Noise Texture & Glass highlights */}
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />
      
      {/* 3D Arrow Watermark */}
      <div className="absolute -right-8 -top-8 w-56 h-56 pointer-events-none opacity-25">
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full text-white">
          <path
            d="M 60 20 L 140 100 L 60 180"
            stroke="currentColor"
            strokeWidth="32"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 space-y-4">
        {/* Top Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-semibold border border-white/25 shadow-sm">
          <span>💡</span> Insights
        </div>

        {/* Giant Metric */}
        <div>
          <span className="text-5xl sm:text-6xl font-black text-white tracking-tight drop-shadow-md">
            75%
          </span>
        </div>

        {/* Narrative Description */}
        <div className="space-y-1.5">
          <p className="text-sm sm:text-base font-bold text-white leading-snug drop-shadow-sm">
            Authorization rate increased by 4% compared to last week.
          </p>
          <p className="text-xs text-white/80 leading-relaxed font-medium">
            This improvement reduced failed transactions by 950 and is projected to recover $12,400.
          </p>
        </div>
      </div>

      {/* Bottom Slider Pagination Indicator */}
      <div className="relative z-10 pt-6">
        <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden flex">
          <div className="w-1/3 h-full bg-white rounded-full shadow-sm" />
          <div className="w-2/3 h-full bg-transparent" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Full Combined Showcase View in Black Theme
// ============================================================================
export function OwnerZentraDashboard() {
  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6 pb-12 font-sans selection:bg-white selection:text-black">
      {/* 1. Header Control Bar */}
      <ZentraOverviewHeader />

      {/* 2. Top Bento Grid Row: Funnel Card (2 Cols) + Volume Card (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ZentraFunnelCard />
        </div>
        <div className="lg:col-span-1">
          <ZentraVolumeCard />
        </div>
      </div>

      {/* 3. Bottom Bento Grid Row: Retention (1 Col) + Activity Dots (1 Col) + Insights (1 Col) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <ZentraRetentionCard />
        </div>
        <div>
          <ZentraActivityDotCard />
        </div>
        <div>
          <ZentraInsightCard />
        </div>
      </div>
    </div>
  );
}

export default OwnerZentraDashboard;
