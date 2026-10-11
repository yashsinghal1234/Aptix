"use client";

import React from "react";

interface ExamReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  questions: any[];
  answers: Record<string, any>;
  markedForReview: Set<string>;
  timeLeft: number;
  syncStatus: "saved" | "syncing" | "cached";
  session: any;
}

export function ExamReviewModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  questions,
  answers,
  markedForReview,
  timeLeft,
  session,
}: ExamReviewModalProps) {
  if (!isOpen) return null;

  const totalQuestions = questions.length;
  
  // Calculate answered questions
  const answeredIndices: number[] = [];
  const unansweredIndices: number[] = [];
  const markedIndices: number[] = [];

  questions.forEach((q, idx) => {
    const ans = answers[q.id];
    const isAns = ans !== undefined && ans !== "" && !(Array.isArray(ans) && ans.length === 0);
    if (isAns) {
      answeredIndices.push(idx + 1);
    } else {
      unansweredIndices.push(idx + 1);
    }
    if (markedForReview.has(q.id)) {
      markedIndices.push(idx + 1);
    }
  });

  const answeredCount = answeredIndices.length;
  const unansweredCount = unansweredIndices.length;
  const markedCount = markedIndices.length;

  // Format time remaining
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const nowIST = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: false });

  // Format ranges like Q33–Q40
  const unansweredRangeText = unansweredIndices.length > 0
    ? unansweredIndices.length === 1
      ? `Q${unansweredIndices[0]} · score 0 if left blank`
      : `Q${unansweredIndices[0]}–Q${unansweredIndices[unansweredIndices.length - 1]} · score 0 if left blank`
    : "All questions attempted";

  const markedListText = markedIndices.length > 0
    ? `${markedIndices.slice(0, 4).map(i => `Q${i}`).join(", ")}${markedIndices.length > 4 ? ` +${markedIndices.length - 4} more` : ""} · all included in score`
    : "No questions marked";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b0d13] rounded-2xl border border-white/10 shadow-2xl max-w-xl w-full p-5 sm:p-6 text-neutral-100 relative max-h-[92vh] overflow-y-auto space-y-4">
        {/* Header Tag and Close */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold tracking-[0.14em] uppercase text-lime-300 bg-lime-300/10 border border-lime-300/20 px-2.5 py-0.5 rounded-full">
            FINAL SUBMISSION REVIEW
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/[0.05] hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div>
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Review your attempt before final submission
          </h2>
        </div>

        {/* 3 Summary Stat Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Answered Card */}
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 relative overflow-hidden">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-4 h-4 rounded-md bg-lime-400 text-black text-[10px] font-black flex items-center justify-center">
                ✓
              </span>
              <span className="text-[11px] font-bold text-neutral-300">Answered</span>
            </div>
            <p className="text-2xl font-black text-white tabular-nums">
              {String(answeredCount).padStart(2, "0")}
            </p>
            <p className="text-[10px] text-neutral-400 font-medium truncate mt-0.5">Server-confirmed</p>
          </div>

          {/* Unanswered Card */}
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 relative overflow-hidden">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-4 h-4 rounded-md bg-neutral-800 text-neutral-300 text-[10px] font-bold flex items-center justify-center">
                —
              </span>
              <span className="text-[11px] font-bold text-neutral-300">Unanswered</span>
            </div>
            <p className="text-2xl font-black text-white tabular-nums">
              {String(unansweredCount).padStart(2, "0")}
            </p>
            <p className="text-[10px] text-neutral-400 font-medium truncate mt-0.5">{unansweredRangeText}</p>
          </div>

          {/* Marked for Review Card */}
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 relative overflow-hidden">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-4 h-4 rounded-md bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">
                •
              </span>
              <span className="text-[11px] font-bold text-neutral-300">Review</span>
            </div>
            <p className="text-2xl font-black text-white tabular-nums">
              {String(markedCount).padStart(2, "0")}
            </p>
            <p className="text-[10px] text-neutral-400 font-medium truncate mt-0.5">{markedListText}</p>
          </div>
        </div>

        {/* Warning Banner if Unanswered Questions Remain */}
        {unansweredCount > 0 && (
          <div className="rounded-xl bg-amber-950/30 border border-amber-500/30 p-2.5 flex items-start gap-2.5">
            <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-xs font-bold text-amber-300">
                {unansweredCount} unanswered question{unansweredCount > 1 ? "s" : ""} remain
              </p>
              <p className="text-[10px] text-amber-200/80 leading-normal mt-0.5">
                Submitting now will leave them blank. You can return to complete them before the deadline.
              </p>
            </div>
          </div>
        )}

        {/* 2 Status Info Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-lime-400/10 border border-lime-400/20 text-lime-300 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white">Cloud sync active</p>
              <p className="text-[10px] text-neutral-400 leading-tight">
                {answeredCount} acknowledged at {nowIST}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/10 text-neutral-200 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white font-mono">{formatTime(timeLeft)} remaining</p>
              <p className="text-[10px] text-neutral-400 leading-tight">
                Server-calibrated session clock
              </p>
            </div>
          </div>
        </div>

        {/* Explanatory Policy Footnote */}
        <p className="text-[10px] text-neutral-400 leading-normal bg-white/[0.02] border border-white/[0.06] rounded-lg p-2.5">
          Marked questions are counted in score. Negative marking applies only to wrong answers, not unanswered questions.
        </p>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
          <span className="text-[10px] text-neutral-400 hidden sm:inline">
            Keep this window open while submitting.
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl border border-white/10 text-neutral-300 hover:text-white hover:bg-white/[0.06] text-xs font-bold transition-colors cursor-pointer"
            >
              Return to Test
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-lime-300 hover:bg-lime-200 text-black text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Final Submit</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
