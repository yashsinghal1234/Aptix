"use client";

import React, { useState } from "react";
import Link from "next/link";

export type TimeframePeriod = "7d" | "30d" | "90d";

export interface CohortDistributionBucket {
  range: string;
  pct: number;
  isPeak?: boolean;
}

export interface CohortData {
  submissionsCount: number;
  passRate: number;
  mean: number;
  median: number;
  highest: number;
  distribution: CohortDistributionBucket[];
}

const DEFAULT_TIMEFRAME_DATA: Record<TimeframePeriod, CohortData> = {
  "30d": {
    submissionsCount: 4892,
    passRate: 81,
    mean: 77,
    median: 79,
    highest: 99,
    distribution: [
      { range: "0–39", pct: 4 },
      { range: "40–59", pct: 10 },
      { range: "60–74", pct: 27 },
      { range: "75–89", pct: 64, isPeak: true },
      { range: "90–100", pct: 46 },
    ],
  },
  "7d": {
    submissionsCount: 1248,
    passRate: 84,
    mean: 79,
    median: 82,
    highest: 100,
    distribution: [
      { range: "0–39", pct: 3 },
      { range: "40–59", pct: 8 },
      { range: "60–74", pct: 22 },
      { range: "75–89", pct: 68, isPeak: true },
      { range: "90–100", pct: 51 },
    ],
  },
  "90d": {
    submissionsCount: 14620,
    passRate: 78,
    mean: 75,
    median: 76,
    highest: 99,
    distribution: [
      { range: "0–39", pct: 6 },
      { range: "40–59", pct: 14 },
      { range: "60–74", pct: 31 },
      { range: "75–89", pct: 59, isPeak: true },
      { range: "90–100", pct: 41 },
    ],
  },
};

interface CohortPerformanceWidgetProps {
  data?: Partial<Record<TimeframePeriod, CohortData>>;
  reportHref?: string;
}

export function CohortPerformanceWidget({
  data,
  reportHref = "/dashboard/owner/results",
}: CohortPerformanceWidgetProps) {
  const [period, setPeriod] = useState<TimeframePeriod>("30d");

  const currentData = {
    ...DEFAULT_TIMEFRAME_DATA[period],
    ...(data?.[period] || {}),
  };

  const maxPct = Math.max(...currentData.distribution.map((d) => d.pct), 70);

  return (
    <div className="bg-[#0b0d13] border border-neutral-800 rounded-[28px] p-6 sm:p-8 shadow-2xl space-y-6 sm:space-y-7 transition-all">
      {/* Top Header Row with Intelligence Tag & Timeframe Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <span className="text-[11px] font-black tracking-widest text-violet-400 uppercase">
            Performance Intelligence
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Cohort performance
          </h2>
          <p className="text-sm text-neutral-400 mt-1 font-medium">
            {currentData.submissionsCount.toLocaleString()} submissions in the selected period
          </p>
        </div>

        {/* Timeframe Selector Pill */}
        <div className="inline-flex items-center gap-1 bg-neutral-900/90 border border-neutral-800 p-1 rounded-2xl shrink-0 self-start">
          {(
            [
              { key: "7d", label: "7 days" },
              { key: "30d", label: "30 days" },
              { key: "90d", label: "90 days" },
            ] as const
          ).map((item) => {
            const active = period === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setPeriod(item.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  active
                    ? "bg-white text-black shadow-md"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid: Left Summary Card + Right Histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        {/* Left Column (5 cols): Overall Pass Rate & Sub-metrics */}
        <div className="lg:col-span-5 bg-[#10121a] border border-neutral-800/90 rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-neutral-400">
                Overall pass rate
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                {/* Mortarboard / Graduation Cap Icon */}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 14l9-5-9-5-9 5 9 5z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 14v7"
                  />
                </svg>
              </div>
            </div>

            {/* Big Pass Rate Number */}
            <div className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-2.5">
              {currentData.passRate}%
            </div>

            {/* Emerald Progress Bar */}
            <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden mt-4">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, currentData.passRate))}%` }}
              />
            </div>
          </div>

          {/* 3 Mini Stats: Mean, Median, Highest */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-6 pt-2">
            <div className="bg-[#141722] border border-neutral-800/80 rounded-xl p-3 text-center transition-colors">
              <span className="text-[10px] sm:text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                Mean
              </span>
              <span className="text-base sm:text-lg font-black text-white mt-1 block">
                {currentData.mean}%
              </span>
            </div>
            <div className="bg-[#141722] border border-neutral-800/80 rounded-xl p-3 text-center transition-colors">
              <span className="text-[10px] sm:text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                Median
              </span>
              <span className="text-base sm:text-lg font-black text-white mt-1 block">
                {currentData.median}%
              </span>
            </div>
            <div className="bg-[#141722] border border-neutral-800/80 rounded-xl p-3 text-center transition-colors">
              <span className="text-[10px] sm:text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                Highest
              </span>
              <span className="text-base sm:text-lg font-black text-white mt-1 block">
                {currentData.highest}%
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Score Distribution Histogram */}
        <div className="lg:col-span-7 bg-[#10121a] border border-neutral-800/90 rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-lg">
          {/* Header with Title and Full Report link */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Score distribution
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5 font-medium">
                Candidates by score range
              </p>
            </div>
            <Link
              href={reportHref}
              className="text-xs font-bold text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors group cursor-pointer"
            >
              <span>Full report</span>
              <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
            </Link>
          </div>

          {/* Histogram Chart Area */}
          <div className="bg-[#0c0e15] border border-neutral-800/60 rounded-xl p-5 sm:p-6 flex flex-col justify-end min-h-[220px]">
            {/* The 5 vertical bars */}
            <div className="grid grid-cols-5 gap-3 sm:gap-4 items-end h-40 pt-4">
              {currentData.distribution.map((item) => {
                const heightPercent = Math.max(8, (item.pct / maxPct) * 100);
                return (
                  <div key={item.range} className="flex flex-col items-center h-full justify-end group">
                    {/* Percentage Above Bar */}
                    <span
                      className={`text-[11px] sm:text-xs font-bold mb-1.5 transition-colors ${
                        item.isPeak ? "text-violet-300 font-extrabold" : "text-neutral-400"
                      }`}
                    >
                      {item.pct}%
                    </span>

                    {/* Bar Rectangle */}
                    <div className="w-full flex items-end justify-center h-28 sm:h-32">
                      <div
                        className={`w-full rounded-t-xl transition-all duration-500 ease-out ${
                          item.isPeak
                            ? "bg-violet-600 border border-violet-500 shadow-[0_0_20px_rgba(124,58,237,0.35)]"
                            : "bg-violet-400/20 border border-violet-400/30 hover:bg-violet-400/30"
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>

                    {/* Range Label Below */}
                    <span className="text-[11px] sm:text-xs font-semibold text-neutral-400 text-center mt-3 block whitespace-nowrap">
                      {item.range}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
