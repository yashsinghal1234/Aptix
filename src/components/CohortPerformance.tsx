"use client";

import React, { useState } from "react";
import Link from "next/link";

interface CohortPerformanceProps {
  totalSubmissions?: number;
  passRate?: number;
  meanScore?: number;
  medianScore?: number;
  highestScore?: number;
}

export function CohortPerformance({
  totalSubmissions = 4892,
  passRate = 81,
  meanScore = 77,
  medianScore = 79,
  highestScore = 99,
}: CohortPerformanceProps) {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  // Adjust submissions based on period toggle for interactive feel
  const displaySubmissions =
    period === "7d"
      ? Math.round(totalSubmissions * 0.25)
      : period === "90d"
      ? Math.round(totalSubmissions * 2.8)
      : totalSubmissions;

  const distribution = [
    { range: "0-39", pct: 4, height: "16%" },
    { range: "40-59", pct: 10, height: "30%" },
    { range: "60-74", pct: 27, height: "55%" },
    { range: "75-89", pct: 64, height: "100%", isHighlight: true },
    { range: "90-100", pct: 46, height: "78%" },
  ];

  return (
    <div className="bg-[#0b0c10] border border-neutral-800/80 rounded-[28px] p-6 sm:p-8 shadow-2xl space-y-6">
      {/* Header with Title and Time Period Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold tracking-widest text-[#a855f7] uppercase block mb-1">
            Performance Intelligence
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Cohort performance
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            {displaySubmissions.toLocaleString()} submissions in the selected period
          </p>
        </div>

        {/* Period Switcher (7 days | 30 days | 90 days) */}
        <div className="inline-flex items-center p-1 bg-[#14151b] border border-neutral-800 rounded-2xl self-start sm:self-auto">
          {(["7d", "30d", "90d"] as const).map((p) => {
            const labels: Record<typeof p, string> = {
              "7d": "7 days",
              "30d": "30 days",
              "90d": "90 days",
            };
            const active = period === p;
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                type="button"
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? "bg-white text-black shadow-md"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Split: Pass Rate vs. Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Overall Pass Rate Card */}
        <div className="lg:col-span-5 bg-[#121319] border border-neutral-800/80 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-neutral-400">
                Overall pass rate
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
            </div>

            <div className="mt-4">
              <span className="text-5xl sm:text-6xl font-black text-white tracking-tight block">
                {passRate}%
              </span>
              {/* Progress Bar */}
              <div className="w-full h-2 bg-neutral-800 rounded-full mt-4 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                  style={{ width: `${passRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* 3 Mini Stats: Mean, Median, Highest */}
          <div className="grid grid-cols-3 gap-2.5 mt-6 pt-5 border-t border-neutral-800/80">
            <div className="bg-[#171922] p-3 rounded-xl border border-neutral-800 text-center">
              <span className="text-[11px] text-neutral-400 block font-medium">Mean</span>
              <span className="text-base font-extrabold text-white mt-0.5 block">{meanScore}%</span>
            </div>
            <div className="bg-[#171922] p-3 rounded-xl border border-neutral-800 text-center">
              <span className="text-[11px] text-neutral-400 block font-medium">Median</span>
              <span className="text-base font-extrabold text-white mt-0.5 block">{medianScore}%</span>
            </div>
            <div className="bg-[#171922] p-3 rounded-xl border border-neutral-800 text-center">
              <span className="text-[11px] text-neutral-400 block font-medium">Highest</span>
              <span className="text-base font-extrabold text-white mt-0.5 block">{highestScore}%</span>
            </div>
          </div>
        </div>

        {/* Right Column: Score Distribution Histogram */}
        <div className="lg:col-span-7 bg-[#121319] border border-neutral-800/80 rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Score distribution</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Candidates by score range</p>
            </div>
            <Link
              href="/dashboard/owner/results"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-300 hover:text-white transition group"
            >
              <span>Full report</span>
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Histogram Bars Container */}
          <div className="h-44 sm:h-48 flex items-end justify-between gap-3 sm:gap-4 pt-6 pb-2 px-2">
            {distribution.map((bar) => (
              <div key={bar.range} className="flex-1 flex flex-col items-center h-full justify-end group">
                {/* Percentage label above bar */}
                <span
                  className={`text-[11px] font-extrabold mb-1.5 transition-colors ${
                    bar.isHighlight ? "text-[#a855f7]" : "text-neutral-400 group-hover:text-white"
                  }`}
                >
                  {bar.pct}%
                </span>

                {/* Vertical Bar */}
                <div className="w-full max-w-[54px] bg-[#1a1c26] rounded-xl flex items-end overflow-hidden h-full">
                  <div
                    className={`w-full rounded-xl transition-all duration-700 ${
                      bar.isHighlight
                        ? "bg-[#6d28d9] shadow-[0_0_20px_rgba(109,40,217,0.4)]"
                        : "bg-[#282b3a] group-hover:bg-[#34384d]"
                    }`}
                    style={{ height: bar.height }}
                  />
                </div>

                {/* Score Range label below bar */}
                <span className="text-[11px] text-neutral-500 font-semibold mt-2.5 whitespace-nowrap">
                  {bar.range}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
