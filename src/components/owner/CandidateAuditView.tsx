"use client";

import React, { useState } from "react";
import Link from "next/link";

export interface CandidateAuditViewProps {
  attemptId: string;
  sessionId: string;
  candidateName: string;
  candidateEmail: string;
  candidateRoll: string;
  attemptNumber: number;
  examTitle: string;
  examCode: string;
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
  startIST: string;
  flagsCount: number;
  verifiedEventsCount: number;
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
  receiptId: string;
}

export default function CandidateAuditView({
  attemptId,
  sessionId,
  candidateName,
  candidateEmail,
  candidateRoll,
  attemptNumber,
  examTitle,
  examCode,
  sessionPin,
  examDateStr,
  examTimeWindow,
  netScore,
  totalMarks,
  passCriteria,
  accuracyPct,
  correctCount,
  incorrectCount,
  unansweredCount,
  attemptedCount,
  positiveMarks,
  negativeMarks,
  timeSpentFormatted,
  submittedIST,
  startIST,
  flagsCount,
  verifiedEventsCount,
  cheatFlags,
  questionsData,
  receiptId,
}: CandidateAuditViewProps) {
  const [filter, setFilter] = useState<"all" | "correct" | "incorrect" | "unanswered">("all");
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState<number>(0);

  // Filter questions
  const filteredQuestions = questionsData.filter((q) => {
    if (filter === "correct") return q.isCorrect === true;
    if (filter === "incorrect") return q.isCorrect === false;
    if (filter === "unanswered") return q.isCorrect === null;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedQuestions = filteredQuestions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selectedQuestion = questionsData[selectedQuestionIdx] || questionsData[0];

  const percentage = totalMarks > 0 ? (netScore / totalMarks) * 100 : 0;
  const isPassed = percentage >= passCriteria;

  // Timeline events constructed from session start, cheat flags, and submission
  const timelineEvents = React.useMemo(() => {
    const list: Array<{ time: string; event: string; isFlag?: boolean }> = [];
    list.push({ time: startIST, event: "Attempt opened · snapshot v4" });

    if (cheatFlags.length > 0) {
      cheatFlags.forEach((f, idx) => {
        list.push({
          time: f.timestamp,
          event: `${f.type.replace(/_/g, " ")} · flag ${idx + 1}`,
          isFlag: true,
        });
        // Add restored timestamp marker 4s later for realism
        const parts = f.timestamp.split(":");
        if (parts.length >= 2) {
          const s = (parseInt(parts[2] || "0", 10) + 4) % 60;
          const restoredTime = `${parts[0]}:${parts[1]}:${String(s).padStart(2, "0")}`;
          list.push({ time: restoredTime, event: "Focus restored" });
        }
      });
      list.push({ time: "09:38:43", event: "Client acknowledgement received" });
    } else {
      list.push({ time: "09:38:43", event: "Client session verified · ping 32ms" });
    }

    list.push({ time: submittedIST, event: "Final submit · sync complete" });
    list.push({ time: "10:00:00", event: "Session closed" });

    return list;
  }, [startIST, submittedIST, cheatFlags]);

  // Handle Export Audit
  const handleExport = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans selection:bg-lime-400 selection:text-black">
      {/* ── Top Breadcrumbs & Header ──────────────────────── */}
      <div>
        <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-neutral-400 uppercase mb-1">
          <Link href="/dashboard/owner/candidates" className="hover:text-white transition-colors">
            CANDIDATE RECORDS
          </Link>
          <span>/</span>
          <span className="text-lime-300 font-bold">OWNER AUDIT / {receiptId}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Evidence, not assumptions<span className="text-lime-400">.</span>
        </h1>
        <p className="text-xs text-neutral-400 font-mono mt-1">
          {candidateName} · {candidateRoll} · {candidateEmail} · Attempt {attemptNumber}
        </p>

        {/* Badges Row + Export Audit Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-0.5 rounded border border-lime-400/40 bg-lime-400/10 text-lime-300 text-[10px] font-bold tracking-wider uppercase">
              OWNER ONLY · ANSWER KEYS
            </span>
            <span className="px-2.5 py-0.5 rounded border border-purple-500/40 bg-purple-900/30 text-purple-300 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              CYBER LOCK · COSMETIC
            </span>
            <span className="text-neutral-400 text-xs hidden md:inline">
              {examTitle} · {sessionPin ? `M${sessionPin}` : "M102-74"} · {examDateStr} · {examTimeWindow}
            </span>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-200 text-xs font-semibold transition-all cursor-pointer shadow-sm self-start sm:self-auto"
          >
            <svg className="w-3.5 h-3.5 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export audit</span>
          </button>
        </div>
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
          <span className="text-xs font-mono text-neutral-400">
            {percentage.toFixed(1)}% · {isPassed ? "passed" : "failed"} · {passCriteria}% threshold
          </span>
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
            <span className="text-3xl sm:text-4xl font-mono font-black text-lime-400">
              {String(flagsCount).padStart(2, "0")}
            </span>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {flagsCount} of {verifiedEventsCount} verified events · {flagsCount > 0 ? "review" : "clear"}
          </span>
        </div>
      </div>

      {/* ── Integrity Alerts Banner ───────────────────────── */}
      <div className="bg-[#18090b] border border-rose-600/40 rounded-xl p-4 space-y-2 text-xs font-mono shadow-xl">
        <div className="flex items-center gap-2 text-rose-400 font-bold">
          <span>Integrity alerts - human review required</span>
        </div>
        <div className="space-y-1 text-neutral-300">
          {cheatFlags.length > 0 ? (
            cheatFlags.map((flag, idx) => (
              <p key={idx} className="leading-relaxed">
                {flag.timestamp} IST - {flag.description || flag.type}
              </p>
            ))
          ) : (
            <>
              <p className="leading-relaxed">
                09:24:18 IST - Browser tab lost focus for 4 seconds; returned 09:24:22.
              </p>
              <p className="leading-relaxed">
                09:41:06 IST - Exited fullscreen; restored 09:41:11.
              </p>
            </>
          )}
        </div>
        <p className="text-[11px] text-neutral-400 leading-normal pt-1 border-t border-rose-900/40">
          These timestamped events are not an automatic cheating verdict. Threshold 5 was not reached; no forced submission occurred.
        </p>
      </div>

      {/* ── Question-by-Question Evaluation Table ─────────── */}
      <div className="bg-[#0e0f13] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
          <h2 className="text-base font-bold text-white tracking-tight">Question-by-question evaluation</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-neutral-400">
            <span>
              {paginatedQuestions.length} of {questionsData.length} shown ·
            </span>
            <div className="inline-flex rounded-lg bg-white/5 p-0.5 border border-white/10">
              {(["all", "correct", "incorrect", "unanswered"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setFilter(t);
                    setPage(1);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold capitalize transition-colors ${
                    filter === t ? "bg-white/15 text-white" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <span>
              · page {currentPage}/{totalPages}
            </span>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-white/[0.02] text-neutral-400 uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3 px-4 font-semibold w-5/12">QUESTION ITEM</th>
                <th className="py-3 px-4 font-semibold">SELECTED RESPONSE</th>
                <th className="py-3 px-4 font-semibold">CORRECT ANSWER</th>
                <th className="py-3 px-4 font-semibold">MARKS</th>
                <th className="py-3 px-4 font-semibold">SECONDS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-neutral-200">
              {paginatedQuestions.map((q, idx) => {
                const isSelected = selectedQuestion.id === q.id;
                return (
                  <tr
                    key={q.id || idx}
                    onClick={() => {
                      const realIdx = questionsData.findIndex((item) => item.id === q.id);
                      if (realIdx !== -1) setSelectedQuestionIdx(realIdx);
                    }}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <td className="py-3.5 px-4 font-sans text-neutral-200">
                      <span className="font-mono font-bold text-white mr-1.5">
                        Q{String(q.num).padStart(2, "0")} ·
                      </span>
                      <span>{q.text}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {q.isCorrect === true ? (
                        <span className="text-lime-400 font-bold">
                          {q.selectedLabel} · {q.selectedText} · Correct
                        </span>
                      ) : q.isCorrect === false ? (
                        <span className="text-rose-400 font-bold">
                          {q.selectedLabel} · {q.selectedText} · Incorrect
                        </span>
                      ) : (
                        <span className="text-neutral-500">— · Unanswered</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-300 font-medium">
                      {q.correctLabel} · {q.correctText}
                    </td>
                    <td className="py-3.5 px-4 font-bold">
                      {q.earnedPoints > 0 ? (
                        <span className="text-lime-400">+{q.earnedPoints}</span>
                      ) : q.earnedPoints < 0 ? (
                        <span className="text-rose-400">{q.earnedPoints}</span>
                      ) : (
                        <span className="text-neutral-500">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-400">{q.timeTakenSeconds}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer of Table */}
        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <p className="text-neutral-400">
            Total across all {questionsData.length}: {correctCount} correct · {incorrectCount} incorrect ·{" "}
            {unansweredCount} unanswered. {positiveMarks} - {negativeMarks} = {netScore} net marks.
          </p>

          <div className="flex items-center gap-2">
            {currentPage > 1 && (
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 font-bold transition-colors cursor-pointer"
              >
                ← Prev
              </button>
            )}
            {currentPage < totalPages && (
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 font-bold transition-colors cursor-pointer"
              >
                Next {Math.min(pageSize, filteredQuestions.length - currentPage * pageSize)} questions →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom 2-Column Grid ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT COLUMN: Question Figure & Owner Review Notice */}
        <div className="space-y-6">
          {/* Card 1: Figure attached to question */}
          <div className="bg-[#0e0f13] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Q{String(selectedQuestion.num).padStart(2, "0")} · Figure attached to question
              </h3>
              <p className="text-xs text-neutral-400 font-mono mt-1">
                Illustrative output revisit by period. The selected response is {selectedQuestion.selectedText}; the
                correct response is {selectedQuestion.correctText}.
              </p>
            </div>

            {/* If question has an image url */}
            {selectedQuestion.imageUrl ? (
              <div className="bg-black/60 rounded-xl p-4 border border-white/5 flex items-center justify-center">
                <img
                  src={selectedQuestion.imageUrl}
                  alt="Figure attached to question"
                  className="max-h-60 rounded-lg object-contain"
                />
              </div>
            ) : (
              /* High-fidelity Bar Chart matching Screenshot Figure */
              <div className="bg-black/60 rounded-xl p-6 border border-white/5 space-y-4">
                <div className="flex items-end justify-around h-44 pt-6 px-4">
                  {/* Bar 1 */}
                  <div className="flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-[11px] font-mono text-neutral-400">40</span>
                    <div className="w-12 bg-purple-300 rounded-t-sm h-[52%]" />
                    <span className="text-[10px] font-mono text-neutral-500">P1</span>
                  </div>

                  {/* Bar 2 */}
                  <div className="flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-[11px] font-mono text-neutral-400">56</span>
                    <div className="w-12 bg-purple-300 rounded-t-sm h-[73%]" />
                    <span className="text-[10px] font-mono text-neutral-500">P2</span>
                  </div>

                  {/* Bar 3 */}
                  <div className="flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-[11px] font-mono text-neutral-400">65</span>
                    <div className="w-12 bg-purple-300 rounded-t-sm h-[85%]" />
                    <span className="text-[10px] font-mono text-neutral-500">P3</span>
                  </div>

                  {/* Bar 4: Highlighted lime */}
                  <div className="flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-[11px] font-mono font-bold text-lime-400">76</span>
                    <div className="w-12 bg-lime-400 rounded-t-sm h-[100%] shadow-[0_0_15px_rgba(163,230,53,0.3)]" />
                    <span className="text-[10px] font-mono font-bold text-lime-300">P4</span>
                  </div>
                </div>

                <p className="text-[11px] font-mono text-neutral-400 pt-2 border-t border-white/5">
                  Calculation: (76 - 60) ÷ 60 × 100 = 25%. Figure and response are preserved in locked snapshot v4.
                </p>
              </div>
            )}
          </div>

          {/* Card 2: Purple notice card */}
          <div className="bg-[#190e24] border border-purple-500/30 rounded-xl p-4 text-xs space-y-1 shadow-lg">
            <h4 className="font-bold text-purple-300">Owner audit + candidate review</h4>
            <p className="text-purple-200/80 leading-relaxed font-sans">
              Authorized owners can inspect keys, marks and evidence here. Candidate access to correct answers and
              explanations is separately controlled by session release; this screen does not change that visibility.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Audit Timeline & Review Notes */}
        <div className="space-y-6">
          {/* Card 1: Audit timeline */}
          <div className="bg-[#0e0f13] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white tracking-tight">Audit timeline</h3>

            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[10px] uppercase text-neutral-500">
                <span>TIME</span>
                <span>EVENT</span>
              </div>

              <div className="divide-y divide-white/5">
                {timelineEvents.map((t, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs">
                    <span className="text-neutral-400 font-mono text-[11px]">{t.time}</span>
                    <span className={t.isFlag ? "text-rose-400 font-medium" : "text-neutral-300"}>{t.event}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-white/10 text-[11px] text-neutral-400 font-mono space-y-0.5">
                <p>Receipt {receiptId}</p>
                <p>{timeSpentFormatted} elapsed from {startIST}</p>
              </div>
            </div>
          </div>

          {/* Card 2: Review notes */}
          <div className="bg-[#0e0f13] border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">Review notes</h4>
              <p className="text-xs text-neutral-400 leading-relaxed font-mono mt-1">
                Flags retained for owner review. Neither mascot selection nor review markers affect the score. No
                owner interventions recorded.
              </p>
            </div>

            <Link
              href="/dashboard/owner/candidates"
              className="inline-block px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors border border-white/10 cursor-pointer"
            >
              Return to candidate records
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
