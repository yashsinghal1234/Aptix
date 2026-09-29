"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { getPracticeQuestionsAction } from "@/app/actions/practice";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface PracticeQuestion {
  id: string;
  text: string;
  type: string;
  category: string;
  difficultyLevel: string;
  points: number;
  negativePoints: number;
  imageUrl?: string | null;
  options: any[];
  correctAnswer: any;
  explanation?: string | null;
}

export function PracticeInterface({ candidateName }: { candidateName?: string }) {
  const [stage, setStage] = useState<"SETUP" | "DRILL" | "COMPLETE">("SETUP");
  const instantFeedback = true;

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Drill State
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [score, setScore] = useState<number>(0);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);

  // Actual DOM measurement for overflowing screen
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGrid, setIsGrid] = useState<boolean>(false);

  // Synchronize fullscreen state with browser changes (F11, Escape, etc.)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn("Fullscreen toggle failed:", err);
    }
  };

  const handleExitFullscreen = async () => {
    if (typeof document !== "undefined" && document.fullscreenElement) {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.warn("Exit fullscreen failed:", err);
      }
    }
  };

  async function handleStartPractice() {
    // Immediately enter fullscreen upon user click gesture
    if (typeof document !== "undefined" && !document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.warn("Fullscreen request error:", err);
      }
    }

    setLoading(true);
    setError(null);
    const res = await getPracticeQuestionsAction({
      count: 10
    });
    setLoading(false);

    if (!res.success || !res.questions || res.questions.length === 0) {
      setError(res.error || "No practice questions found in the question bank. Please try again later.");
      return;
    }

    setQuestions(res.questions as PracticeQuestion[]);
    setCurrentIndex(0);
    setUserAnswers({});
    setRevealed({});
    setScore(0);
    setCurrentStreak(0);
    setMaxStreak(0);
    setIsGrid(false);
    setStage("DRILL");
  }

  const currentQ = questions[currentIndex];

  // Determine if question layout needs 2x2 grid to prevent overflowing screen
  const evaluateLayout = () => {
    if (stage !== "DRILL" || !currentQ || !cardRef.current || typeof window === "undefined") {
      return;
    }

    const optionsCount = (currentQ.options || []).length;
    const maxOptionLength = Math.max(
      0,
      ...(currentQ.options || []).map((o: any) => (typeof o === "string" ? o : o?.text || "").length)
    );
    const canFitInGrid = optionsCount >= 4 && maxOptionLength <= 80;

    if (!canFitInGrid) {
      if (isGrid) setIsGrid(false);
      return;
    }

    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const cardHeight = card.offsetHeight;
    const isRevealed = !!revealed[currentQ.id];

    // If an image is present but still loading (height 0), estimate 150px for it
    let pendingImageOffset = 0;
    if (currentQ.imageUrl) {
      const imgEl = card.querySelector("img");
      if (!imgEl || imgEl.naturalHeight === 0) {
        pendingImageOffset = 150;
      }
    }

    // Checking answer reveals the solution/explanation box (~95px)
    // Budget this space so questions that are "just on the edge" don't overflow when revealed!
    const futureExplanationOffset = !isRevealed ? 95 : 0;

    const availableHeight = window.innerHeight - 110;
    const totalExpectedBottom = rect.bottom + pendingImageOffset + futureExplanationOffset;
    const totalExpectedHeight = cardHeight + pendingImageOffset + futureExplanationOffset;

    // Switch to grid if the card currently overflows or will overflow when revealed/loaded
    const shouldBeGrid = totalExpectedBottom > window.innerHeight - 20 || totalExpectedHeight > availableHeight;

    if (shouldBeGrid && !isGrid) {
      setIsGrid(true);
    }
  };

  useIsomorphicLayoutEffect(() => {
    evaluateLayout();
    const rafId = requestAnimationFrame(evaluateLayout);
    return () => cancelAnimationFrame(rafId);
  }, [currentIndex, stage, revealed[currentQ?.id]]);

  useEffect(() => {
    const handleResize = () => {
      evaluateLayout();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isGrid, stage, currentIndex, revealed[currentQ?.id]]);

  const handleSelectOption = (optText: string) => {
    if (revealed[currentQ.id]) return; // locked once checked
    setUserAnswers(prev => ({ ...prev, [currentQ.id]: optText }));
  };

function getCorrectAnswerText(q: PracticeQuestion): string {
  if (!q) return "";
  const opts = Array.isArray(q.options) ? q.options : [];
  const optTexts: string[] = opts.map((o: any) => (typeof o === "string" ? o : o?.text || ""));

  let rawAns = q.correctAnswer;

  // 1. Direct match with an option's text (exact or case-insensitive trimmed)
  if (rawAns !== undefined && rawAns !== null && rawAns !== "") {
    const directMatch = optTexts.find(
      (t: string) => t === rawAns || (typeof rawAns === "string" && t.trim().toLowerCase() === rawAns.trim().toLowerCase())
    );
    if (directMatch) return directMatch;
  }

  // 2. Numeric index (0, 1, 2)
  if (typeof rawAns === "number" && rawAns >= 0 && rawAns < optTexts.length) {
    return optTexts[rawAns];
  }

  // 3. String numeric index if within range
  if (typeof rawAns === "string" && /^\d+$/.test(rawAns.trim())) {
    const idx = parseInt(rawAns.trim(), 10);
    if (idx >= 0 && idx < optTexts.length) {
      return optTexts[idx];
    }
  }

  // 4. Letter choice A, B, C, D
  if (typeof rawAns === "string") {
    const cleaned = rawAns.trim().toUpperCase().replace(/[^A-D]/g, "");
    if (cleaned.length === 1) {
      const letterIdx = cleaned.charCodeAt(0) - 65;
      if (letterIdx >= 0 && letterIdx < optTexts.length) {
        return optTexts[letterIdx];
      }
    }
  }

  // 5. Check if any option object is flagged as correct
  const flagged = opts.find((o: any) => typeof o === "object" && (o?.isCorrect === true || o?.correct === true));
  if (flagged) return typeof flagged === "string" ? flagged : flagged.text || "";

  // 6. Check if any option explanation contains "The correct answer is"
  const explOpt = opts.find((o: any) => typeof o === "object" && o?.explanation && typeof o.explanation === "string" && o.explanation.includes("The correct answer is"));
  if (explOpt) return typeof explOpt === "string" ? explOpt : explOpt.text || "";

  return typeof rawAns === "string" ? rawAns : "";
}

function isOptionCorrect(optText: string, expectedText: string): boolean {
  if (!optText || !expectedText) return false;
  return optText === expectedText || optText.trim().toLowerCase() === expectedText.trim().toLowerCase();
}

  const handleCheckAnswer = () => {
    const selected = userAnswers[currentQ.id];
    if (!selected) return;

    const expectedText = getCorrectAnswerText(currentQ);
    const isCorrect = isOptionCorrect(selected, expectedText);

    if (isCorrect) {
      setScore(s => s + (currentQ.points || 1));
      const nextStreak = currentStreak + 1;
      setCurrentStreak(nextStreak);
      if (nextStreak > maxStreak) setMaxStreak(nextStreak);
    } else {
      setCurrentStreak(0);
    }

    setRevealed(prev => ({ ...prev, [currentQ.id]: true }));
  };

  const handleNext = () => {
    setIsGrid(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setStage("COMPLETE");
    }
  };

  const calculateTopicMastery = () => {
    const map: Record<string, { correct: number; total: number }> = {};
    questions.forEach(q => {
      const cat = q.category || "General";
      if (!map[cat]) map[cat] = { correct: 0, total: 0 };
      map[cat].total += 1;

      const userAns = userAnswers[q.id];
      const expectedText = getCorrectAnswerText(q);

      if (userAns && isOptionCorrect(userAns, expectedText)) {
        map[cat].correct += 1;
      }
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      correct: data.correct,
      total: data.total,
      pct: Math.round((data.correct / data.total) * 100)
    }));
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-white selection:text-black">
      {/* Top Navbar */}
      <header className={`bg-[#07080c] border-b border-neutral-800/80 px-6 sm:px-10 ${stage === "DRILL" ? "h-16 sm:h-20" : "h-20 sm:h-24"} flex justify-between items-center shadow-lg transition-all duration-200`}>
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center overflow-hidden shrink-0">
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
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight group-hover:text-neutral-300 transition-colors">
              Aptix Practice Arena
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {stage === "DRILL" && (
            <div className="flex items-center gap-3 mr-2">
              {currentStreak > 1 && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-full animate-bounce">
                  <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                  </svg>
                  <span>{currentStreak} Streak!</span>
                </div>
              )}
              <div className="text-xs font-bold text-neutral-300 bg-neutral-900 px-3.5 py-1 rounded-full border border-neutral-800">
                Score: <strong className="text-white">{score.toFixed(1)} pts</strong>
              </div>
            </div>
          )}

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            className="p-2.5 sm:p-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
            aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>

          <Link
            href="/"
            onClick={handleExitFullscreen}
            className="text-sm sm:text-base font-extrabold text-black bg-white hover:bg-neutral-200 px-6 py-2.5 sm:px-7 sm:py-3 rounded-2xl transition-all shadow-[0_4px_20px_rgba(255,255,255,0.15)] flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>Login</span>
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-black stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 flex items-center justify-center ${stage === "DRILL" ? "p-3 sm:p-5" : "p-4 sm:p-6"}`}>
        {/* SETUP SCREEN */}
        {stage === "SETUP" && (
          <div className="bg-[#0a0c10] p-8 sm:p-10 rounded-3xl border border-neutral-800 shadow-2xl max-w-xl w-full text-left space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Adaptive Practice Mode</h2>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Sharpen your skills with a curated 10-question practice set drawn directly from the bank. Includes instant answer checking, step-by-step rationales, and full-screen immersion.
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-xs font-bold text-rose-300 flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Fixed 10-Question Specifications Overview */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-[#0d0f14] border border-neutral-800 rounded-2xl text-center">
                <span className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider block mb-1">Set Size</span>
                <span className="text-base sm:text-lg font-black text-white">10 Questions</span>
              </div>
              <div className="p-4 bg-[#0d0f14] border border-neutral-800 rounded-2xl text-center">
                <span className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider block mb-1">Coverage</span>
                <span className="text-base sm:text-lg font-black text-emerald-400">All Topics</span>
              </div>
              <div className="p-4 bg-[#0d0f14] border border-neutral-800 rounded-2xl text-center">
                <span className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider block mb-1">Environment</span>
                <span className="text-base sm:text-lg font-black text-white flex items-center justify-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-sky-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  <span>Fullscreen</span>
                </span>
              </div>
            </div>

            <div className="p-4 bg-[#0d0f14] border border-neutral-800 rounded-2xl flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0 text-emerald-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                Step-by-step rationales and solutions are displayed immediately after checking each answer. Zero stakes with unlimited practice drills.
              </p>
            </div>

            <button
              onClick={handleStartPractice}
              disabled={loading}
              className="w-full py-4 bg-white hover:bg-neutral-200 text-black font-extrabold text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Preparing Fullscreen Practice...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  <span>Launch 10-Question Practice in Fullscreen</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* DRILL SCREEN */}
        {stage === "DRILL" && currentQ && (
          <div
            ref={cardRef}
            className={`bg-[#0a0c10] ${isGrid ? 'p-4 sm:p-6 space-y-3.5 sm:space-y-4' : 'p-5 sm:p-7 space-y-4 sm:space-y-5'} rounded-3xl border border-neutral-800 shadow-2xl max-w-3xl w-full text-left transition-all duration-200`}
          >
            {/* Question Progress Header */}
            <div className="flex flex-wrap justify-between items-center gap-2 pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800 uppercase tracking-wider">
                  Practice Q{currentIndex + 1} of {questions.length}
                </span>
                <span className="text-xs font-bold text-neutral-300 bg-neutral-900 px-2.5 py-1 rounded-full border border-neutral-800">
                  {currentQ.category || "General"}
                </span>
                <span className="text-[11px] font-bold text-neutral-500">
                  {currentQ.difficultyLevel} &bull; +{currentQ.points || 1} pts
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-20 sm:w-28 h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/80">
                  <div
                    className="h-full bg-striped-emerald rounded-full transition-all duration-300"
                    style={{ width: `${Math.round(((currentIndex) / questions.length) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-neutral-400 tabular-nums">
                  {Math.round(((currentIndex) / questions.length) * 100)}%
                </span>
              </div>
            </div>

            {/* Question Stem */}
            <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
              {currentQ.text}
            </h2>

            {currentQ.imageUrl && (
              <div className="my-2.5">
                <img
                  src={currentQ.imageUrl}
                  alt="Illustration"
                  onLoad={() => evaluateLayout()}
                  className="max-h-36 sm:max-h-44 rounded-2xl border border-neutral-800 shadow-sm object-contain"
                />
              </div>
            )}

            {/* Options List / Grid */}
            <div className={isGrid ? "grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3" : "space-y-3"}>
              {(() => {
                const isRevealed = revealed[currentQ.id];
                const selectedOpt = userAnswers[currentQ.id];
                const expectedText = getCorrectAnswerText(currentQ);

                return currentQ.options.map((opt: any, idx: number) => {
                  const optText = typeof opt === "string" ? opt : opt.text;
                  const isSelected = selectedOpt === optText;
                  const isThisCorrect = isRevealed && isOptionCorrect(optText, expectedText);
                  const isThisWrong = isRevealed && isSelected && !isThisCorrect;

                  let cardStyle = "border-neutral-800 bg-[#0d0f14] hover:bg-neutral-900 text-neutral-200";
                  let badgeStyle = "border-neutral-700 bg-neutral-800 text-neutral-300";

                  if (isThisCorrect) {
                    cardStyle = "border-emerald-500 bg-emerald-950/40 text-emerald-200 font-bold shadow-xs";
                    badgeStyle = "border-emerald-500 bg-emerald-500 text-black font-black";
                  } else if (isThisWrong) {
                    cardStyle = "border-rose-500 bg-rose-950/40 text-rose-200 font-semibold";
                    badgeStyle = "border-rose-500 bg-rose-500 text-white font-black";
                  } else if (isSelected) {
                    cardStyle = "border-white bg-neutral-800 text-white font-semibold shadow-xs";
                    badgeStyle = "border-white bg-white text-black font-black";
                  }

                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectOption(optText)}
                      className={`flex items-center gap-3.5 ${isGrid ? 'p-3.5 sm:p-4' : 'p-4'} rounded-2xl border transition-all cursor-pointer select-none ${cardStyle}`}
                    >
                      <div className={`w-7 h-7 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 ${badgeStyle}`}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span className="text-xs sm:text-sm font-medium flex-1">{optText}</span>
                      {isThisCorrect && (
                        <span className="text-[11px] font-extrabold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30 shrink-0">
                          CORRECT ✓
                        </span>
                      )}
                      {isThisWrong && (
                        <span className="text-[11px] font-extrabold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-500/30 shrink-0">
                          INCORRECT ✕
                        </span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Step-by-Step Rationale (shown when revealed in instant feedback mode) */}
            {revealed[currentQ.id] && (
              <div className="p-4 bg-[#0d0f14] border border-neutral-800 rounded-2xl space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="text-xs font-black text-amber-400 uppercase tracking-wider">Solution & Explanation</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap font-medium">
                  {currentQ.explanation || "No extended explanation provided for this question."}
                </p>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex justify-between items-center pt-4 border-t border-neutral-800">
              <span className="text-xs text-neutral-500 font-medium">
                {revealed[currentQ.id] ? "Review solution and proceed" : "Select your answer choice"}
              </span>

              <div className="flex items-center gap-3">
                {!revealed[currentQ.id] && instantFeedback ? (
                  <button
                    onClick={handleCheckAnswer}
                    disabled={!userAnswers[currentQ.id]}
                    className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl border border-neutral-700 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    Check Answer
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="px-7 py-2.5 bg-white hover:bg-neutral-200 text-black font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{currentIndex === questions.length - 1 ? "Finish Drill" : "Next Question"}</span>
                    <span>→</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* COMPLETE SCREEN */}
        {stage === "COMPLETE" && (
          <div className="bg-[#0a0c10] p-8 sm:p-10 rounded-3xl border border-neutral-800 shadow-2xl max-w-xl w-full text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-950/60 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-emerald-500/30 shadow-sm">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Practice Session Completed!</h2>
              <p className="text-xs text-neutral-400 mt-1">
                Great job working through your practice set. Here is your performance diagnostic:
              </p>
            </div>

            {/* Score & Streak Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-[#0d0f14] border border-neutral-800 rounded-2xl text-center">
                <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block mb-1">Score</span>
                <span className="text-2xl font-black text-white">{score.toFixed(1)}</span>
              </div>
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl text-center">
                <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block mb-1">Accuracy</span>
                <span className="text-2xl font-black text-emerald-400">
                  {questions.length > 0 ? Math.round((score / questions.length) * 100) : 0}%
                </span>
              </div>
              <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-2xl text-center">
                <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block mb-1">Max Streak</span>
                <span className="text-2xl font-black text-amber-400 flex items-center justify-center gap-1">
                  <span>{maxStreak}</span>
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Topic Mastery Diagnostic */}
            <div className="p-5 bg-[#0d0f14] border border-neutral-800 rounded-2xl text-left space-y-3">
              <span className="text-xs font-black text-white uppercase tracking-wider block">Topic Mastery</span>
              <div className="space-y-2.5">
                {calculateTopicMastery().map((t, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-neutral-300">{t.name}</span>
                      <span className={t.pct >= 75 ? "text-emerald-400" : "text-neutral-400"}>
                        {t.pct}% ({t.correct}/{t.total})
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/80">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${t.pct >= 75 ? "bg-striped-emerald" : "bg-striped-blue"}`}
                        style={{ width: `${t.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => {
                  setStage("SETUP");
                }}
                className="flex-1 py-3 bg-white hover:bg-neutral-200 text-black font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Start Another Practice Drill</span>
              </button>
              <Link
                href="/"
                onClick={handleExitFullscreen}
                className="px-5 py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold text-xs rounded-xl border border-neutral-800 transition-all"
              >
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
