"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getPracticeQuestionsAction } from "@/app/actions/practice";

interface PracticeQuestion {
  id: string;
  text: string;
  type?: string;
  category: string;
  difficultyLevel?: string;
  points?: number;
  negativePoints?: number;
  imageUrl?: string | null;
  options: any[];
  correctAnswer: any;
  explanation?: string | null;
}

const DEFAULT_QUESTIONS: PracticeQuestion[] = [
  {
    id: "q-default-1",
    text: "A bag contains 4 red, 3 blue and 2 green balls. Two balls are drawn without replacement. What is the probability that both are red?",
    type: "MCQ_SINGLE",
    category: "Probability",
    points: 1,
    options: ["1/9", "1/6", "2/9", "1/3"],
    correctAnswer: "1/6",
    explanation:
      "There are 9 balls in total. The chance of a red ball on the first draw is 4/9. Without replacement, only 3 red balls remain among 8 balls, so the second probability is 3/8.\n\nP(both red) = (4/9) × (3/8) = 12/72 = 1/6\n\nYour answer 2/9 is too high. These draws are not independent; update both the red count and total count after the first draw, then multiply the two probabilities.",
  },
  {
    id: "q-default-2",
    text: "For a non-zero real number x, x + 1/x = 5. What is the value of x² + 1/x²?",
    type: "MCQ_SINGLE",
    category: "Algebra",
    points: 1,
    options: ["21", "23", "25", "27"],
    correctAnswer: "23",
    explanation:
      "Squaring both sides of (x + 1/x) = 5 gives (x + 1/x)² = 25.\nExpanding: x² + 2(x)(1/x) + 1/x² = 25 => x² + 2 + 1/x² = 25.\nSubtracting 2 gives x² + 1/x² = 23.",
  },
  {
    id: "q-default-3",
    text: "A train travels at 72 km/h and crosses a pole in 15 seconds. What is the length of the train?",
    type: "MCQ_SINGLE",
    category: "Arithmetic",
    points: 1,
    options: ["250 m", "300 m", "320 m", "360 m"],
    correctAnswer: "300 m",
    explanation:
      "Convert speed to m/s: 72 × (5/18) = 20 m/s.\nDistance = Speed × Time = 20 m/s × 15 s = 300 meters.",
  },
  {
    id: "q-default-4",
    text: "If 15 men can complete a project in 20 days, how many days will 25 men take to complete the same project?",
    type: "MCQ_SINGLE",
    category: "Arithmetic",
    points: 1,
    options: ["10 days", "12 days", "14 days", "16 days"],
    correctAnswer: "12 days",
    explanation:
      "Total work = 15 men × 20 days = 300 man-days.\nDays for 25 men = 300 / 25 = 12 days.",
  },
  {
    id: "q-default-5",
    text: "What is the simple interest on ₹5,000 at 8% per annum for 2 years?",
    type: "MCQ_SINGLE",
    category: "Quantitative Aptitude",
    points: 1,
    options: ["₹600", "₹700", "₹800", "₹900"],
    correctAnswer: "₹800",
    explanation:
      "Simple Interest = (Principal × Rate × Time) / 100\nSI = (5,000 × 8 × 2) / 100 = 80,000 / 100 = ₹800.",
  },
];

