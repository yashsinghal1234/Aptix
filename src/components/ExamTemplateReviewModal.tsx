"use client";

import React, { useState, useEffect, useMemo } from "react";

export interface ExamTemplateReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSubmit: () => void;
  isSubmitting: boolean;
  error?: string | null;
  onJumpToStep: (stepIndex: number) => void;
  fields: Record<string, string>;
  checks: Record<string, boolean>;
  rules: { id: string; category: string; difficultyLevel: string; count: number }[];
  selectedIds: Set<string>;
  allQuestions: any[];
  rosterCount: number;
  rosterPreview?: string[];
  totalMarks: number;
  totalQuestions: number;
  shortfall: { category: string; difficultyLevel: string; count: number }[];
}

export function ExamTemplateReviewModal({
  isOpen,
  onClose,
  onConfirmSubmit,
  isSubmitting,
  error,
  onJumpToStep,
  fields,
  checks,
  rules,
  selectedIds,
  allQuestions,
  rosterCount,
  rosterPreview = [],
  totalMarks,
  totalQuestions,
  shortfall,
}: ExamTemplateReviewModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "questions" | "scoring" | "security">("overview");
  const [showQuestionDrawer, setShowQuestionDrawer] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  // Derived selected questions objects
  const selectedQuestions = useMemo(() => {
    return allQuestions.filter((q) => selectedIds.has(q.id));
  }, [allQuestions, selectedIds]);

  // Category breakdown across fixed + rules
  const categoryStats = useMemo(() => {
    const map: Record<string, { fixed: number; rules: number; total: number }> = {};

    selectedQuestions.forEach((q) => {
      const cat = q.category || "General";
      if (!map[cat]) map[cat] = { fixed: 0, rules: 0, total: 0 };
      map[cat].fixed += 1;
      map[cat].total += 1;
    });

    rules.forEach((r) => {
      const cat = r.category || "General";
      const cnt = Number(r.count) || 0;
      if (!map[cat]) map[cat] = { fixed: 0, rules: 0, total: 0 };
      map[cat].rules += cnt;
      map[cat].total += cnt;
    });

    return Object.entries(map).map(([category, stats]) => ({
      category,
      ...stats,
    }));
  }, [selectedQuestions, rules]);

  // Difficulty breakdown for fixed questions
  const difficultyStats = useMemo(() => {
    const map = { Easy: 0, Medium: 0, Hard: 0, Other: 0 };
    selectedQuestions.forEach((q) => {
      const diff = (q.difficultyLevel || "").toUpperCase();
      if (diff === "EASY") map.Easy += 1;
      else if (diff === "HARD") map.Hard += 1;
      else if (diff === "MEDIUM") map.Medium += 1;
      else map.Other += 1;
    });
    return map;
  }, [selectedQuestions]);

  if (!isOpen) return null;

  const durationMin = parseInt(fields.durationMinutes || "60", 10) || 60;
  const durationHours = Math.floor(durationMin / 60);
  const remainingMins = durationMin % 60;
  const durationFormatted =
    durationHours > 0
      ? `${durationHours}h ${remainingMins > 0 ? `${remainingMins}m` : ""}`.trim()
      : `${durationMin} mins`;

  const passCriteriaPct = parseFloat(fields.passCriteria || "50") || 50;
  const passingMarksNeeded = Math.round(((totalMarks * passCriteriaPct) / 100) * 10) / 10;
  const mpq = parseFloat(fields.marksPerQuestion || "1") || 1;
  const negOn = !!checks.negativeMarkingEnabled;
  const negVal = fields.negativeMarksValue || "0.25";

  const selectionStrategy =
    rules.length > 0 && selectedIds.size > 0
      ? "HYBRID (Fixed & Dynamic Pool)"
      : rules.length > 0
      ? "RULE-BASED (Dynamic Pool)"
      : "MANUAL (Fixed Curated Questions)";

  const hasShortfall = shortfall.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-review-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-[#0b0d13] rounded-2xl border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] max-w-3xl w-full flex flex-col max-h-[92vh] overflow-hidden text-neutral-100">
        
        {/* ── Modal Header ── */}
        <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold tracking-[0.14em] uppercase text-lime-300 bg-lime-300/10 border border-lime-300/20 px-2.5 py-0.5 rounded-full">
                PRE-SUBMISSION SPECIFICATION AUDIT
              </span>
            </div>
            <h2 id="template-review-title" className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {fields.title.trim() || "Untitled Assessment Blueprint"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close review dialog"
            className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* ── Navigation Tabs ── */}
        <div className="px-6 pt-3 border-b border-white/10 bg-black/40 flex items-center gap-2 shrink-0 overflow-x-auto scrollbar-none">
          {[
            { id: "overview", label: "Executive Overview" },
            { id: "questions", label: `Questions & Pool (${totalQuestions})` },
            { id: "scoring", label: "Scoring & Policy" },
            { id: "security", label: "Proctoring & Rules" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`text-xs font-bold px-3 py-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "border-lime-300 text-lime-300 bg-lime-300/[0.04]"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Modal Body (Scrollable) ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          
          {/* Error Banner if any */}
          {error && (
            <div className="rounded-xl bg-rose-950/40 border border-rose-500/40 p-3.5 flex items-start gap-3">
              <svg className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-xs font-bold text-rose-200">Submission blocked by server or validation error</p>
                <p className="text-[11px] text-rose-300/90 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Shortfall Critical Warning */}
          {hasShortfall && (
            <div className="rounded-xl bg-amber-950/40 border border-amber-500/40 p-3.5 flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-xs font-bold text-amber-300">Question Pool Shortfall Detected</p>
                <p className="text-[11px] text-amber-200/90 mt-0.5 leading-relaxed">
                  Your dynamic generation rules require more approved questions than currently available in the question bank.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {shortfall.map((sf, idx) => (
                    <span key={idx} className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-200 border border-amber-500/30 px-2 py-0.5 rounded-md">
                      {sf.category} ({sf.difficultyLevel}): requested {sf.count}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onJumpToStep(1);
                  }}
                  className="mt-2.5 text-[11px] font-black text-amber-300 hover:text-amber-100 underline cursor-pointer"
                >
                  Adjust Question Rules in Step 2 →
                </button>
              </div>
            </div>
          )}

          {/* ── Key Performance Indicators (Hero Cards) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Total Questions */}
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3.5 relative overflow-hidden">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Questions</span>
                <span className="w-2 h-2 rounded-full bg-lime-400" />
              </div>
              <p className="text-2xl font-black text-white tabular-nums tracking-tight">
                {String(totalQuestions).padStart(2, "0")}
              </p>
            </div>

            {/* Total Marks */}
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3.5 relative overflow-hidden">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Marks</span>
                <span className="text-[10px] font-bold text-lime-300 font-mono">+{mpq}/q</span>
              </div>
              <p className="text-2xl font-black text-white tabular-nums tracking-tight">
                {totalMarks} <span className="text-xs font-semibold text-neutral-400">pts</span>
              </p>
              <p className="text-[10px] text-neutral-400 mt-0.5 truncate">
                Pass: {passCriteriaPct}% ({passingMarksNeeded} pts)
              </p>
            </div>

            {/* Duration */}
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3.5 relative overflow-hidden">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Duration</span>
                <span className="text-[10px] text-neutral-400 font-mono">Window: {fields.defaultStartWindowHours || 1}h</span>
              </div>
              <p className="text-2xl font-black text-white tabular-nums tracking-tight">
                {durationFormatted}
              </p>
            </div>

            {/* Candidate Audience */}
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3.5 relative overflow-hidden">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Audience</span>
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-white truncate tracking-tight">
                {rosterCount > 0
                  ? `${rosterCount} Candidates`
                  : fields.allowedEmailDomain
                  ? `@${fields.allowedEmailDomain.replace(/^@/, "")}`
                  : "Open Entry"}
              </p>
              <p className="text-[10px] text-neutral-400 mt-0.5 truncate">
                {rosterCount > 0 ? "Uploaded Roster" : fields.allowedEmailDomain ? "Domain Restricted" : "Public Access PIN"}
              </p>
            </div>
          </div>

          {/* ── TAB 1: OVERVIEW ── */}
          {activeTab === "overview" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Summary Card */}
              {/* Assessment Specification Card */}
              <div className="rounded-2xl border border-white/10 bg-[#07090e]/80 p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-lime-300/10 border border-lime-300/20 flex items-center justify-center text-lime-300 shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white tracking-wide uppercase">Assessment Specification</h3>
                      <p className="text-[10px] text-neutral-400">Core parameters and question distribution architecture</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onJumpToStep(0);
                    }}
                    className="px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] font-bold text-lime-300 hover:text-lime-200 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Edit Info</span>
                    <span>↗</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Subject */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1">Subject / Domain</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{fields.subject || "General Assessment"}</span>
                      {fields.subject && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/10">Active</span>
                      )}
                    </div>
                  </div>

                  {/* Strategy */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1">Strategy Architecture</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                      <span className="text-xs font-bold text-lime-300">{selectionStrategy}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="sm:col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-3">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 block mb-1">Blueprint Description</span>
                    <p className="text-xs text-neutral-300 leading-relaxed font-normal">
                      {fields.description ? fields.description.replace(/\s*\[MODE:GAMIFIED\]/g, "") : <span className="text-neutral-500 italic">No description provided for this blueprint.</span>}
                    </p>
                  </div>

                  {/* Instructions if provided */}
                  {fields.instructions && (
                    <div className="sm:col-span-2 bg-black/40 border border-white/10 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">Candidate Instructions</span>
                      </div>
                      <p className="text-xs text-neutral-200 leading-relaxed whitespace-pre-line font-mono bg-black/50 p-2.5 rounded-lg border border-white/5">
                        {fields.instructions}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Security & Delivery Parameters Card */}
              <div className="rounded-2xl border border-white/10 bg-[#07090e]/80 p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-cyan-300/10 border border-cyan-300/20 flex items-center justify-center text-cyan-300 shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white tracking-wide uppercase">Proctoring &amp; Delivery Parameters</h3>
                      <p className="text-[10px] text-neutral-400">Integrity rules, window limits, and score accessibility</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onJumpToStep(2);
                    }}
                    className="px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[11px] font-bold text-lime-300 hover:text-lime-200 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Edit Settings</span>
                    <span>↗</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Negative Marking */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Negative Marking</span>
                    <div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        negOn ? "bg-rose-500/15 text-rose-300 border border-rose-500/30" : "bg-white/[0.04] text-neutral-400 border border-white/10"
                      }`}>
                        {negOn ? `-${negVal} / wrong` : "Disabled"}
                      </span>
                    </div>
                  </div>

                  {/* Fullscreen */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Browser Lockdown</span>
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        checks.requireFullscreen ? "bg-lime-400/15 text-lime-300 border border-lime-400/30" : "bg-white/[0.04] text-neutral-400 border border-white/10"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${checks.requireFullscreen ? "bg-lime-400" : "bg-neutral-500"}`} />
                        {checks.requireFullscreen ? "Enforced" : "Optional"}
                      </span>
                    </div>
                  </div>

                  {/* Tab Switch Limit */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Tab Switch Shield</span>
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/[0.04] text-white border border-white/10">
                        {fields.tabSwitchLimit ? `${fields.tabSwitchLimit} switches max` : "Unlimited"}
                      </span>
                    </div>
                  </div>

                  {/* Result Release */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 mb-1.5">Result Release</span>
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-400/15 text-sky-300 border border-sky-400/30 uppercase font-mono">
                        {fields.resultVisibility || "IMMEDIATE"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Roster Preview Card if uploaded */}
              {rosterCount > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                      Uploaded Roster ({rosterCount} Candidates)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onJumpToStep(0);
                      }}
                      className="text-[11px] font-bold text-lime-300 hover:underline cursor-pointer"
                    >
                      Change Roster ↗
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {rosterPreview.slice(0, 10).map((cand, idx) => (
                      <span key={idx} className="text-[10px] font-mono bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded-md text-neutral-300">
                        {cand}
                      </span>
                    ))}
                    {rosterCount > 10 && (
                      <span className="text-[10px] font-bold text-neutral-500 px-2 py-0.5">
                        +{rosterCount - 10} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: QUESTIONS & POOL ── */}
          {activeTab === "questions" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Question Strategy Header */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-lime-300">Question Pool Strategy</span>
                  <p className="text-sm font-bold text-white mt-0.5">{selectionStrategy}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onJumpToStep(1);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/[0.05] hover:bg-white/10 text-xs font-bold text-lime-300 transition-colors cursor-pointer"
                >
                  Edit Question Strategy ↗
                </button>
              </div>

              {/* Category Breakdown */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4.5 space-y-3">
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                  Category &amp; Topic Distribution
                </span>
                {categoryStats.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic">No questions selected yet.</p>
                ) : (
                  <div className="space-y-2">
                    {categoryStats.map((cat) => (
                      <div key={cat.category} className="flex items-center justify-between gap-3 text-xs bg-black/30 border border-white/5 p-2.5 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-lime-400" />
                          <span className="font-bold text-white">{cat.category}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                          {cat.fixed > 0 && <span>{cat.fixed} fixed</span>}
                          {cat.rules > 0 && <span>{cat.rules} dynamic</span>}
                          <span className="font-black text-lime-300 bg-lime-400/10 border border-lime-400/20 px-2 py-0.5 rounded-md">
                            {cat.total} total
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Difficulty Breakdown for Fixed Questions */}
              {selectedQuestions.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                      Fixed Questions Difficulty Breakdown ({selectedQuestions.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowQuestionDrawer(!showQuestionDrawer)}
                      className="text-[11px] font-bold text-lime-300 hover:underline cursor-pointer"
                    >
                      {showQuestionDrawer ? "Hide Question List" : "Inspect All Selected"}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase">Easy</span>
                      <p className="text-xl font-black text-white mt-0.5">{difficultyStats.Easy}</p>
                    </div>
                    <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-bold text-amber-400 uppercase">Medium</span>
                      <p className="text-xl font-black text-white mt-0.5">{difficultyStats.Medium}</p>
                    </div>
                    <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-3 text-center">
                      <span className="text-[10px] font-bold text-rose-400 uppercase">Hard</span>
                      <p className="text-xl font-black text-white mt-0.5">{difficultyStats.Hard}</p>
                    </div>
                  </div>

                  {/* Question Drawer / List */}
                  {showQuestionDrawer && (
                    <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
                      {selectedQuestions.map((q, idx) => (
                        <div key={q.id} className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-xs flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-md bg-neutral-800 text-neutral-400 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-neutral-200 line-clamp-1 font-medium">{q.text}</p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-500">
                              <span>{q.category}</span>
                              <span>·</span>
                              <span className="font-semibold text-neutral-400">{q.difficultyLevel}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic Auto-Pick Rules if any */}
              {rules.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4.5 space-y-3">
                  <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                    Dynamic Randomization Rules ({rules.length} configured)
                  </span>
                  <div className="space-y-2">
                    {rules.map((rule, idx) => (
                      <div key={rule.id || idx} className="flex items-center justify-between text-xs bg-black/30 border border-white/5 p-2.5 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-500 font-mono text-[11px]">Rule #{idx + 1}</span>
                          <span className="font-bold text-white">{rule.category}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 font-semibold">
                            {rule.difficultyLevel}
                          </span>
                        </div>
                        <span className="font-black text-lime-300 font-mono">
                          {rule.count} questions
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: SCORING & POLICY ── */}
          {activeTab === "scoring" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4.5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-lime-300" />
                    Grading &amp; Scoring Policy
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onJumpToStep(2);
                    }}
                    className="text-[11px] font-bold text-lime-300 hover:underline cursor-pointer"
                  >
                    Edit Scoring ↗
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Total Exam Marks</span>
                    <p className="text-xl font-black text-white">{totalMarks} points</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Based on {totalQuestions} questions × {mpq} pts</p>
                  </div>

                  <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Passing Threshold</span>
                    <p className="text-xl font-black text-lime-300">{passCriteriaPct}%</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Requires ≥ {passingMarksNeeded} marks to pass</p>
                  </div>

                  <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Negative Marking</span>
                    <p className={`text-base font-bold ${negOn ? "text-rose-300" : "text-neutral-300"}`}>
                      {negOn ? `Enabled (-${negVal} per wrong answer)` : "Disabled (No deduction)"}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Only wrong answers are penalized; skipped questions award 0</p>
                  </div>

                  <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">MSQ Partial Credit</span>
                    <p className="text-base font-bold text-white">
                      {checks.partialCreditEnabled ? "Enabled (Proportional score)" : "Disabled (All or nothing)"}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Multi-select questions scoring policy</p>
                  </div>
                </div>
              </div>

              {/* Navigation Policies */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4.5 space-y-3">
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                  Candidate Navigation Permissions
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Allow Skip</span>
                    <p className={`font-bold ${checks.allowQuestionSkip ? "text-lime-300" : "text-neutral-400"}`}>
                      {checks.allowQuestionSkip ? "✓ Permitted" : "✕ Mandatory"}
                    </p>
                  </div>
                  <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Back Navigation</span>
                    <p className={`font-bold ${checks.allowBackNavigation ? "text-lime-300" : "text-neutral-400"}`}>
                      {checks.allowBackNavigation ? "✓ Permitted" : "✕ Linear only"}
                    </p>
                  </div>
                  <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Pre-submit Review</span>
                    <p className={`font-bold ${checks.allowAnswerReview ? "text-lime-300" : "text-neutral-400"}`}>
                      {checks.allowAnswerReview ? "✓ Mandatory audit" : "✕ Direct submit"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: SECURITY & RULES ── */}
          {activeTab === "security" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4.5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    Proctoring &amp; Anti-Cheating Safeguards
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onJumpToStep(2);
                    }}
                    className="text-[11px] font-bold text-lime-300 hover:underline cursor-pointer"
                  >
                    Edit Rules ↗
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Require Fullscreen</span>
                    <p className={`text-sm font-bold ${checks.requireFullscreen ? "text-lime-300" : "text-neutral-400"}`}>
                      {checks.requireFullscreen ? "Active (Locks viewport)" : "Inactive (Windowed allowed)"}
                    </p>
                  </div>

                  <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Disable Copy / Paste</span>
                    <p className={`text-sm font-bold ${checks.disableCopyPaste ? "text-lime-300" : "text-neutral-400"}`}>
                      {checks.disableCopyPaste ? "Active (Clipboard blocked)" : "Inactive (Clipboard enabled)"}
                    </p>
                  </div>

                  <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Tab-Switch Threshold</span>
                    <p className="text-sm font-bold text-white">
                      {fields.tabSwitchLimit ? `Limit: ${fields.tabSwitchLimit} switches before auto-action` : "No limit"}
                    </p>
                  </div>

                  <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Gamified Mode</span>
                    <p className={`text-sm font-bold ${checks.isGamified ? "text-lime-300" : "text-neutral-400"}`}>
                      {checks.isGamified ? "Active (Streak bonuses & SFX)" : "Standard Assessment"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Feedback and Results */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4.5 space-y-3">
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                  Post-Exam Feedback &amp; Answer Key
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Score Visibility</span>
                    <p className="font-bold text-white uppercase">{fields.resultVisibility || "IMMEDIATE"}</p>
                  </div>
                  <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Show Correct Answers</span>
                    <p className={`font-bold ${checks.showCorrectAnswers ? "text-lime-300" : "text-neutral-400"}`}>
                      {checks.showCorrectAnswers ? "✓ Visible to candidate" : "✕ Hidden"}
                    </p>
                  </div>
                  <div className="bg-black/30 border border-white/5 p-3 rounded-xl">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">Show Explanations</span>
                    <p className={`font-bold ${checks.showExplanation ? "text-lime-300" : "text-neutral-400"}`}>
                      {checks.showExplanation ? "✓ Visible after finish" : "✕ Hidden"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Readiness Checklist Banner */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] font-black ${
                hasShortfall ? "bg-amber-400 text-black" : "bg-lime-400 text-black"
              }`}>
                {hasShortfall ? "!" : "✓"}
              </span>
              <span className="text-neutral-300 font-medium">
                {hasShortfall
                  ? "Question bank shortfall requires resolution prior to scheduling live sessions."
                  : "All specifications, scoring models, and proctoring parameters verified."}
              </span>
            </div>
            <span className="text-[10px] text-neutral-500 font-mono hidden sm:inline">
              Ready to compile blueprint
            </span>
          </div>

        </div>

        {/* ── Modal Footer ── */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-neutral-400 hidden sm:block">
            You can still modify this template later from the Owner Dashboard.
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Back to Edit
            </button>
            <button
              type="button"
              onClick={onConfirmSubmit}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-lime-300 hover:brightness-110 text-black text-xs font-black transition-all shadow-[0_0_20px_rgba(190,242,100,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Submitting Blueprint…</span>
                </>
              ) : (
                <span>Confirm &amp; Save Template</span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
