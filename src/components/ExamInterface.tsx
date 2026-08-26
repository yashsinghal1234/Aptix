"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { logoutAction } from "@/app/actions/auth";
import { submitExamAction } from "@/app/actions/exam";
import { logCheatSignalAction } from "@/app/actions/cheat";
import { getAttemptStatusAction } from "@/app/actions/attempt";
import { useServerTime } from "@/hooks/useServerTime";

function createPRNG(seed: number) {
  return function() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function shuffleArray<T>(array: T[], rng: () => number): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export function ExamInterface({ candidateName, session, attempt, dbQuestions }: { candidateName: string, session: any, attempt: any, dbQuestions: any[] }) {
  const [hasStarted, setHasStarted] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  
  const [isFinished, setIsFinished] = useState(false);
  const [timeUntilStart, setTimeUntilStart] = useState(0);
  const [timeLeft, setTimeLeft] = useState(session.durationMinutes * 60);
  const [isForcedLive, setIsForcedLive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [sessionStatus, setSessionStatus] = useState(session.status);
  
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finalTotalMarks, setFinalTotalMarks] = useState<number | null>(null);
  const [detailedResults, setDetailedResults] = useState<any[] | null>(null);
  const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false);

  const answersRef = useRef(answers);
  const timeSpentRef = useRef<Record<string, number>>({});
  const isFinishingRef = useRef(false);
  const blurCountRef = useRef(0);
  const config = useMemo(() => {
    try {
      return session.configSnapshot ? JSON.parse(session.configSnapshot) : {};
    } catch {
      return {};
    }
  }, [session.configSnapshot]);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  // Initialize and shuffle once on mount
  useEffect(() => {
    const rng = createPRNG(attempt.shuffleSeed);
    
    // Apply Randomize Question Order
    const processedQuestions = config.randomizeQuestionOrder !== false 
      ? shuffleArray(dbQuestions, rng) 
      : [...dbQuestions];
      
    // Apply Randomize Option Order
    const finalQuestions = processedQuestions.map(q => ({
      ...q,
      options: config.randomizeOptionOrder !== false ? shuffleArray(q.options, rng) : [...q.options]
    }));
    
    setQuestions(finalQuestions);
    if (finalQuestions.length > 0) {
      setVisited(new Set([finalQuestions[0].id]));
    }
  }, [dbQuestions, attempt.shuffleSeed, config]);

  const [currentExtendedUntil, setCurrentExtendedUntil] = useState<Date | null>(
    attempt.extendedUntil ? new Date(attempt.extendedUntil) : (session.extendedUntil ? new Date(session.extendedUntil) : null)
  );

  const { getServerTime, synced } = useServerTime();

  useEffect(() => {
    if (!synced) return;

    const calculateTimes = () => {
      const now = getServerTime();
      const start = session.startTime ? new Date(session.startTime).getTime() : 
                    (sessionStatus === "LIVE" ? now : null);
      
      if (!start) {
        // If no start time and not live, we are just waiting indefinitely
        setTimeUntilStart(999999);
        return;
      }

      const baseEnd = start + (session.durationMinutes * 60 * 1000);
      const end = currentExtendedUntil ? currentExtendedUntil.getTime() : baseEnd;
      
      if (isForcedLive || sessionStatus === "LIVE") {
        setTimeUntilStart(0);
        if (now < end) setTimeLeft(Math.floor((end - now) / 1000));
        else { setTimeLeft(0); if (!isFinished && hasStarted) setShouldAutoSubmit(true); }
      } else if (now < start) {
        setTimeUntilStart(Math.floor((start - now) / 1000));
      } else {
        // Scheduled time has passed, they can start
        setTimeUntilStart(0);
        if (now < end) {
          setTimeLeft(Math.floor((end - now) / 1000));
        } else {
          setTimeLeft(0);
          if (!isFinished && hasStarted) setShouldAutoSubmit(true);
        }
      }
    };

    calculateTimes();
    const timer = setInterval(calculateTimes, 1000);
    return () => clearInterval(timer);
  }, [session, currentExtendedUntil, isFinished, hasStarted, isForcedLive, sessionStatus, synced, getServerTime]);

  // Anti-cheating Listeners
  useEffect(() => {
    if (!hasStarted || isFinished) return;

    const handleBlur = () => {
      blurCountRef.current += 1;
      logCheatSignalAction(session.id, "WINDOW_BLUR", `Candidate switched away from the exam window (Count: ${blurCountRef.current}).`);
      
      if (config.tabSwitchLimit && blurCountRef.current > config.tabSwitchLimit) {
        alert(`You have exceeded the maximum allowed tab switches (${config.tabSwitchLimit}). Your exam is being automatically submitted.`);
        handleFinishTest(true); // Force submit
      }
    };

    const handleFullscreenChange = () => {
      if (isFinishingRef.current) return;
      if (config.requireFullscreen === false) return; // Skip if fullscreen not required
      
      if (!document.fullscreenElement) {
        logCheatSignalAction(session.id, "FULLSCREEN_EXIT", "Candidate exited full-screen mode.");
        setIsFullscreen(false);
      } else {
        setIsFullscreen(true);
      }
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [hasStarted, isFinished, session.id, config]);

  // Track time spent per question
  useEffect(() => {
    if (!hasStarted || isFinished || questions.length === 0) return;
    
    const interval = setInterval(() => {
      const qId = questions[currentQuestion]?.id;
      if (qId) {
        timeSpentRef.current[qId] = (timeSpentRef.current[qId] || 0) + 1000;
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [hasStarted, isFinished, currentQuestion, questions]);

  const startExamFullscreen = async () => {
    if (config.requireFullscreen !== false) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.warn("Fullscreen request failed", err);
      }
    }
    setHasStarted(true);
  };

  const executeSubmit = useCallback(async () => {
    isFinishingRef.current = true;
    setShowSubmitConfirm(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.log(err));
    }
    
    const stringifiedAnswers: Record<string, string> = {};
    for (const [k, v] of Object.entries(answersRef.current)) {
      stringifiedAnswers[k] = typeof v === "string" ? v : JSON.stringify(v);
    }
    
    await submitExamAction(attempt.id, stringifiedAnswers, timeSpentRef.current);
    setIsFinished(true);

    if (config.resultVisibility === "IMMEDIATE") {
      const statusData = await getAttemptStatusAction(attempt.id);
      if (statusData) {
        setFinalScore(statusData.score);
        setFinalTotalMarks(statusData.totalMarks);
        if (statusData.detailedResults) {
          setDetailedResults(statusData.detailedResults);
        }
      }
    }
  }, [attempt.id, config.resultVisibility]);

  useEffect(() => {
    if (shouldAutoSubmit && !isFinishingRef.current) {
      executeSubmit();
    }
  }, [shouldAutoSubmit, executeSubmit]);

  const handleFinishTest = useCallback(async (force = false) => {
    if (force) {
      executeSubmit();
    } else {
      setShowSubmitConfirm(true);
    }
  }, [executeSubmit]);

  useEffect(() => {
    if (isFinished) return;
    const interval = setInterval(async () => {
      const statusData = await getAttemptStatusAction(attempt.id);
      if (!statusData) return;
      
      setSessionStatus(statusData.sessionStatus);

      if (statusData.sessionStatus === "LIVE" && !hasStarted && timeUntilStart > 0) {
        setIsForcedLive(true);
      } else if (statusData.sessionStatus === "COMPLETED") {
        handleFinishTest(true);
      }

      if (statusData.extendedUntil) {
        setCurrentExtendedUntil(new Date(statusData.extendedUntil));
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [attempt.id, isFinished, hasStarted, timeUntilStart, handleFinishTest]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!synced) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium">Synchronizing secure clock...</p>
        </div>
      </main>
    );
  }

  if (timeUntilStart === 999999) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center p-8">
          <h2 className="text-3xl font-bold mb-4">{session.exam.title}</h2>
          <p className="text-slate-400 mb-8">Waiting for the instructor to start the exam...</p>
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
          <p className="text-sm text-slate-500">This page will automatically update. Please do not refresh.</p>
        </div>
      </div>
    );
  }

  if (timeUntilStart > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center p-8">
          <h2 className="text-3xl font-bold mb-4">{session.exam.title}</h2>
          <p className="text-slate-400 mb-8">Your exam will begin shortly.</p>
          <div className="text-5xl font-mono font-bold text-indigo-400 mb-8">
            {formatTime(timeUntilStart)}
          </div>
          <p className="text-sm text-slate-500">Please do not refresh this page.</p>
        </div>
      </div>
    );
  }

  if (!hasStarted && timeUntilStart <= 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-2xl w-full shadow-xl">
          <div className="border-b pb-6 mb-6">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">{session.exam.title}</h1>
            <p className="text-slate-500 font-medium">Ready to begin</p>
          </div>

          <div className="space-y-6 mb-8 text-left">
            <div>
              <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-2">Instructions from Instructor</h3>
              <div className="bg-slate-50 rounded-lg p-4 text-slate-700 text-sm border border-slate-100 whitespace-pre-wrap">
                {session.exam.instructions || "No special instructions provided for this exam."}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">Exam Format & Rules</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-slate-600 text-sm">
                  <div className="mt-0.5 text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <span>You have <strong>{session.durationMinutes} minutes</strong> to complete <strong>{questions.length} questions</strong>. The timer starts immediately after you click Start.</span>
                </li>
                <li className="flex items-start gap-3 text-slate-600 text-sm">
                  <div className="mt-0.5 text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                  </div>
                  <span><strong>This exam is strictly monitored.</strong> By clicking start, the browser will enter full-screen mode. Exiting full-screen or switching tabs will be recorded as a cheat flag and reported.</span>
                </li>
                <li className="flex items-start gap-3 text-slate-600 text-sm">
                  <div className="mt-0.5 text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <span><strong>Important:</strong> You must click the <strong>Submit Test</strong> button on the final question when you are finished to successfully record your answers.</span>
                </li>
              </ul>
            </div>
          </div>

          <button 
            onClick={startExamFullscreen}
            className="w-full py-4 bg-indigo-600 text-white font-bold text-lg rounded-xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            I Understand, Start Exam Now
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </div>
      </div>
    );
  }

  const jumpToQuestion = (i: number) => {
    setCurrentQuestion(i);
    setVisited((prev) => new Set(prev).add(questions[i].id));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      jumpToQuestion(currentQuestion + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      jumpToQuestion(currentQuestion - 1);
    }
  };

  const handleAnswerSelect = (option: string) => {
    setAnswers({
      ...answers,
      [questions[currentQuestion].id]: option,
    });
  };

  const toggleMarkForReview = () => {
    const qId = questions[currentQuestion].id;
    setMarkedForReview((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(qId)) newSet.delete(qId);
      else newSet.add(qId);
      return newSet;
    });
  };

  if (isFinished) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 py-12 overflow-y-auto">
        <div className={`bg-white p-10 rounded-2xl shadow-xl w-full text-center border border-slate-100 ${detailedResults && detailedResults.length > 0 ? 'max-w-4xl' : 'max-w-lg'}`}>
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-4">Test Submitted!</h1>
          <p className="text-slate-600 mb-8">
            Thank you, {candidateName}. Your responses have been recorded and will be evaluated.
          </p>
          <div className="bg-slate-50 rounded-lg p-4 border text-sm text-slate-500 mb-6">
            You answered {Object.keys(answers).length} out of {questions.length} questions.
          </div>
          
          {config.resultVisibility === "IMMEDIATE" && finalScore !== null && (
            <div className="mb-8 w-full max-w-4xl mx-auto text-left">
              <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-xl mb-8 text-center">
                <h3 className="text-lg font-bold text-indigo-900 mb-2">Your Result</h3>
                <div className="text-4xl font-black text-indigo-600">
                  {typeof finalScore === 'number' ? finalScore.toFixed(1) : 0} <span className="text-xl text-indigo-400 font-bold">/ {finalTotalMarks}</span>
                </div>
              </div>

              {detailedResults && detailedResults.length > 0 && (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-slate-800 border-b pb-2">Detailed Breakdown</h3>
                  {dbQuestions.map((q, idx) => {
                    const res = detailedResults.find(r => r.questionId === q.id);
                    if (!res) return null;
                    
                    return (
                      <div key={q.id} className={`p-5 rounded-lg border ${res.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex gap-4">
                          <span className={`font-bold shrink-0 mt-1 ${res.isCorrect ? 'text-green-700' : 'text-red-700'}`}>Q{idx + 1}.</span>
                          <div className="flex-1 space-y-4">
                            <p className="font-medium text-slate-800">{q.text}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-semibold text-slate-600 block mb-1">Your Answer:</span>
                                <div className="px-3 py-2 bg-white rounded border">
                                  {answers[q.id] ? (Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).join(", ") : answers[q.id]) : <span className="text-slate-400 italic">No Answer</span>}
                                </div>
                              </div>
                              {res.correctAnswer && (
                                <div>
                                  <span className="font-semibold text-slate-600 block mb-1">Correct Answer:</span>
                                  <div className="px-3 py-2 bg-white rounded border border-green-300 text-green-800">
                                    {Array.isArray(res.correctAnswer) ? res.correctAnswer.join(", ") : res.correctAnswer}
                                  </div>
                                </div>
                              )}
                            </div>

                            {res.explanation && (
                              <div className="mt-4 p-4 bg-white/60 rounded-lg text-sm border border-slate-200">
                                <span className="font-bold text-slate-700 block mb-1">Explanation:</span>
                                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{res.explanation}</p>
                              </div>
                            )}
                            
                            <div className="text-right text-xs font-bold uppercase tracking-wider text-slate-500 pt-2 border-t border-slate-200/50 mt-4">
                              Points Earned: {res.earnedPoints.toFixed(1)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <form action={logoutAction}>
            <button className="text-indigo-600 font-medium hover:underline">Log Out</button>
          </form>
        </div>
      </main>
    );
  }

  if (hasStarted && !isFinished && !isFullscreen && config.requireFullscreen !== false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900/95 p-6 z-50 fixed inset-0">
        <div className="bg-white p-10 rounded-2xl max-w-lg w-full text-center shadow-2xl border border-red-100">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Exam Paused</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            You have exited full-screen mode. Your actions have been recorded and flagged for review. 
            You must return to full-screen mode to continue your exam.
          </p>
          <button 
            onClick={async () => {
              try {
                await document.documentElement.requestFullscreen();
              } catch (err) {
                console.warn(err);
              }
            }}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-sm"
          >
            Return to Full Screen
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-lg w-full text-center border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-4">No Questions Available</h1>
          <p className="text-slate-600 mb-8">
            This exam session was generated without any questions. This could be due to a configuration error or an empty question bank. Please contact the administrator.
          </p>
          <form action={logoutAction}>
            <button className="text-indigo-600 font-medium hover:underline">Log Out</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <>
    <main 
      className="min-h-screen bg-slate-50 flex flex-col select-none"
      onCopy={(e) => { if (config.disableCopyPaste !== false) { e.preventDefault(); return false; } }}
      onPaste={(e) => { if (config.disableCopyPaste !== false) { e.preventDefault(); return false; } }}
    >
      <header className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
            A
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800 leading-tight">{session.exam.title}</h1>
            <p className="text-xs text-slate-500">{candidateName}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-sm font-medium text-slate-500">
            Time Remaining: <span className={`font-mono text-lg ${timeLeft < 300 ? 'text-red-600' : 'text-indigo-600'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <button 
            onClick={() => handleFinishTest(false)}
            className="text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-md transition-colors"
          >
            Finish Test
          </button>
        </div>
      </header>

      <div className="flex-1 flex px-8 py-8 gap-8 max-w-7xl mx-auto w-full">
        <aside className="w-64 shrink-0 hidden md:block">
          <div className="bg-white p-6 rounded-xl border shadow-sm h-full flex flex-col">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Questions
            </h2>
            <div className="grid grid-cols-4 gap-2 mb-8">
              {questions.map((q, i) => {
                const qId = q.id;
                const isAnswered = answers[qId] !== undefined;
                const isVisited = visited.has(qId);
                const isMarked = markedForReview.has(qId);
                const isActive = i === currentQuestion;
                
                let bgColor = "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"; 
                if (isMarked) bgColor = "bg-yellow-100 text-yellow-800 border-yellow-300"; 
                else if (isAnswered) bgColor = "bg-green-500 text-white border-green-600";
                else if (isVisited) bgColor = "bg-red-500 text-white border-red-600";
                
                const ringClass = isActive ? "ring-2 ring-indigo-500 ring-offset-2" : "";

                return (
                  <button
                    key={qId}
                    onClick={() => jumpToQuestion(i)}
                    className={`w-10 h-10 rounded-md font-medium text-sm flex items-center justify-center transition-all ${bgColor} ${ringClass}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <div className="bg-white rounded-xl border shadow-sm p-8 min-h-[500px] flex flex-col">
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className="text-indigo-600 font-semibold text-sm mb-2 block">
                  Question {currentQuestion + 1} of {questions.length}
                </span>
                <h2 className="text-2xl font-medium text-slate-800 leading-snug">
                  {questions[currentQuestion].text}
                </h2>
                {questions[currentQuestion].imageUrl && (
                  <div className="mt-4">
                    <img 
                      src={questions[currentQuestion].imageUrl} 
                      alt="Question attachment" 
                      className="max-h-64 rounded-lg border shadow-sm select-none pointer-events-none"
                    />
                  </div>
                )}
              </div>
              <button 
                onClick={toggleMarkForReview}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  markedForReview.has(questions[currentQuestion].id) 
                    ? "bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200" 
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {markedForReview.has(questions[currentQuestion].id) ? "Marked" : "Mark for Review"}
              </button>
            </div>

            <div className="space-y-3 flex-1">
              {(() => {
                const q = questions[currentQuestion];
                const qType = q.type || "MCQ_SINGLE";
                
                if (qType === "FILL_BLANK") {
                  const textParts = q.text.split(/(\[\d+\])/g);
                  return (
                    <div className="text-xl font-medium text-slate-800 leading-relaxed bg-white p-6 rounded-lg border shadow-sm">
                      {textParts.map((part: string, i: number) => {
                        const match = part.match(/\[(\d+)\]/);
                        if (match) {
                          const blankId = match[1];
                          const val = (answers[q.id] || {})[blankId] || "";
                          return (
                            <input
                              key={i}
                              type="text"
                              value={val}
                              onChange={(e) => {
                                const currentObj = answers[q.id] || {};
                                setAnswers({ ...answers, [q.id]: { ...currentObj, [blankId]: e.target.value } });
                              }}
                              className="inline-block w-32 mx-2 px-2 py-1 border-b-2 border-indigo-500 bg-indigo-50/50 outline-none text-center font-bold text-indigo-700 transition-colors focus:bg-indigo-100"
                              placeholder={`Blank ${blankId}`}
                            />
                          );
                        }
                        return <span key={i}>{part}</span>;
                      })}
                    </div>
                  );
                }

                if (qType === "NUMERIC") {
                  return (
                    <div className="bg-white p-6 rounded-lg border shadow-sm max-w-sm">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Enter your answer:</label>
                      <input
                        type="number"
                        step="any"
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-0 outline-none text-xl font-mono"
                        placeholder="e.g. 42.5"
                      />
                    </div>
                  );
                }

                return q.options.map((opt: any, idx: number) => {
                  const optText = typeof opt === "string" ? opt : opt.text;
                  const isChecked = qType === "MCQ_MULTI" 
                    ? (answers[q.id] || []).includes(optText)
                    : answers[q.id] === optText;

                  return (
                    <label
                      key={idx}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group has-[:checked]:border-indigo-600 has-[:checked]:bg-indigo-50"
                    >
                      <input
                        type={qType === "MCQ_MULTI" ? "checkbox" : "radio"}
                        name={`q-${q.id}`}
                        value={optText}
                        checked={isChecked}
                        onChange={() => {
                          if (qType === "MCQ_MULTI") {
                            const current = answers[q.id] || [];
                            if (current.includes(optText)) {
                              setAnswers({ ...answers, [q.id]: current.filter((x: string) => x !== optText) });
                            } else {
                              setAnswers({ ...answers, [q.id]: [...current, optText] });
                            }
                          } else {
                            handleAnswerSelect(optText);
                          }
                        }}
                        className={`w-5 h-5 text-indigo-600 focus:ring-indigo-600 border-gray-300 ${qType === "MCQ_MULTI" ? "rounded" : "rounded-full"}`}
                      />
                      {opt.imageUrl && (
                        <img src={opt.imageUrl} alt="Option image" className="h-12 w-12 object-cover rounded shadow-sm border" />
                      )}
                      <span className="text-slate-700 font-medium group-hover:text-slate-900">
                        {optText}
                      </span>
                    </label>
                  );
                });
              })()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-8 pt-8 border-t">
              <div>
                {config.allowBackNavigation !== false && (
                  <button 
                    onClick={handlePrev}
                    disabled={currentQuestion === 0}
                    className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                )}
              </div>
              
              {currentQuestion === questions.length - 1 ? (
                <button
                  onClick={() => handleFinishTest(false)}
                  className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Submit Test
                </button>
              ) : (
                <button 
                  onClick={handleNext}
                  className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Submit Exam?</h3>
            <p className="text-slate-600 mb-6">
              Are you sure you want to submit? You cannot change your answers after this.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
