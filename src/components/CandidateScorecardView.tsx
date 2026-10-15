"use client";

import React, { useState } from "react";
import { getMascotById } from "@/lib/mascots";

interface CandidateScorecardProps {
  candidateName?: string;
  candidateRoll?: string;
  examTitle?: string;
  examCode?: string;
  dateStr?: string;
  attemptNumber?: number;
  finalScore?: number | null;
  totalMarks?: number | null;
  timeTakenSeconds?: number;
  allottedMinutes?: number;
  questions?: any[];
  answers?: Record<string, any>;
  detailedResults?: any[];
  timeSpent?: Record<string, number>;
  cohort?: {
    rank: number;
    totalCandidates: number;
    percentile: number;
    mean: number;
    median: number;
    topScores?: number[];
    podium?: { name: string; score: number; mascot: string; gifUrl?: string; mascotId?: string }[];
    podiumRevealed?: boolean;
  } | null;
  onReturnToLogin?: () => void;
}

function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export default function CandidateScorecardView({
  candidateName = "Candidate",
  candidateRoll = "NB2026-0418",
  examTitle = "Assessment",
  examCode = "ENG-26",
  dateStr,
  attemptNumber = 1,
  finalScore = 0,
  totalMarks = 10,
  timeTakenSeconds = 180,
  allottedMinutes = 60,
  questions = [],
  answers = {},
  detailedResults,
  timeSpent,
  cohort,
  onReturnToLogin,
}: CandidateScorecardProps) {
  const [activeTab, setActiveTab] = useState<"standard" | "gamified" | "all">("standard");
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);

  const displayDate = dateStr || (typeof window !== "undefined"
    ? new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "15 Jan 2026");
  const calculatedTotalMarks = totalMarks || (questions && questions.length > 0 ? questions.reduce((sum, q) => sum + (q.points || 1), 0) : 10);
  const marksDisplay = calculatedTotalMarks;
  const scoreDisplay = finalScore !== null && finalScore !== undefined ? finalScore : 0;
  const accuracyPct = marksDisplay ? ((scoreDisplay / marksDisplay) * 100).toFixed(1) : "0.0";
  const mins = Math.floor(timeTakenSeconds / 60);
  const secs = timeTakenSeconds % 60;
  const timeFormatted = `${mins}m ${String(secs).padStart(2, "0")}s`;

  // Dynamic accuracy calculation from actual attempt responses
  const computedStats = React.useMemo(() => {
    const totalQ = questions.length || 0;
    if (totalQ === 0) {
      return { correct: 0, wrong: 0, blank: 0 };
    }

    let correct = 0;
    let wrong = 0;
    let blank = 0;

    questions.forEach((q) => {
      const qId = q.id;
      const ans = answers[qId];
      const hasAnswer = ans !== undefined && ans !== "" && !(Array.isArray(ans) && ans.length === 0);

      if (!hasAnswer) {
        blank++;
      } else if (detailedResults && detailedResults.length > 0) {
        const res = detailedResults.find((r) => r.questionId === qId);
        if (res?.isCorrect) {
          correct++;
        } else {
          wrong++;
        }
      } else {
        const points = q.points || 1;
        if (finalScore !== null && finalScore !== undefined && correct * points < finalScore) {
          correct++;
        } else {
          wrong++;
        }
      }
    });

    return { correct, wrong, blank };
  }, [questions, answers, detailedResults, finalScore]);

  // Dynamic cohort statistics
  const cohortPercentile = cohort ? cohort.percentile : Math.max(1, Math.min(100, Math.round(Number(accuracyPct))));
  const cohortRank = cohort ? cohort.rank : 1;
  const cohortTotal = cohort ? cohort.totalCandidates : 1;
  const cohortMean = cohort ? cohort.mean : scoreDisplay;
  const cohortMedian = cohort ? cohort.median : scoreDisplay;
  const cohortDiff = scoreDisplay - cohortMean;

  // Dynamic category breakdown computed from questions, answers, and grading
  const categories = React.useMemo(() => {
    if (!questions || questions.length === 0) {
      return [
        {
          name: "General",
          correct: computedStats.correct,
          wrong: computedStats.wrong,
          blank: computedStats.blank,
          netScore: `${scoreDisplay} / ${marksDisplay}`,
          accuracy: `${accuracyPct}%`
        }
      ];
    }

    const catMap: Record<string, {
      name: string;
      correct: number;
      wrong: number;
      blank: number;
      earned: number;
      total: number;
    }> = {};

    questions.forEach((q) => {
      const cat = q.category || "General";
      if (!catMap[cat]) {
        catMap[cat] = { name: cat, correct: 0, wrong: 0, blank: 0, earned: 0, total: 0 };
      }

      const qId = q.id;
      const pts = q.points || 1;
      const neg = q.negativePoints || 0;
      catMap[cat].total += pts;

      const ans = answers[qId];
      const hasAnswer = ans !== undefined && ans !== "" && !(Array.isArray(ans) && ans.length === 0);
      const res = detailedResults?.find((r) => r.questionId === qId);

      if (!hasAnswer) {
        catMap[cat].blank++;
      } else if (res ? res.isCorrect : (ans === q.answerData)) {
        catMap[cat].correct++;
        catMap[cat].earned += (res?.earnedPoints ?? pts);
      } else {
        catMap[cat].wrong++;
        catMap[cat].earned -= neg;
      }
    });

    return Object.values(catMap).map((c) => {
      const attempted = c.correct + c.wrong;
      const accuracy = attempted > 0 ? `${((c.correct / attempted) * 100).toFixed(1)}%` : "0.0%";
      const netScore = `${Math.max(0, Math.round(c.earned * 10) / 10)} / ${c.total}`;
      return {
        name: c.name,
        correct: c.correct,
        wrong: c.wrong,
        blank: c.blank,
        netScore,
        accuracy
      };
    });
  }, [questions, answers, detailedResults, computedStats, scoreDisplay, marksDisplay, accuracyPct]);

  // Dynamic question rows for Question-by-Question Review
  const questionRows = React.useMemo(() => {
    if (!questions || questions.length === 0) {
      return [];
    }

    return questions.map((q, idx) => {
      const qId = q.id;
      const userAns = answers[qId];
      const hasAnswer = userAns !== undefined && userAns !== "" && !(Array.isArray(userAns) && userAns.length === 0);
      const res = detailedResults?.find((r) => r.questionId === qId);

      const isCorrect = hasAnswer && res ? !!res.isCorrect : hasAnswer ? false : null;
      const pts = q.points || 1;
      const neg = q.negativePoints || 0;

      let status = "Unattempted 0";
      if (hasAnswer) {
        if (isCorrect) {
          status = `Correct +${pts}`;
        } else {
          status = neg > 0 ? `Incorrect -${neg}` : "Incorrect 0";
        }
      }

      const qTimeMs = timeSpent?.[qId] || 0;
      const qSec = Math.round(qTimeMs / 1000);
      const timeStr = qSec >= 60 ? `${Math.floor(qSec / 60)}m ${qSec % 60}s` : `${qSec}s`;

      const userAnsLabel = hasAnswer 
        ? (typeof userAns === "string" ? userAns : JSON.stringify(userAns))
        : "—";
      const correctAnsLabel = res?.correctAnswer || "—";

      let optionsList: any[] = [];
      if (Array.isArray(q.options)) {
        optionsList = q.options;
      } else if (typeof q.options === "string") {
        try {
          optionsList = JSON.parse(q.options);
        } catch {
          optionsList = [];
        }
      }

      return {
        id: qId,
        num: `Q${String(idx + 1).padStart(2, "0")}`,
        title: q.text ? (q.text.length > 32 ? q.text.slice(0, 32) + "…" : q.text) : `Question ${idx + 1}`,
        fullText: q.text || "",
        category: q.category || "General",
        options: optionsList,
        userAns: `${userAnsLabel.slice(0, 8)} / ${correctAnsLabel.slice(0, 8)}`,
        userAnsFull: userAnsLabel,
        correctAnsFull: correctAnsLabel,
        explanation: res?.explanation || null,
        status,
        isCorrect,
        time: timeStr || "0s",
      };
    });
  }, [questions, answers, detailedResults, timeSpent]);

  const selectedQ = questionRows[selectedQuestionIndex] || questionRows[0];

  const initials = (candidateName || "Candidate")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "CD";

  // Dynamic streaks computation across question sequence and categories
  const { maxStreak, categoryStreaks } = React.useMemo(() => {
    let currentStreak = 0;
    let maxS = 0;
    const catMap: Record<string, { current: number; max: number }> = {};

    questionRows.forEach((row) => {
      const cat = row.category || "General";
      if (!catMap[cat]) {
        catMap[cat] = { current: 0, max: 0 };
      }

      if (row.isCorrect) {
        currentStreak++;
        if (currentStreak > maxS) maxS = currentStreak;

        catMap[cat].current++;
        if (catMap[cat].current > catMap[cat].max) {
          catMap[cat].max = catMap[cat].current;
        }
      } else {
        currentStreak = 0;
        catMap[cat].current = 0;
      }
    });

    const streaksList = Object.entries(catMap).map(([cat, val]) => ({
      name: cat,
      streak: val.max,
    }));
    streaksList.sort((a, b) => b.streak - a.streak);

    return {
      maxStreak: maxS,
      categoryStreaks: streaksList.length > 0 ? streaksList : [{ name: "General", streak: maxS }],
    };
  }, [questionRows]);

  // Dynamic podium: real submitted cohort members with emblems, never fabricated
  const podium = React.useMemo(() => {
    const entries = Array.isArray(cohort?.podium) ? cohort.podium.slice(0, 3) : [];
    if (entries.length === 0) return [];

    const first = entries[0] || null;
    const second = entries[1] || null;
    const third = entries[2] || null;
    const max = Math.max(...entries.map((e) => e.score), 1);

    const buildPillar = (
      e: typeof entries[0] | null,
      place: string,
      pillarBg: string,
      scoreColor: string,
      ringColor: string,
      baseH: number
    ) => {
      if (!e) return null;
      const resolved = getMascotById(e.mascotId || e.mascot);
      const gifUrl = e.gifUrl || (e.mascot?.startsWith("/") ? e.mascot : resolved?.gifUrl);
      return {
        ...e,
        gifUrl,
        resolvedMascot: resolved,
        place,
        pillarBg,
        scoreColor,
        ringColor,
        h: baseH + Math.round(50 * (e.score / max)),
      };
    };

    // If 1 candidate: show 1st place in center
    // If 2 candidates: show 2nd (left) and 1st (center/right)
    // If 3 candidates: show 2nd (left), 1st (center), 3rd (right)
    const ordered = [
      buildPillar(
        second,
        "2nd",
        "bg-gradient-to-t from-purple-950/70 to-purple-500/30 border-purple-400/50 shadow-[0_0_20px_rgba(192,132,252,0.2)]",
        "text-purple-300",
        "ring-purple-400/40",
        95
      ),
      buildPillar(
        first,
        "1st",
        "bg-gradient-to-t from-lime-950/70 to-lime-500/30 border-lime-400/50 shadow-[0_0_25px_rgba(163,230,53,0.25)]",
        "text-lime-300",
        "ring-lime-400/50",
        130
      ),
      buildPillar(
        third,
        "3rd",
        "bg-gradient-to-t from-amber-950/70 to-amber-500/30 border-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.2)]",
        "text-amber-300",
        "ring-amber-400/40",
        80
      ),
    ].filter(Boolean) as NonNullable<ReturnType<typeof buildPillar>>[];

    return ordered;
  }, [cohort]);

  const handleDownload = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-lime-400 selection:text-black">
      {/* ── Top Header matching Figma ─────────────────────── */}
      <header className="h-16 shrink-0 border-b border-white/10 bg-[#060607] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center overflow-hidden shrink-0 rounded-lg bg-black/40 ring-1 ring-white/10">
              <video
                src="/aptix-logo-anim.mp4"
                autoPlay
                loop
                muted
                playsInline
                poster="/logo-preview-frame.jpg"
                className="w-full h-full object-cover mix-blend-screen scale-125 pointer-events-none"
              />
            </div>
            <span className="font-black text-[22px] tracking-tight text-white leading-none uppercase">
              APTIX
            </span>
            <span className="w-px h-5 bg-white/15 mx-1" />
            <span className="text-xs font-medium text-neutral-400 hidden sm:inline">Assessment Platform</span>
          </div>

          <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold text-neutral-400">
            <span className="px-3 py-1 text-lime-300 font-bold rounded-md">My Assessments</span>
          </nav>
        </div>

        {/* Right candidate pill */}
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full bg-purple-600/80 border border-purple-400/30 text-white text-xs font-black flex items-center justify-center shrink-0">
            {candidateName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
          </span>
          <div className="hidden sm:block leading-tight text-right">
            <span className="block text-xs font-bold text-white tracking-tight">{candidateName}</span>
            <span className="block text-[10px] text-neutral-400 font-mono">{candidateRoll}</span>
          </div>
        </div>
      </header>

      {/* ── Main Content Container ────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 space-y-8">
        {/* Breadcrumb + Title Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase mb-1">
              POST-RESULTS / {examTitle.toUpperCase()}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              See how you did<span className="text-lime-300">.</span>
            </h1>
            <p className="text-xs text-neutral-400 font-mono mt-1">
              {candidateName} · {candidateRoll} · {examCode} · {displayDate} · Attempt {attemptNumber}
            </p>

            {/* Toggle Pills */}
            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === "standard" ? "all" : "standard")}
                className={`px-3.5 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTab === "standard" || activeTab === "all"
                    ? "bg-lime-300 text-black shadow-sm"
                    : "bg-white/5 text-neutral-400 border border-white/10 hover:text-white"
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === "gamified" ? "all" : "gamified")}
                className={`px-3.5 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTab === "gamified" || activeTab === "all"
                    ? "bg-white/15 text-white border border-white/20"
                    : "bg-white/5 text-neutral-400 border border-white/10 hover:text-white"
                }`}
              >
                Gamified
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lime-300 hover:bg-lime-200 text-black font-extrabold text-xs shadow-lg transition-all self-start md:self-auto cursor-pointer"
          >
            <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download report</span>
          </button>
        </div>

        {/* ── SECTION 1: Standard Result Card ──────────────── */}
        {(activeTab === "standard" || activeTab === "all") && (
          <div className="bg-[#0c0d12] rounded-2xl border border-white/10 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Standard result</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Score, percentage, pass/fail status, time spent, and question breakdown.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2.5 py-1 bg-white/5 border border-white/10 rounded text-neutral-400">
                STANDARD
              </span>
            </div>

            {/* 4 Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Highlighted Lime Box */}
              <div className="bg-lime-300 rounded-2xl p-5 text-black shadow-lg flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-neutral-800">
                  NET SCORE / TOTAL
                </span>
                <div className="my-2">
                  <span className="text-4xl font-mono font-black tracking-tight">{scoreDisplay}</span>
                  <span className="text-xl font-mono font-bold text-neutral-800"> / {marksDisplay}</span>
                </div>
                <span className="text-xs font-semibold text-neutral-900">
                  {accuracyPct}% · Passing threshold: {Math.round(marksDisplay * 0.4)} / {marksDisplay}
                </span>
              </div>

              {/* Card 2 */}
              <div className="bg-[#14151b] rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-neutral-400">
                  COHORT PERCENTILE
                </span>
                <div className="my-2">
                  <span className="text-4xl font-mono font-black text-white">
                    {cohortPercentile}{getOrdinal(cohortPercentile)}
                  </span>
                </div>
                <span className="text-xs text-neutral-400">
                  Rank {cohortRank} of {cohortTotal}
                </span>
              </div>

              {/* Card 3 */}
              <div className="bg-[#14151b] rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-neutral-400">
                  TIME SPENT
                </span>
                <div className="my-2">
                  <span className="text-4xl font-mono font-black text-white">{timeFormatted}</span>
                </div>
                <span className="text-xs text-neutral-400">Allotted time {allottedMinutes}m 00s</span>
              </div>

              {/* Card 4 */}
              <div className="bg-[#14151b] rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-neutral-400">
                  ACCURACY BREAKDOWN
                </span>
                <div className="my-2">
                  <span className="text-4xl font-mono font-black text-white">
                    {computedStats.correct} / {computedStats.wrong} / {computedStats.blank}
                  </span>
                </div>
                <span className="text-xs text-neutral-400">
                  {computedStats.correct} correct · {computedStats.wrong} wrong · {computedStats.blank} blank
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 2: Gamified Result Card ──────────────── */}
        {(activeTab === "gamified" || activeTab === "all") && (
          <div className="bg-[#0c0d12] rounded-2xl border border-white/10 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Gamified result</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Animated confetti, Spirit Mascot celebration banner, and rank badge.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2.5 py-1 bg-white/5 border border-white/10 rounded text-neutral-400">
                GAMIFIED
              </span>
            </div>

            {/* Lime Spirit Banner */}
            <div className="bg-lime-300 rounded-2xl p-6 text-black flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-black text-lime-300 font-black text-xl flex items-center justify-center shrink-0 shadow-md">
                  {initials}
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight leading-tight">
                    You submitted with spirit
                  </h3>
                  <p className="text-xs font-semibold text-neutral-800 mt-0.5">
                    Global {cohortPercentile}{getOrdinal(cohortPercentile)} percentile ·{" "}
                    {cohortDiff >= 0
                      ? `${cohortDiff.toFixed(1)} points above the cohort mean`
                      : `${Math.abs(cohortDiff).toFixed(1)} points below the cohort mean`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 text-xs font-bold text-neutral-900 font-mono">
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-neutral-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" strokeWidth="2" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 7v5l3 3" />
                  </svg>
                  <span>{timeFormatted} finish</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-neutral-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{computedStats.correct} correct answers</span>
                </span>
              </div>
            </div>

            {/* Rank + Visual Podium */}
            <div className="grid grid-cols-1 md:grid-cols-[210px_1fr] gap-6 pt-2">
              {/* Rank card */}
              <div className="bg-[#14151b] rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-neutral-400">Your rank</span>
                <div className="my-3">
                  <span className="text-5xl font-mono font-black text-lime-400">
                    {cohort ? `${cohortPercentile}${getOrdinal(cohortPercentile)}` : "—"}
                  </span>
                </div>
                <span className="text-xs text-neutral-400">
                  {cohort ? `Rank ${cohortRank} of ${cohortTotal}` : "Rank unlocks with cohort"}
                </span>
              </div>

              {/* Visual podium */}
              <div className="bg-[#14151b] rounded-2xl p-5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono font-bold uppercase text-neutral-400">Podium snapshot</span>
                  <span className="text-[10px] font-mono font-bold text-lime-300">You → COMMITTED</span>
                </div>
                {podium.length === 0 ? (
                  <div className="py-7 px-4 flex flex-col items-center justify-center text-center space-y-2.5">
                    <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-amber-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <p className="text-xs font-bold text-neutral-200">Podium Awaiting Instructor Reveal</p>
                    <p className="text-[11px] text-neutral-500 max-w-xs leading-relaxed font-sans">
                      The cohort podium snapshot will appear here once released by your instructor on their system.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-end justify-center gap-3 sm:gap-6">
                    {podium.map((p, i) => (
                      <div key={p.place} className="flex flex-col items-center flex-1 max-w-[120px]">
                        {p.place === "1st" && (
                          <span className="mb-1 text-amber-300 filter drop-shadow-[0_2px_6px_rgba(250,204,21,0.6)] animate-bounce">
                            <svg className="w-5 h-5 fill-current text-amber-300" viewBox="0 0 24 24">
                              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                            </svg>
                          </span>
                        )}
                        <div className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center mb-1.5 relative bg-white/[0.03] ring-2 ${p.ringColor}`}>
                          {p.gifUrl ? (
                            <img
                              src={p.gifUrl}
                              alt={p.name}
                              style={p.resolvedMascot?.imgZoom ? {
                                transform: `scale(${p.resolvedMascot.imgZoom})`,
                                transformOrigin: p.resolvedMascot.imgOrigin ?? "center",
                              } : undefined}
                              className={`w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] select-none pointer-events-none ${p.resolvedMascot?.imgZoom ? "" : "scale-[1.35]"}`}
                            />
                          ) : (
                            <span className="text-3xl">{p.mascot}</span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-white mb-0.5 max-w-[100px] truncate text-center">
                          {p.name}
                        </span>
                        <div className="flex items-center gap-1 mb-2">
                          <span className={`text-[10px] font-mono font-black tabular-nums ${p.scoreColor}`}>
                            {p.score.toFixed(1)} pts
                          </span>
                        </div>
                        <div
                          className={`w-20 sm:w-24 rounded-t-2xl border-t-2 border-x flex flex-col items-center justify-end pb-3 pt-3 shadow-xl ${p.pillarBg}`}
                          style={{ height: `${p.h}px` }}
                        >
                          <span className="text-2xl sm:text-3xl font-black text-white/95 leading-none">
                            {p.place[0]}
                          </span>
                          <span className="text-[9px] font-mono font-bold tracking-widest text-neutral-300 uppercase mt-1">
                            {p.place} PLACE
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 3: Category Breakdown & Cohort Context ─ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0c0d12] rounded-2xl border border-white/10 p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-4">Category breakdown</h3>
            <div className="space-y-3">
              {categories.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-mono">
                  <span className="font-sans font-medium text-white">{c.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-neutral-400">{c.correct} / {c.wrong} / {c.blank}</span>
                    <span className="text-neutral-300 font-bold">{c.netScore}</span>
                    <span className="text-lime-400 font-bold w-14 text-right">{c.accuracy}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-neutral-500 mt-3 font-mono">
              Correct / Wrong / Blank · Net score · Accuracy = Correct / (Correct + Wrong). Net score includes negative marking penalties.
            </p>
          </div>

          <div className="bg-[#0c0d12] rounded-2xl border border-white/10 p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-2">Your cohort context</h3>
              <p className="text-xs text-neutral-400 leading-relaxed mb-6">
                {cohortDiff >= 0 ? (
                  <>Your score is <span className="text-lime-300 font-bold">{cohortDiff.toFixed(1)} points</span> above the cohort mean.</>
                ) : (
                  <>Your score is <span className="text-rose-400 font-bold">{Math.abs(cohortDiff).toFixed(1)} points</span> below the cohort mean.</>
                )}
              </p>
              
              <div className="space-y-4 text-xs font-mono">
                <div>
                  <div className="flex justify-between text-neutral-300 mb-1">
                    <span>You</span>
                    <span className="text-lime-300 font-bold">{scoreDisplay} / {marksDisplay}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-lime-300 rounded-full" style={{ width: `${Math.min(100, Math.max(0, Number(accuracyPct)))}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-neutral-400 mb-1">
                    <span>Cohort mean</span>
                    <span>{cohortMean} / {marksDisplay}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-purple-400 rounded-full" style={{ width: `${Math.min(100, Math.max(0, (cohortMean / marksDisplay) * 100))}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-neutral-400 mb-1">
                    <span>Median</span>
                    <span>{cohortMedian} / {marksDisplay}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-neutral-600 rounded-full" style={{ width: `${Math.min(100, Math.max(0, (cohortMedian / marksDisplay) * 100))}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <span className="text-[10px] text-neutral-500 font-mono mt-6 pt-4 border-t border-white/10">
              Peer sample size: {cohortTotal} approved candidate{cohortTotal === 1 ? "" : "s"}.
            </span>
          </div>
        </div>

        {/* ── SECTION 4: Question-by-Question Review ────────── */}
        <div className="space-y-4">
          {/* Purple Notification Banner */}
          <div className="p-4 rounded-xl bg-[#261539] border border-purple-500/40 text-purple-200 text-xs flex items-center gap-3 shadow-lg">
            <span className="text-base text-purple-300">ⓘ</span>
            <span>
              <strong>Answer review enabled by the assessment owner.</strong> Per-question answers, selected choices, and verified explanations are shown below. Reviews are server-verified and final scores cannot be changed.
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Table of questions */}
            <div className="bg-[#0c0d12] rounded-2xl border border-white/10 p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <h3 className="text-sm font-bold text-white">Question-by-question review</h3>
                <span className="text-[10px] font-mono text-neutral-400">
                  {questionRows.length} OF {questionRows.length} ALL QUESTIONS
                </span>
              </div>

              {questionRows.length === 0 ? (
                <p className="text-xs text-neutral-500 py-8 text-center font-mono">No question details available.</p>
              ) : (
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {questionRows.map((row, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedQuestionIndex(idx)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between text-xs font-mono cursor-pointer ${
                        selectedQuestionIndex === idx
                          ? "bg-white/10 border-white/30 text-white shadow-sm"
                          : "bg-white/[0.01] border-white/5 hover:bg-white/[0.04] text-neutral-300"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-white">{row.num} · </span>
                        <span className="font-sans text-neutral-300 truncate">{row.title}</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-neutral-500">{row.userAns}</span>
                        <span className={row.isCorrect === true ? "text-lime-400 font-bold" : row.isCorrect === false ? "text-rose-400 font-bold" : "text-neutral-500"}>
                          {row.status}
                        </span>
                        <span className="text-neutral-500 text-[11px] w-12 text-right">{row.time}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Selected Question Detail Card */}
            {selectedQ ? (
              <div className="bg-[#0c0d12] rounded-2xl border border-white/10 p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white">
                    {selectedQ.num} · Answer review
                  </h3>
                  <span className="text-[10px] font-mono text-lime-300 uppercase tracking-widest">
                    {selectedQ.category}
                  </span>
                </div>

                <h4 className="text-base sm:text-lg font-semibold text-white leading-snug">
                  {selectedQ.fullText}
                </h4>

                {/* Options */}
                <div className="space-y-2.5">
                  {selectedQ.options.length > 0 ? (
                    selectedQ.options.map((opt: any, optIdx: number) => {
                      const optText = typeof opt === "string" ? opt : (opt.text || JSON.stringify(opt));
                      const optLabel = String.fromCharCode(65 + optIdx);
                      const isChosen = selectedQ.userAnsFull === optText || selectedQ.userAnsFull === optLabel;
                      const isCorrectChoice = selectedQ.correctAnsFull === optText || selectedQ.correctAnsFull === optLabel;

                      let borderClass = "border-white/10 bg-white/[0.01] text-neutral-300";
                      if (isCorrectChoice) {
                        borderClass = "border-lime-400 bg-lime-950/20 text-lime-300";
                      } else if (isChosen && !isCorrectChoice) {
                        borderClass = "border-rose-500/50 bg-rose-950/20 text-rose-200";
                      }

                      return (
                        <div key={optIdx} className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${borderClass}`}>
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <span className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold text-[11px] shrink-0 ${
                              isCorrectChoice ? "border-lime-400 text-lime-400" : isChosen ? "border-rose-500/60 text-rose-300" : "border-white/20 text-neutral-400"
                            }`}>
                              {optLabel}
                            </span>
                            <span className="font-medium text-white truncate">{optText}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isChosen && (
                              <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                isCorrectChoice ? "text-lime-300 bg-lime-950/80 border-lime-500/40" : "text-rose-400 bg-rose-950/80 border-rose-500/40"
                              }`}>
                                YOUR CHOICE
                              </span>
                            )}
                            {isCorrectChoice && (
                              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-black bg-lime-300 px-2.5 py-0.5 rounded font-black">
                                CORRECT
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] text-xs font-mono text-neutral-300 space-y-1">
                      <p><span className="text-neutral-500">Your answer:</span> <span className="text-white font-bold">{selectedQ.userAnsFull}</span></p>
                      <p><span className="text-neutral-500">Correct answer:</span> <span className="text-lime-400 font-bold">{selectedQ.correctAnsFull}</span></p>
                    </div>
                  )}
                </div>

                {/* Explanation */}
                {selectedQ.explanation ? (
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs space-y-2">
                    <p className="font-bold text-neutral-300">Explanation:</p>
                    <p className="text-neutral-400 leading-relaxed font-sans">{selectedQ.explanation}</p>
                    <p className="text-neutral-500 text-[11px] font-mono pt-1 border-t border-white/5">
                      Time spent: <span className="text-white font-bold">{selectedQ.time}</span> · Status: <span className={selectedQ.isCorrect ? "text-lime-400 font-bold" : "text-neutral-300"}>{selectedQ.status}</span>
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs space-y-1">
                    <p className="text-neutral-400 leading-relaxed font-mono text-[11px]">
                      Time spent on this question: <span className="text-white font-bold">{selectedQ.time}</span>.
                      Status: <span className={selectedQ.isCorrect ? "text-lime-400 font-bold" : "text-neutral-300"}>{selectedQ.status}</span>.
                    </p>
                  </div>
                )}

                <div className="pt-1">
                  <span className="text-[11px] font-mono text-lime-300 hover:text-lime-200 cursor-pointer inline-flex items-center gap-1.5 transition-colors">
                    → Practice {selectedQ.category.toLowerCase()}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Back to Login / Home button */}
        <div className="pt-6 border-t border-white/10 flex justify-center">
          <button
            type="button"
            onClick={onReturnToLogin || (() => window.location.href = "/")}
            className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs transition-all cursor-pointer"
          >
            ← Return to Dashboard
          </button>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-[#060607] px-6 py-3 mt-12 flex items-center justify-between text-[11px] text-neutral-500">
        <span>APTIX Assessment Platform · KIET Deemed to be University</span>
        <span>Secure session • Server time is authoritative</span>
      </footer>
    </div>
  );
}
