"use client";

import { useState } from "react";
import Link from "next/link";
import { getPracticeQuestionsAction } from "@/app/actions/practice";
import { FIXED_TOPICS } from "@/lib/ai-question-analyzer";

interface PracticeQuestion {
  id: string;
  text: string;
  type: string;
  category: string;
  difficultyLevel: string;
  points: number;
  negativePoints: number;
  imageUrl?: string | null;
  options: any;
  correctAnswer: any;
  explanation?: string | null;
}

export function PracticeInterface({ candidateName }: { candidateName?: string }) {
  const [stage, setStage] = useState<"SETUP" | "DRILL" | "COMPLETE">("SETUP");
  const [selectedTopic, setSelectedTopic] = useState<string>("ALL");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [instantFeedback, setInstantFeedback] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Drill State
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [score, setScore] = useState<number>(0);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);

  async function handleStartPractice() {
    setLoading(true);
    setError(null);
    const res = await getPracticeQuestionsAction({
      topic: selectedTopic,
      difficulty: selectedDifficulty,
      count: questionCount
    });
    setLoading(false);

    if (!res.success || !res.questions || res.questions.length === 0) {
      setError(res.error || "No practice questions found matching your criteria. Try selecting 'All Topics'.");
      return;
    }

    setQuestions(res.questions as PracticeQuestion[]);
    setCurrentIndex(0);
    setUserAnswers({});
    setRevealed({});
    setScore(0);
    setCurrentStreak(0);
    setMaxStreak(0);
    setStage("DRILL");
  }

  const currentQ = questions[currentIndex];

  const handleSelectOption = (optText: string) => {
    if (revealed[currentQ.id]) return; // locked once checked
    setUserAnswers(prev => ({ ...prev, [currentQ.id]: optText }));
  };

  const handleCheckAnswer = () => {
    const selected = userAnswers[currentQ.id];
    if (!selected) return;

    let isCorrect = false;
    let expectedText = "";

    // Determine correct text
    if (typeof currentQ.correctAnswer === "number" || (!isNaN(Number(currentQ.correctAnswer)) && typeof currentQ.correctAnswer === "string")) {
      const idx = Number(currentQ.correctAnswer);
      const opt = currentQ.options[idx];
      expectedText = typeof opt === "string" ? opt : opt?.text || "";
    } else {
      expectedText = currentQ.correctAnswer;
    }

    if (selected === expectedText) {
      isCorrect = true;
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
      let expectedText = "";
      if (typeof q.correctAnswer === "number" || (!isNaN(Number(q.correctAnswer)) && typeof q.correctAnswer === "string")) {
        const idx = Number(q.correctAnswer);
        const opt = q.options[idx];
        expectedText = typeof opt === "string" ? opt : opt?.text || "";
      } else {
        expectedText = q.correctAnswer;
      }

      if (userAns === expectedText) {
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-navy-900 border-b border-navy-800 px-6 py-3.5 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1 shadow-sm shrink-0">
              <img src="/aptix_logo.jpg" alt="Aptix" className="h-full w-full object-contain" />
            </div>
            <span className="text-base font-black text-white tracking-tight">Aptix Practice Arena</span>
          </Link>
          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-md border border-brand-500/30">
            Self-Study &bull; No Stakes
          </span>
        </div>

        <div className="flex items-center gap-3">
          {stage === "DRILL" && (
            <div className="flex items-center gap-3 mr-2">
              {currentStreak > 1 && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-full animate-bounce">
                  <span>🔥</span>
                  <span>{currentStreak} Streak!</span>
                </div>
              )}
              <div className="text-xs font-bold text-slate-300 bg-navy-800 px-3 py-1 rounded-full border border-slate-700">
                Score: <strong className="text-white">{score.toFixed(1)} pts</strong>
              </div>
            </div>
          )}

          <Link
            href="/"
            className="text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 rounded-xl transition-colors border border-slate-700"
          >
            ← Portal
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        {/* SETUP SCREEN */}
        {stage === "SETUP" && (
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-soft-xl max-w-xl w-full text-left space-y-6">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4 border border-brand-100 shadow-sm">
                <span className="text-2xl">🎯</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Adaptive Practice Mode</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Sharpen your skills with unlimited, zero-stakes practice questions drawn from our bank. Complete with step-by-step rationales.
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700">
                ⚠️ {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Topic Area
                </label>
                <select
                  value={selectedTopic}
                  onChange={e => setSelectedTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="ALL">🌐 All Topics (Comprehensive Mixed Drill)</option>
                  {FIXED_TOPICS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Difficulty Level
                  </label>
                  <select
                    value={selectedDifficulty}
                    onChange={e => setSelectedDifficulty(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="ALL">All Levels (Mixed)</option>
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Number of Questions
                  </label>
                  <select
                    value={questionCount}
                    onChange={e => setQuestionCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value={5}>5 Questions (Quick Warmup)</option>
                    <option value={10}>10 Questions (Standard Drill)</option>
                    <option value={15}>15 Questions (Deep Practice)</option>
                    <option value={20}>20 Questions (Full Workout)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-brand-50/60 border border-brand-100 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-brand-900 block">Instant Explanation Mode</span>
                  <span className="text-[11px] text-brand-700">Reveal correct answers and rationales immediately after checking</span>
                </div>
                <input
                  type="checkbox"
                  checked={instantFeedback}
                  onChange={e => setInstantFeedback(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={handleStartPractice}
              disabled={loading}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-brand hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Preparing Practice Drill...</span>
                </>
              ) : (
                <>
                  <span>🚀 Launch Practice Session</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* DRILL SCREEN */}
        {stage === "DRILL" && currentQ && (
          <div className="bg-white p-6 sm:p-9 rounded-3xl border border-slate-200/80 shadow-soft-xl max-w-3xl w-full text-left space-y-6">
            {/* Question Progress Header */}
            <div className="flex flex-wrap justify-between items-center gap-2 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-brand-700 bg-brand-50 px-3 py-1 rounded-full border border-brand-100 uppercase tracking-wider">
                  Practice Q{currentIndex + 1} of {questions.length}
                </span>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                  {currentQ.category || "General"}
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  {currentQ.difficultyLevel} &bull; +{currentQ.points || 1} pts
                </span>
              </div>

              <span className="text-xs font-bold text-slate-400">
                Progress: {Math.round(((currentIndex) / questions.length) * 100)}%
              </span>
            </div>

            {/* Question Stem */}
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
              {currentQ.text}
            </h2>

            {currentQ.imageUrl && (
              <div className="my-4">
                <img
                  src={currentQ.imageUrl}
                  alt="Illustration"
                  className="max-h-64 rounded-2xl border border-slate-200 shadow-sm"
                />
              </div>
            )}

            {/* Options List */}
            <div className="space-y-3">
              {(() => {
                const isRevealed = revealed[currentQ.id];
                const selectedOpt = userAnswers[currentQ.id];

                let expectedText = "";
                if (typeof currentQ.correctAnswer === "number" || (!isNaN(Number(currentQ.correctAnswer)) && typeof currentQ.correctAnswer === "string")) {
                  const idx = Number(currentQ.correctAnswer);
                  const opt = currentQ.options[idx];
                  expectedText = typeof opt === "string" ? opt : opt?.text || "";
                } else {
                  expectedText = currentQ.correctAnswer;
                }

                return currentQ.options.map((opt: any, idx: number) => {
                  const optText = typeof opt === "string" ? opt : opt.text;
                  const isSelected = selectedOpt === optText;
                  const isThisCorrect = isRevealed && optText === expectedText;
                  const isThisWrong = isRevealed && isSelected && optText !== expectedText;

                  let cardStyle = "border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700";
                  let badgeStyle = "border-slate-300 bg-slate-50 text-slate-600";

                  if (isThisCorrect) {
                    cardStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-xs";
                    badgeStyle = "border-emerald-600 bg-emerald-600 text-white";
                  } else if (isThisWrong) {
                    cardStyle = "border-rose-400 bg-rose-50 text-rose-900 font-semibold";
                    badgeStyle = "border-rose-500 bg-rose-500 text-white";
                  } else if (isSelected) {
                    cardStyle = "border-brand-600 bg-brand-50/60 text-slate-900 font-semibold shadow-xs";
                    badgeStyle = "border-brand-600 bg-brand-600 text-white";
                  }

                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectOption(optText)}
                      className={`flex items-center gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer select-none ${cardStyle}`}
                    >
                      <div className={`w-7 h-7 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 ${badgeStyle}`}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span className="text-xs sm:text-sm font-medium flex-1">{optText}</span>
                      {isThisCorrect && (
                        <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          CORRECT ✓
                        </span>
                      )}
                      {isThisWrong && (
                        <span className="text-[11px] font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
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
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-sm">💡</span>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Solution & Explanation</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                  {currentQ.explanation || "No extended explanation provided for this question."}
                </p>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400 font-medium">
                {revealed[currentQ.id] ? "Review solution and proceed" : "Select your answer choice"}
              </span>

              <div className="flex items-center gap-3">
                {!revealed[currentQ.id] && instantFeedback ? (
                  <button
                    onClick={handleCheckAnswer}
                    disabled={!userAnswers[currentQ.id]}
                    className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-brand disabled:opacity-40 transition-all"
                  >
                    Check Answer
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="px-7 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
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
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-soft-xl max-w-xl w-full text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-emerald-100 shadow-sm">
              <span className="text-3xl">🎉</span>
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Practice Session Completed!</h2>
              <p className="text-xs text-slate-500 mt-1">
                Great job working through your practice set. Here is your performance diagnostic:
              </p>
            </div>

            {/* Score & Streak Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-brand-50 border border-brand-100 rounded-2xl text-center">
                <span className="text-[10px] font-extrabold text-brand-800 uppercase tracking-wider block mb-1">Score</span>
                <span className="text-2xl font-black text-brand-600">{score.toFixed(1)}</span>
              </div>
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block mb-1">Accuracy</span>
                <span className="text-2xl font-black text-emerald-600">
                  {questions.length > 0 ? Math.round((score / questions.length) * 100) : 0}%
                </span>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-center">
                <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block mb-1">Max Streak</span>
                <span className="text-2xl font-black text-amber-600">{maxStreak} 🔥</span>
              </div>
            </div>

            {/* Topic Mastery Diagnostic */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">Topic Mastery</span>
              <div className="space-y-2.5">
                {calculateTopicMastery().map((t, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700">{t.name}</span>
                      <span className={t.pct >= 75 ? "text-emerald-600" : "text-slate-600"}>
                        {t.pct}% ({t.correct}/{t.total})
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${t.pct >= 75 ? "bg-emerald-500" : "bg-brand-600"}`}
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
                className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-brand transition-all"
              >
                🎯 Start Another Practice Drill
              </button>
              <Link
                href="/"
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Return to Portal
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
