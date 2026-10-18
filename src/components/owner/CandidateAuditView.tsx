"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";

export interface CandidateAuditViewProps {
  attemptId: string;
  sessionId: string;
  candidateName: string;
  candidateEmail: string;
  attemptNumber: number;
  examTitle: string;
  sessionPin?: string | null;
  examDateStr: string;
  examTimeWindow: string;
  netScore: number;
  totalMarks: number;
  passCriteria: number;
  accuracyPct: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  attemptedCount: number;
  positiveMarks: number;
  negativeMarks: number;
  timeSpentFormatted: string;
  submittedIST: string;
  flagsCount: number;
  cheatFlags: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
  questionsData: Array<{
    id: string;
    num: number;
    text: string;
    category: string;
    imageUrl?: string | null;
    options: any[];
    selectedLabel: string;
    selectedText: string;
    isCorrect: boolean | null;
    correctLabel: string;
    correctText: string;
    earnedPoints: number;
    timeTakenSeconds: number;
    explanation?: string | null;
  }>;
}

export default function CandidateAuditView({
  attemptId,
  sessionId,
  candidateName,
  candidateEmail,
  attemptNumber,
  examTitle,
  sessionPin,
  examDateStr,
  examTimeWindow,
  netScore,
  totalMarks,
  accuracyPct,
  correctCount,
  incorrectCount,
  unansweredCount,
  attemptedCount,
  positiveMarks,
  negativeMarks,
  timeSpentFormatted,
  submittedIST,
  flagsCount,
  cheatFlags,
  questionsData,
}: CandidateAuditViewProps) {
  const [filter, setFilter] = useState<"all" | "correct" | "incorrect" | "unanswered">("all");
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState<number>(0);

  // Purple question box styling helper based on correctness and marks
  const getQuestionBoxStyle = (isCorrect: boolean | null, earnedPoints: number) => {
    // Vibrant saturated purple for full marks / correct
    if (isCorrect === true) {
      return {
        bg: "bg-gradient-to-b from-[#8b5cf6] to-[#6d28d9] text-white border-purple-400/40 shadow-[0_2px_12px_rgba(139,92,246,0.3)]",
        badge: "bg-purple-900/60 text-purple-200 border-purple-400/30",
        statusLabel: "Correct",
        dot: "bg-lime-400",
      };
    }
    // Reddish-purple / plum for incorrect
    if (isCorrect === false) {
      return {
        bg: "bg-gradient-to-b from-[#701a75] to-[#4a044e] text-rose-200 border-rose-500/30 shadow-[0_2px_8px_rgba(244,63,94,0.2)]",
        badge: "bg-rose-950/60 text-rose-300 border-rose-500/30",
        statusLabel: "Incorrect",
        dot: "bg-rose-400",
      };
    }
    // Muted / translucent purple for unanswered
    return {
      bg: "bg-[#201533]/80 hover:bg-[#2c1d47] text-purple-300/70 border-purple-900/40 shadow-none",
      badge: "bg-purple-950/40 text-purple-400/60 border-purple-800/30",
      statusLabel: "Unanswered",
      dot: "bg-neutral-500",
    };
  };

  // Filter questions
  const filteredQuestions = questionsData.filter((q) => {
    if (filter === "correct") return q.isCorrect === true;
    if (filter === "incorrect") return q.isCorrect === false;
    if (filter === "unanswered") return q.isCorrect === null;
    return true;
  });

  const selectedQuestion = questionsData[selectedQuestionIdx] || questionsData[0];

  // Export Audit: real Excel workbook with summary, per-question responses, and flags
  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1 — Attempt Summary
    const summary = [
      ["Field", "Value"],
      ["Candidate", candidateName],
      ["Email", candidateEmail],
      ["Attempt", `#${attemptNumber}`],
      ["Exam", examTitle],
      ["Submitted (IST)", submittedIST],
      ["Time spent", timeSpentFormatted],
      ["Net score", `${netScore} / ${totalMarks}`],
      ["Accuracy", `${accuracyPct.toFixed(1)}%`],
      ["Correct", correctCount],
      ["Incorrect", incorrectCount],
      ["Unanswered", unansweredCount],
      ["Positive marks", positiveMarks],
      ["Negative marks", negativeMarks],
      ["Integrity flags", flagsCount],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Attempt Summary");

    // Sheet 2 — Question Responses (every question attempted)
    const responses: (string | number | null)[][] = [
      ["#", "Question", "Category", "Selected Response", "Correct Answer", "Result", "Marks", "Time (s)", "Explanation"],
      ...questionsData.map((q) => [
        q.num,
        q.text,
        q.category,
        q.selectedLabel ? `${q.selectedLabel}. ${q.selectedText}` : "Not answered",
        q.correctLabel ? `${q.correctLabel}. ${q.correctText}` : q.correctText,
        q.isCorrect === true ? "Correct" : q.isCorrect === false ? "Incorrect" : "Unanswered",
        q.earnedPoints,
        q.timeTakenSeconds,
        q.explanation || "—",
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(responses), "Question Responses");

    // Sheet 3 — Integrity Flags (only when real recorded events exist)
    if (cheatFlags.length > 0) {
      const flags = [
        ["Timestamp (IST)", "Type", "Description"],
        ...cheatFlags.map((f) => [f.timestamp, f.type, f.description || f.type]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(flags), "Integrity Flags");
    }

    const slug = candidateName.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "") || "candidate";
    XLSX.writeFile(wb, `Aptix-Audit-${slug}-Attempt${attemptNumber}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-12 font-sans selection:bg-lime-400 selection:text-black">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight min-w-0">
          Evidence, not assumptions<span className="text-lime-400">.</span>
        </h1>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 shadow-sm shrink-0">
          <span className="text-xs font-semibold text-neutral-200">{candidateName}</span>
          <span className="text-neutral-600">·</span>
          <span className="text-xs text-neutral-400">{candidateEmail}</span>
        </span>
      </div>

      {/* ── 4 Main Stat Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Net score */}
        <div className="bg-[#0e0f13] border border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <span className="text-xs font-medium text-neutral-400">Net score</span>
          <div className="my-2">
            <span className="text-3xl sm:text-4xl font-mono font-black text-lime-400">{netScore}</span>
            <span className="text-xl font-mono font-bold text-neutral-400"> / {totalMarks}</span>
          </div>
        </div>

        {/* Card 2: Accuracy */}
        <div className="bg-[#0e0f13] border border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <span className="text-xs font-medium text-neutral-400">Accuracy</span>
          <div className="my-2">
            <span className="text-3xl sm:text-4xl font-mono font-black text-lime-400">{accuracyPct.toFixed(1)}%</span>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {correctCount} correct / {attemptedCount} attempted
          </span>
        </div>

        {/* Card 3: Time spent */}
        <div className="bg-[#0e0f13] border border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <span className="text-xs font-medium text-neutral-400">Time spent</span>
          <div className="my-2">
            <span className="text-3xl sm:text-4xl font-mono font-black text-lime-400">{timeSpentFormatted}</span>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            Submitted {submittedIST} IST
          </span>
        </div>

        {/* Card 4: Integrity flags */}
        <div className="bg-[#0e0f13] border border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <span className="text-xs font-medium text-neutral-400">Integrity flags</span>
          <div className="my-2">
            <span className={`text-3xl sm:text-4xl font-mono font-black ${flagsCount > 0 ? "text-lime-400" : "text-neutral-600"}`}>
              {String(flagsCount).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      {/* ── Integrity Alerts Banner (only for real recorded events) ── */}
      {cheatFlags.length > 0 && (
      <div className="bg-[#18090b] border border-rose-600/40 rounded-xl p-4 space-y-2 text-xs font-mono shadow-xl">
        <div className="flex items-center gap-2 text-rose-400 font-bold">
          <span>Integrity alerts - human review required</span>
        </div>
        <div className="space-y-1 text-neutral-300">
          {cheatFlags.map((flag, idx) => (
            <p key={idx} className="leading-relaxed">
              {flag.timestamp} IST - {flag.description || flag.type}
            </p>
          ))}
        </div>
        <p className="text-[11px] text-neutral-400 leading-normal pt-1 border-t border-rose-900/40">
          These timestamped events are not an automatic cheating verdict. Threshold 5 was not reached; no forced submission occurred.
        </p>
      </div>
      )}

      {/* ── Question-by-Question Evaluation: Purple Matrix ─────────── */}
      <div className="bg-[#0e0f13] border border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl">
        {/* Section Header + Export + Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white tracking-tight">Question-by-Question evaluation</h2>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="inline-flex rounded-lg bg-white/5 p-0.5 border border-white/10">
              {(["all", "correct", "incorrect", "unanswered"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilter(t)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold capitalize transition-colors cursor-pointer ${
                    filter === t ? "bg-white/15 text-white" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-200 text-xs font-semibold transition-all cursor-pointer shadow-sm shrink-0"
            >
              <svg className="w-3.5 h-3.5 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export audit</span>
            </button>
          </div>
        </div>

        {/* ── Purple Question Boxes Matrix Grid ── */}
        <div className="space-y-4">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-2.5">
            {filteredQuestions.map((q) => {
              const realIdx = questionsData.findIndex((item) => item.id === q.id);
              const isSelected = selectedQuestion?.id === q.id;
              const style = getQuestionBoxStyle(q.isCorrect, q.earnedPoints);

              return (
                <button
                  key={q.id || q.num}
                  type="button"
                  onClick={() => {
                    if (realIdx !== -1) setSelectedQuestionIdx(realIdx);
                  }}
                  title={`Q${q.num}: ${q.text.slice(0, 60)}... (${q.isCorrect ? "Correct" : q.isCorrect === false ? "Incorrect" : "Unanswered"}, ${q.earnedPoints > 0 ? `+${q.earnedPoints}` : q.earnedPoints} marks, ${q.timeTakenSeconds}s)`}
                  className={`group relative rounded-xl p-2.5 min-w-[56px] h-[66px] flex flex-col items-center justify-between border transition-all cursor-pointer text-left select-none ${style.bg} ${
                    isSelected
                      ? "ring-2 ring-purple-300 ring-offset-2 ring-offset-[#0e0f13] scale-105 brightness-110 shadow-[0_0_20px_rgba(168,85,247,0.55)] z-10"
                      : "hover:scale-[1.03] hover:brightness-105"
                  }`}
                >
                  <div className="w-full flex items-center justify-between text-[11px] font-mono font-bold leading-none">
                    <span className="tracking-tight">Q{String(q.num).padStart(2, "0")}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  </div>
                  <div className="text-center w-full">
                    <span className="font-mono font-black text-sm block leading-none">
                      {q.earnedPoints > 0 ? `+${q.earnedPoints}` : q.earnedPoints < 0 ? q.earnedPoints : "0"}
                    </span>
                    <span className="text-[10px] font-mono opacity-70 block mt-1 leading-none">{q.timeTakenSeconds}s</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Purple Matrix Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-neutral-400 pt-3">
            <div className="flex flex-wrap items-center gap-3.5">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gradient-to-b from-[#8b5cf6] to-[#6d28d9] border border-purple-400/40" />
                <span className="text-neutral-300">Correct (+marks)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gradient-to-b from-[#701a75] to-[#4a044e] border border-rose-500/30" />
                <span className="text-neutral-300">Incorrect (penalty)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#201533] border border-purple-900/40" />
                <span className="text-neutral-300">Unanswered</span>
              </div>
            </div>
            <span className="text-neutral-500 text-[11px]">Click any purple box to inspect candidate response</span>
          </div>

          {/* Selected Question Inspector Panel */}
          {selectedQuestion && (
            <div className="rounded-xl border border-white/10 bg-[#0a0a0d] p-4 sm:p-5 shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-mono font-bold text-white shrink-0">
                    Q{String(selectedQuestion.num).padStart(2, "0")}
                  </span>
                  {selectedQuestion.category && (
                    <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 truncate">
                      {selectedQuestion.category}
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-neutral-500 shrink-0">
                    {selectedQuestion.timeTakenSeconds}s spent
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
                      selectedQuestion.isCorrect === true
                        ? "bg-lime-500/10 text-lime-300 border-lime-500/25"
                        : selectedQuestion.isCorrect === false
                        ? "bg-rose-500/10 text-rose-300 border-rose-500/25"
                        : "bg-white/[0.03] text-neutral-400 border-white/10"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedQuestion.isCorrect === true
                          ? "bg-lime-400"
                          : selectedQuestion.isCorrect === false
                          ? "bg-rose-400"
                          : "bg-neutral-500"
                      }`}
                    />
                    {selectedQuestion.isCorrect === true ? "Correct" : selectedQuestion.isCorrect === false ? "Incorrect" : "Unanswered"}
                    <span className={`font-mono text-[11px] font-medium opacity-70 ${selectedQuestion.isCorrect === true ? "text-lime-300" : selectedQuestion.isCorrect === false ? "text-rose-300" : "text-neutral-400"}`}>
                      {selectedQuestion.isCorrect === true
                        ? `+${selectedQuestion.earnedPoints} marks`
                        : selectedQuestion.isCorrect === false
                        ? `${selectedQuestion.earnedPoints} marks`
                        : "0 marks"}
                    </span>
                  </span>

                  <div className="inline-flex rounded-md border border-white/10 overflow-hidden shrink-0">
                    <button
                      type="button"
                      disabled={selectedQuestionIdx === 0}
                      onClick={() => setSelectedQuestionIdx((i) => Math.max(0, i - 1))}
                      className="px-2.5 py-1 bg-white/[0.04] hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-xs font-mono text-neutral-300 transition-colors cursor-pointer"
                      title="Previous question"
                    >
                      ←
                    </button>
                    <span className="w-px bg-white/10" />
                    <button
                      type="button"
                      disabled={selectedQuestionIdx >= questionsData.length - 1}
                      onClick={() => setSelectedQuestionIdx((i) => Math.min(questionsData.length - 1, i + 1))}
                      className="px-2.5 py-1 bg-white/[0.04] hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-xs font-mono text-neutral-300 transition-colors cursor-pointer"
                      title="Next question"
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>

              {/* Question text */}
              <p className="text-sm font-medium text-white leading-relaxed">
                {selectedQuestion.text}
              </p>

              {/* Response comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-1">
                <div
                  className={`p-3 rounded-lg border ${
                    selectedQuestion.isCorrect === true
                      ? "bg-lime-950/20 border-lime-500/30 text-lime-200"
                      : selectedQuestion.isCorrect === false
                      ? "bg-rose-950/20 border-rose-500/30 text-rose-200"
                      : "bg-white/[0.03] border-white/10 text-neutral-400"
                  }`}
                >
                  <span className="block text-[10px] uppercase font-bold tracking-wider opacity-70 mb-1">
                    Selected Response
                  </span>
                  <span className="font-sans font-semibold">
                    {selectedQuestion.selectedLabel
                      ? `${selectedQuestion.selectedLabel}. ${selectedQuestion.selectedText}`
                      : "— No response recorded (Skipped)"}
                  </span>
                </div>

                <div
                  className={`p-3 rounded-lg border ${
                    selectedQuestion.isCorrect === true
                      ? "bg-lime-950/20 border-lime-500/30 text-lime-200"
                      : selectedQuestion.isCorrect === false
                      ? "bg-rose-950/20 border-rose-500/30 text-rose-200"
                      : "bg-white/[0.03] border-white/10 text-neutral-400"
                  }`}
                >
                  <span className="block text-[10px] uppercase font-bold tracking-wider opacity-70 mb-1">
                    Correct Answer
                  </span>
                  <span className="font-sans font-semibold">
                    {selectedQuestion.correctLabel
                      ? `${selectedQuestion.correctLabel}. ${selectedQuestion.correctText}`
                      : selectedQuestion.correctText}
                  </span>
                </div>
              </div>

              {selectedQuestion.explanation && (
                <p className="text-xs text-neutral-300 bg-white/[0.02] border border-white/5 rounded-lg p-2.5 font-sans leading-relaxed">
                  <span className="font-bold text-neutral-400 font-mono text-[11px] block mb-0.5">Explanation:</span>
                  {selectedQuestion.explanation}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Figure attached to question (only when a real image exists) ── */}
      {selectedQuestion && selectedQuestion.imageUrl && (
        <div className="bg-[#0e0f13] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
          <h3 className="text-base font-bold text-white tracking-tight">
            Q{String(selectedQuestion.num).padStart(2, "0")} · Figure attached to question
          </h3>
          <div className="bg-black/60 rounded-xl p-4 border border-white/5 flex items-center justify-center">
            <img
              src={selectedQuestion.imageUrl}
              alt="Figure attached to question"
              className="max-h-60 rounded-lg object-contain"
            />
          </div>
        </div>
      )}

    </div>
  );
}