export function PracticeInterface({ candidateName = "Ananya Rao" }: { candidateName?: string }) {
  // First screen tells the instructions. After user clicks, fullscreen is triggered and DRILL opens.
  // After questions are completed, COMPLETE shows the diagnostic and category mastery.
  const [stage, setStage] = useState<"INSTRUCTIONS" | "DRILL" | "COMPLETE">("INSTRUCTIONS");
  const [questions, setQuestions] = useState<PracticeQuestion[]>(DEFAULT_QUESTIONS);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const [correctCount, setCorrectCount] = useState<number>(0);
  const [incorrectCount, setIncorrectCount] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const totalAnswered = correctCount + incorrectCount;
  const accuracyPct = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  useEffect(() => {
    getPracticeQuestionsAction({ count: 10 }).then((res) => {
      if (res.success && res.questions && res.questions.length > 0) {
        setQuestions(res.questions as PracticeQuestion[]);
      }
    }).catch(() => {
      // Retain fallback questions
    });
  }, []);

  const currentQ = questions[currentIndex] || DEFAULT_QUESTIONS[0];
  const selectedAnswer = userAnswers[currentQ.id];
  const isRevealed = !!revealed[currentQ.id];

  const getExpectedText = (q: PracticeQuestion): string => {
    if (!q) return "";
    const opts = (q.options || []).map((o: any) => (typeof o === "string" ? o : o.text || ""));
    const raw = q.correctAnswer;
    if (typeof raw === "string" && opts.includes(raw)) return raw;
    if (typeof raw === "number" && opts[raw]) return opts[raw];
    if (typeof raw === "string" && /^\d+$/.test(raw)) {
      const idx = parseInt(raw, 10);
      if (opts[idx]) return opts[idx];
    }
    if (typeof raw === "string" && /^[A-D]$/i.test(raw.trim())) {
      const idx = raw.trim().toUpperCase().charCodeAt(0) - 65;
      if (opts[idx]) return opts[idx];
    }
    return String(raw || opts[0] || "");
  };

  const expectedAnswer = getExpectedText(currentQ);
  const isCurrentCorrect = selectedAnswer === expectedAnswer;

  const getCategoryStats = () => {
    const map: Record<string, { total: number; correct: number; answered: number }> = {};

    questions.forEach((q) => {
      const rawCat = (q.category || "General Aptitude").trim();
      const cat = rawCat || "General Aptitude";
      if (!map[cat]) {
        map[cat] = { total: 0, correct: 0, answered: 0 };
      }
      map[cat].total += 1;

      const expected = getExpectedText(q);
      const userAns = userAnswers[q.id];
      if (userAns !== undefined) {
        map[cat].answered += 1;
        if (userAns === expected) {
          map[cat].correct += 1;
        }
      }
    });

    return Object.entries(map).map(([name, data]) => {
      const pct = data.answered > 0 ? Math.round((data.correct / data.answered) * 100) : 0;

      let status = "Focus area";
      let textCol = "text-rose-400";
      let bgCol = "bg-rose-400";

      if (pct >= 80) {
        status = "Strong";
        textCol = "text-lime-300";
        bgCol = "bg-lime-300";
      } else if (pct >= 50) {
        status = "Developing";
        textCol = "text-sky-300";
        bgCol = "bg-sky-400";
      } else if (data.answered === 0) {
        status = "Unattempted";
        textCol = "text-neutral-400";
        bgCol = "bg-neutral-600";
      }

      return {
        name,
        total: data.total,
        correct: data.correct,
        answered: data.answered,
        pct,
        status,
        textCol,
        bgCol,
      };
    });
  };

  const handleStartFullscreenDrill = async () => {
    setLoading(true);
    setIsPaused(false);
    if (typeof document !== "undefined") {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn("Fullscreen request error:", err);
      }
    }
    setLoading(false);
    setStage("DRILL");
  };

  const handlePausePractice = () => {
    setIsPaused(true);
  };

  const handleResumePractice = async () => {
    setIsPaused(false);
    if (typeof document !== "undefined" && !document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.warn("Fullscreen resume error:", err);
      }
    }
  };

  const handleExitPractice = async () => {
    setIsPaused(false);
    if (typeof document !== "undefined" && document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.warn("Exit fullscreen error:", err);
      }
    }
    setStage("INSTRUCTIONS");
  };

  const handleSelectOption = (optText: string) => {
    if (isRevealed) return;
    setUserAnswers((prev) => ({ ...prev, [currentQ.id]: optText }));
    setRevealed((prev) => ({ ...prev, [currentQ.id]: true }));

    const correct = optText === expectedAnswer;
    if (correct) {
      setCorrectCount((c) => c + 1);
      setStreak((s) => s + 1);
    } else {
      setIncorrectCount((c) => c + 1);
      setStreak(0);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      // Transition to post-drill completion screen where diagnostics appear
      if (typeof document !== "undefined" && document.fullscreenElement) {
        try {
          document.exitFullscreen().catch(() => {});
        } catch {}
      }
      setStage("COMPLETE");
    }
  };

  const handleResetCurrent = () => {
    setUserAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQ.id];
      return copy;
    });
    setRevealed((prev) => {
      const copy = { ...prev };
      delete copy[currentQ.id];
      return copy;
    });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-lime-400 selection:text-black">
      {/* ── Top Header (With Login Button, No Candidate Pill) ── */}
      <header className="h-16 shrink-0 border-b border-white/10 bg-[#060607] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center overflow-hidden shrink-0 rounded-lg bg-black/40 ring-1 ring-white/10 group-hover:ring-lime-400/30 transition-all">
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
            <span className="font-black text-[22px] tracking-tight text-white leading-none group-hover:text-lime-300 transition-colors uppercase">
              APTIX
            </span>
            <span className="w-px h-5 bg-white/15 mx-1" />
            <span className="text-xs font-medium text-neutral-400 hidden sm:inline">Practice Arena</span>
          </Link>
        </div>

        {/* Center Pill */}
        <div className="hidden md:flex items-center">
          <span className="text-[10px] font-mono tracking-wider uppercase text-neutral-300 bg-white/[0.04] border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
            Self-paced · Instant Feedback Mode
          </span>
        </div>

        {/* Right Actions: Pause/Finish + Login Button */}
        <div className="flex items-center gap-3">
          {stage === "DRILL" && (
            <button
              type="button"
              onClick={currentIndex === questions.length - 1 ? handleNext : handlePausePractice}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {currentIndex === questions.length - 1 ? "Finish Drill" : "Pause & View Stats"}
            </button>
          )}

          <Link
            href="/"
            onClick={async () => {
              if (typeof document !== "undefined" && document.fullscreenElement) {
                try { await document.exitFullscreen(); } catch {}
              }
            }}
            className="text-xs font-extrabold text-black bg-white hover:bg-neutral-200 px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <span>Login</span>
            <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </header>

      {/* ── STAGE 1: INSTRUCTIONS SCREEN (Compact to fit 100% in viewport) ── */}
      {stage === "INSTRUCTIONS" && (
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 flex flex-col justify-center">
          <div className="bg-[#0c0d12] rounded-2xl border border-white/10 p-5 sm:p-7 shadow-2xl space-y-4">
            {/* Header info */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-wider uppercase">
                <span className="text-lime-400 font-mono">Practice Arena</span>
                <span className="text-neutral-500 font-normal">·</span>
                <span className="text-neutral-300">Onboarding &amp; Guidelines</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Practice & Drill Instructions<span className="text-lime-300">.</span>
              </h1>
              <p className="text-xs text-neutral-400 leading-normal font-normal">
                Welcome to your self-paced diagnostic drill. Review the guidance below before entering full-screen mode to begin your questions.
              </p>
            </div>

            {/* Instruction Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-lime-400/10 border border-lime-400/20 text-lime-400 flex items-center justify-center font-bold text-xs shrink-0">
                    10
                  </div>
                  <h3 className="text-xs font-bold text-white">Curated 10-Question Drill</h3>
                </div>
                <p className="text-[11px] text-neutral-400 leading-normal pl-8">
                  Questions drawn directly from aptitude pool covering Algebra, Arithmetic, Probability, and DI.
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">
                    ✓
                  </div>
                  <h3 className="text-xs font-bold text-white">Instant Feedback & Solutions</h3>
                </div>
                <p className="text-[11px] text-neutral-400 leading-normal pl-8">
                  Immediate green (correct) or red (incorrect) validation along with step-by-step mathematical reasoning.
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                    ⚡
                  </div>
                  <h3 className="text-xs font-bold text-white">Streak Multipliers & Mastery</h3>
                </div>
                <p className="text-[11px] text-neutral-400 leading-normal pl-8">
                  Consecutive correct answers build your active multiplier with real-time category progress tracking.
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                    ∞
                  </div>
                  <h3 className="text-xs font-bold text-white">Zero Stakes & Self-Paced</h3>
                </div>
                <p className="text-[11px] text-neutral-400 leading-normal pl-8">
                  No negative marking penalties and no strict proctoring constraints. Pause and retry anytime.
                </p>
              </div>
            </div>

            {/* Fullscreen Notice Banner */}
            <div className="bg-[#12141c] border border-white/10 rounded-xl p-3 flex items-center gap-3 text-[11px] text-neutral-300">
              <svg className="w-4 h-4 text-lime-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <span>
                To give you an immersive, distraction-free environment, clicking below will switch your browser to <strong>Full Screen</strong> before the first question appears.
              </span>
            </div>

            {/* Launch CTA Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleStartFullscreenDrill}
                disabled={loading}
                className="w-full py-3 bg-lime-300 hover:bg-lime-200 text-black font-extrabold text-xs sm:text-sm rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Launching Fullscreen Practice...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    <span>Enter Fullscreen & Start Practice Drill →</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ── STAGE 2: DRILL MODE (Focused Vertically & Horizontally Centered Workspace) ── */}
      {stage === "DRILL" && (
        <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-8 py-6 sm:py-10 w-full my-auto">
          <div className="max-w-4xl w-full space-y-6">
            {/* Subheader */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-wider uppercase">
                  <span className="text-lime-400 font-mono">Practice Arena</span>
                  <span className="text-neutral-500 font-normal">·</span>
                  <span className="text-neutral-300">Active Drill</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Practice & Drill<span className="text-lime-300">.</span>
                </h1>
              </div>

              {/* Progress counter & bar */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-white">
                    {currentIndex + 1}/{questions.length}
                  </span>
                  <span className="block text-[10px] text-neutral-400 font-medium">Questions</span>
                </div>
                <div className="w-24 sm:w-32 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-lime-300 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round(((currentIndex + 1) / questions.length) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-[#0c0d12] rounded-2xl border border-white/10 p-6 sm:p-8 shadow-2xl">
              {/* Meta Row */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold text-lime-400 bg-lime-400/10 border border-lime-400/20 px-2.5 py-1 rounded-lg">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <h3 className="text-sm font-bold text-white">
                    {currentQ.category || "Quantitative Aptitude"}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  {streak > 1 && (
                    <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
                      🔥 {streak} Streak
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handlePausePractice}
                    className="text-[11px] font-semibold text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Pause practice
                  </button>
                </div>
              </div>

              {/* Question Stem */}
              <h2 className="text-xl sm:text-2xl font-semibold text-white leading-relaxed mb-6">
                {currentQ.text}
              </h2>

              {/* Options */}
              <div className="space-y-3">
                {(currentQ.options || []).map((opt: any, idx: number) => {
                  const optText = typeof opt === "string" ? opt : opt.text;
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = selectedAnswer === optText;
                  const isCorrect = optText === expectedAnswer;

                  let cardStyle = "border-white/10 bg-white/[0.01] hover:bg-white/[0.04] text-neutral-200 hover:border-white/20";
                  let circleStyle = "border-white/20 text-neutral-400";
                  let badge = null;

                  if (isRevealed) {
                    if (isCorrect) {
                      cardStyle = "border-lime-400 bg-lime-950/20 text-lime-300";
                      circleStyle = "border-lime-400 text-lime-400 font-bold";
                      badge = (
                        <span className="text-[10px] font-mono font-black uppercase tracking-wider text-black bg-lime-300 px-2 py-0.5 rounded">
                          CORRECT
                        </span>
                      );
                    } else if (isSelected && !isCorrect) {
                      cardStyle = "border-rose-500 bg-rose-950/20 text-rose-300";
                      circleStyle = "border-rose-500 text-rose-400 font-bold";
                      badge = (
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40">
                          YOUR CHOICE
                        </span>
                      );
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectOption(optText)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between text-sm cursor-pointer ${cardStyle}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className={`w-7 h-7 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${circleStyle}`}>
                          {letter}
                        </span>
                        <span className="font-normal text-white">{optText}</span>
                      </div>
                      {badge}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Explanation Accordion Card (when revealed) */}
            {isRevealed && (
              <div className="bg-[#0c0d12] rounded-2xl border border-white/10 p-6 sm:p-7 shadow-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-white">
                    {isCurrentCorrect ? "Spot on — here's the full breakdown" : "Not quite — here's the idea"}
                  </h3>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded ${
                    isCurrentCorrect ? "bg-lime-400/20 text-lime-300 border border-lime-400/30" : "bg-rose-950/80 text-rose-300 border border-rose-500/40"
                  }`}>
                    {isCurrentCorrect ? "CORRECT ANSWER" : `INCORRECT · CORRECT: OPTION ${
                      String.fromCharCode(65 + (currentQ.options || []).findIndex((o: any) => (typeof o === "string" ? o : o.text) === expectedAnswer))
                    }`}
                  </span>
                </div>

                <div className="text-xs text-neutral-300 leading-relaxed space-y-3 font-normal">
                  {currentQ.explanation ? (
                    currentQ.explanation.split("\n\n").map((para, i) => {
                      if (para.includes("P(") || para.includes("=") || para.includes("×")) {
                        return (
                          <div key={i} className="text-lg font-mono font-bold text-lime-300 py-2">
                            {para}
                          </div>
                        );
                      }
                      return <p key={i}>{para}</p>;
                    })
                  ) : (
                    <p>
                      Review the formula and problem parameters carefully to confirm step-by-step logic.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action Row below Explanation */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleResetCurrent}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-[#0c0d12] hover:bg-white/5 text-neutral-300 font-bold text-xs transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Try a similar question</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-lime-300 hover:bg-lime-200 text-black font-extrabold text-xs shadow-lg transition-all cursor-pointer"
              >
                <span>Next question</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ── STAGE 3: POST-EXAM ANALYTICS & DIAGNOSTICS DASHBOARD ── */}
      {stage === "COMPLETE" && (
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12 space-y-8">
          {/* Header Banner */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-lime-400/10 border border-lime-400/30 text-lime-400 flex items-center justify-center mx-auto shadow-lg mb-3">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-wider uppercase justify-center">
              <span className="text-lime-400 font-mono">Practice Arena</span>
              <span className="text-neutral-500 font-normal">·</span>
              <span className="text-neutral-300">Post-Drill Analytics</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Diagnostic & Performance Analytics<span className="text-lime-300">.</span>
            </h1>
            <p className="text-xs text-neutral-400 max-w-lg mx-auto">
              Drill completed! Here is your comprehensive diagnostic report, category mastery insights, and question-by-question breakdown.
            </p>
          </div>

          {/* Top 4 Metrics Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-[#0c0d12] border border-white/10 rounded-2xl p-4 shadow-xl">
              <span className="block text-[10px] font-mono uppercase text-neutral-400 font-bold mb-1">Set Size</span>
              <span className="text-2xl font-mono font-black text-white">{questions.length} Qs</span>
            </div>
            <div className="bg-[#0c0d12] border border-lime-500/20 rounded-2xl p-4 shadow-xl">
              <span className="block text-[10px] font-mono uppercase text-lime-400 font-bold mb-1">Correct</span>
              <span className="text-2xl font-mono font-black text-lime-400">{correctCount}</span>
            </div>
            <div className="bg-[#0c0d12] border border-rose-500/20 rounded-2xl p-4 shadow-xl">
              <span className="block text-[10px] font-mono uppercase text-rose-400 font-bold mb-1">Incorrect</span>
              <span className="text-2xl font-mono font-black text-rose-400">{incorrectCount}</span>
            </div>
            <div className="bg-[#0c0d12] border border-sky-500/20 rounded-2xl p-4 shadow-xl">
              <span className="block text-[10px] font-mono uppercase text-sky-400 font-bold mb-1">Accuracy</span>
              <span className="text-2xl font-mono font-black text-sky-300">{accuracyPct}%</span>
            </div>
          </div>

          {/* 2-Column Analytics Cards (from Figma design) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Today's Diagnostic Card */}
            <div className="bg-[#0c0d12] rounded-2xl border border-white/10 p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-bold text-white">Today's diagnostic</h3>
                <span className="text-[10px] font-mono text-neutral-400 font-medium">
                  {questions.length}/{questions.length} COMPLETE
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center py-3 bg-white/[0.02] border border-white/10 rounded-2xl">
                <div>
                  <span className="text-3xl sm:text-4xl font-mono font-black text-lime-400">
                    {String(correctCount).padStart(2, "0")}
                  </span>
                  <span className="block text-xs text-neutral-400 mt-1 font-medium">Correct</span>
                </div>
                <div>
                  <span className="text-3xl sm:text-4xl font-mono font-black text-rose-400">
                    {String(incorrectCount).padStart(2, "0")}
                  </span>
                  <span className="block text-xs text-neutral-400 mt-1 font-medium">Incorrect</span>
                </div>
                <div>
                  <span className="text-3xl sm:text-4xl font-mono font-black text-white">
                    {String(streak).padStart(2, "0")}
                  </span>
                  <span className="block text-xs text-neutral-400 mt-1 font-medium">Streak</span>
                </div>
              </div>

              <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl flex items-center justify-between text-xs text-neutral-300">
                <span>Final Session Accuracy</span>
                <span className="font-mono font-bold text-lime-300 text-sm">{accuracyPct}%</span>
              </div>

              {/* Dynamic recommendation alert box */}
              <div className={`border-l-4 p-4 rounded-xl border text-xs space-y-1 ${
                accuracyPct >= 70
                  ? "border-lime-400 bg-lime-950/20 border-white/5"
                  : "border-amber-400 bg-amber-950/20 border-white/5"
              }`}>
                <span className={`font-bold flex items-center gap-1.5 ${
                  accuracyPct >= 70 ? "text-lime-300" : "text-amber-300"
                }`}>
                  <span>{accuracyPct >= 70 ? "Strong Assessment Readiness ✓" : "Recommended Focus Areas ⚡"}</span>
                </span>
                <p className="text-neutral-400 leading-relaxed text-[11px]">
                  {accuracyPct >= 70
                    ? `Outstanding performance. You solved ${correctCount} of ${questions.length} questions correctly.`
                    : `Review problem categories where accuracy was below 75% before taking the formal timed assessment.`}
                </p>
              </div>
            </div>

            {/* Card 2: Category Mastery Card */}
            <div className="bg-[#0c0d12] rounded-2xl border border-white/10 p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-bold text-white">Category mastery</h3>
                <span className="text-[10px] font-mono text-neutral-400 uppercase">
                  BASED ON {totalAnswered} ATTEMPTS
                </span>
              </div>

              <div className="space-y-4 text-xs font-mono">
                {getCategoryStats().map((cat) => (
                  <div key={cat.name}>
                    <div className="flex justify-between mb-1.5 items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-neutral-200 font-medium">{cat.name}</span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          ({cat.correct}/{cat.total} correct)
                        </span>
                      </div>
                      <span className={`${cat.textCol} font-bold`}>
                        {cat.pct}% · {cat.status}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full ${cat.bgCol} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(cat.pct, 3)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-neutral-500 pt-2 border-t border-white/10 leading-tight">
                Calculated dynamically from your actual practice performance.
              </p>
            </div>
          </div>

          {/* Question-by-Question Review List */}
          <div className="bg-[#0c0d12] rounded-2xl border border-white/10 p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono text-neutral-400">
              Question Breakdown Review
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {questions.map((q, idx) => {
                const userAns = userAnswers[q.id];
                const expected = getExpectedText(q);
                const isCorrect = userAns === expected;
                return (
                  <div
                    key={q.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      isCorrect
                        ? "bg-lime-950/20 border-lime-500/30 text-neutral-300"
                        : "bg-rose-950/20 border-rose-500/30 text-neutral-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                        isCorrect ? "bg-lime-400 text-black" : "bg-rose-500 text-white"
                      }`}>
                        {isCorrect ? "✓" : "✕"}
                      </span>
                      <span className="font-medium text-white truncate">Q{idx + 1} · {q.category}</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold shrink-0 ${isCorrect ? "text-lime-300" : "text-rose-300"}`}>
                      {isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setCurrentIndex(0);
                setUserAnswers({});
                setRevealed({});
                setCorrectCount(0);
                setIncorrectCount(0);
                setStreak(0);
                setStage("DRILL");
              }}
              className="flex-1 py-3.5 bg-lime-300 hover:bg-lime-200 text-black font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Start Another Practice Drill</span>
            </button>
            <button
              type="button"
              onClick={() => setStage("INSTRUCTIONS")}
              className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Arena Instructions
            </button>
            <Link
              href="/"
              className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white font-bold text-xs transition-colors flex items-center justify-center"
            >
              Exit to Dashboard
            </Link>
          </div>
        </main>
      )}

      {/* ── Pause Modal Overlay ───────────────────────────── */}
      {isPaused && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0d12] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-lime-400/10 border border-lime-400/20 text-lime-400 flex items-center justify-center mx-auto shadow-inner">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-wider uppercase justify-center">
                <span className="text-lime-400 font-mono">Practice Arena</span>
                <span className="text-neutral-500 font-normal">·</span>
                <span className="text-neutral-300">Paused</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Practice Paused</h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Take a breath. Your progress is saved at Question {currentIndex + 1} of {questions.length}. Resume anytime when you are ready.
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 py-1 bg-white/[0.02] border border-white/10 rounded-2xl p-3">
              <div>
                <span className="text-2xl font-mono font-black text-lime-400">
                  {String(correctCount).padStart(2, "0")}
                </span>
                <span className="block text-[10px] text-neutral-400 mt-0.5 font-medium">Correct</span>
              </div>
              <div>
                <span className="text-2xl font-mono font-black text-rose-400">
                  {String(incorrectCount).padStart(2, "0")}
                </span>
                <span className="block text-[10px] text-neutral-400 mt-0.5 font-medium">Incorrect</span>
              </div>
              <div>
                <span className="text-2xl font-mono font-black text-white">
                  {String(streak).padStart(2, "0")}
                </span>
                <span className="block text-[10px] text-neutral-400 mt-0.5 font-medium">Streak</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleResumePractice}
                className="w-full py-3 bg-lime-300 hover:bg-lime-200 text-black font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Resume Practice</span>
                <span>→</span>
              </button>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={handleExitPractice}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Exit Practice
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof document !== "undefined" && document.fullscreenElement) {
                      try { document.exitFullscreen().catch(() => {}); } catch {}
                    }
                    setIsPaused(false);
                    setStage("COMPLETE");
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Finish Drill Early
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-[#060607] px-6 py-3 mt-auto flex items-center justify-between text-[11px] text-neutral-500">
        <span>APTIX Assessment Platform · KIET Deemed to be University</span>
        <span>Available practice pool: 212 Qs • 10:14:07 IST</span>
      </footer>
    </div>
  );
}
