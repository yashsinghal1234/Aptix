"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { logoutAction } from "@/app/actions/auth";
import { submitExamAction, saveDraftAnswerAction } from "@/app/actions/exam";
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

export function ExamInterface({ 
  candidateName, 
  session, 
  attempt, 
  dbQuestions,
  initialAnswers = {}
}: { 
  candidateName: string; 
  session: any; 
  attempt: any; 
  dbQuestions: any[];
  initialAnswers?: Record<string, string>;
}) {
  const [hasStarted, setHasStarted] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>(initialAnswers);
  const [syncStatus, setSyncStatus] = useState<"saved" | "syncing" | "cached">("saved");
  const [isRecovered, setIsRecovered] = useState(false);
  
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  
  const isAlreadySubmitted = attempt.status === "SUBMITTED";
  const [isFinished, setIsFinished] = useState(isAlreadySubmitted);
  const [timeUntilStart, setTimeUntilStart] = useState(0);
  const [timeLeft, setTimeLeft] = useState(session.durationMinutes * 60);
  const [isForcedLive, setIsForcedLive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [sessionStatus, setSessionStatus] = useState(session.status);
  const [tabSwitchWarning, setTabSwitchWarning] = useState<string | null>(null);
  
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finalTotalMarks, setFinalTotalMarks] = useState<number | null>(null);
  const [detailedResults, setDetailedResults] = useState<any[] | null>(null);
  const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false);

  const [currentExtendedUntil, setCurrentExtendedUntil] = useState<Date | null>(
    attempt.extendedUntil ? new Date(attempt.extendedUntil) : (session.extendedUntil ? new Date(session.extendedUntil) : null)
  );

  const answersRef = useRef(answers);
  const timeSpentRef = useRef<Record<string, number>>({});
  const isFinishingRef = useRef(isAlreadySubmitted);
  const blurCountRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const config = useMemo(() => {
    try {
      return session.configSnapshot ? JSON.parse(session.configSnapshot) : {};
    } catch {
      return {};
    }
  }, [session.configSnapshot]);

  useEffect(() => { 
    answersRef.current = answers; 
  }, [answers]);

  // Crash Recovery & Deterministic Shuffling Initialization
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

    // Check Local Storage Crash Buffer
    let localSaved: Record<string, any> = {};
    const localKey = `aptix_attempt_${attempt.id}`;
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) {
        localSaved = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Could not read local attempt cache", e);
    }

    // Merge DB saved responses with client offline buffer
    const mergedAnswers = { ...initialAnswers, ...localSaved };
    setAnswers(mergedAnswers);

    const answeredIds = Object.keys(mergedAnswers);
    if (answeredIds.length > 0) {
      setVisited(new Set(answeredIds));
      if (!isAlreadySubmitted) {
        setIsRecovered(true);
        setHasStarted(true); // Automatically resume directly into test
      }

      // Jump to first unanswered question
      const firstUnansweredIndex = finalQuestions.findIndex(q => !mergedAnswers[q.id]);
      if (firstUnansweredIndex !== -1) {
        setCurrentQuestion(firstUnansweredIndex);
      }
    } else if (finalQuestions.length > 0) {
      setVisited(new Set([finalQuestions[0].id]));
    }
  }, [dbQuestions, attempt.shuffleSeed, config, attempt.id, initialAnswers, isAlreadySubmitted]);

  // Debounced Autosave to Server + Instant Local Storage Mirror
  const handleAnswerSelect = useCallback((optValue: any, explicitQId?: string) => {
    if (isFinished || isFinishingRef.current) return;
    const qId = explicitQId || questions[currentQuestion]?.id;
    if (!qId) return;

    setAnswers(prev => {
      const next = { ...prev, [qId]: optValue };
      answersRef.current = next;

      // 1. Instant local persistence
      try {
        localStorage.setItem(`aptix_attempt_${attempt.id}`, JSON.stringify(next));
      } catch (e) {}

      return next;
    });

    setSyncStatus("syncing");

    // 2. Debounced background flush to PostgreSQL / SQLite
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      const stringifiedValue = typeof optValue === "string" ? optValue : JSON.stringify(optValue);
      const timeSpentSec = Math.floor((timeSpentRef.current[qId] || 0) / 1000);

      try {
        const res = await saveDraftAnswerAction(attempt.id, qId, stringifiedValue, timeSpentSec);
        if (res && res.success) {
          setSyncStatus("saved");
        } else {
          setSyncStatus("cached");
        }
      } catch (err) {
        setSyncStatus("cached"); // Offline or network blip; buffered locally
      }
    }, 1500);
  }, [attempt.id, currentQuestion, questions, isFinished]);

  const jumpToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < questions.length) {
      const targetQId = questions[index].id;
      setVisited(prev => new Set(prev).add(targetQId));
      setCurrentQuestion(index);
    }
  }, [questions]);

  const handleNext = useCallback(() => {
    if (currentQuestion < questions.length - 1) {
      jumpToQuestion(currentQuestion + 1);
    }
  }, [currentQuestion, questions.length, jumpToQuestion]);

  const handlePrev = useCallback(() => {
    if (currentQuestion > 0) {
      jumpToQuestion(currentQuestion - 1);
    }
  }, [currentQuestion, jumpToQuestion]);

  const toggleMarkForReview = useCallback(() => {
    const qId = questions[currentQuestion]?.id;
    if (!qId) return;

    setMarkedForReview(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  }, [currentQuestion, questions]);

  const { getServerTime, synced } = useServerTime();

  useEffect(() => {
    if (!synced) return;

    const calculateTimes = () => {
      const now = getServerTime();
      const rawStart = session.startTime ? new Date(session.startTime).getTime() : null;
      
      // If session is officially LIVE or forced live
      if (isForcedLive || sessionStatus === "LIVE") {
        setTimeUntilStart(0);
        
        // If rawStart was set in the past, use it; otherwise start clock from now
        const effectiveStart = (rawStart && rawStart <= now) ? rawStart : (rawStart ? Math.min(rawStart, now) : now);
        const baseEnd = effectiveStart + (session.durationMinutes * 60 * 1000);
        const end = currentExtendedUntil ? currentExtendedUntil.getTime() : baseEnd;
        
        if (now < end) {
          setTimeLeft(Math.floor((end - now) / 1000));
        } else {
          setTimeLeft(0);
          if (!isFinished && hasStarted) setShouldAutoSubmit(true);
        }
        return;
      }

      // Scheduled session: waiting for start time
      if (!rawStart) {
        setTimeUntilStart(999999);
        return;
      }

      if (now < rawStart) {
        // Exam hasn't started yet: countdown to start
        setTimeUntilStart(Math.floor((rawStart - now) / 1000));
      } else {
        // Exam is in progress
        setTimeUntilStart(0);
        const baseEnd = rawStart + (session.durationMinutes * 60 * 1000);
        const end = currentExtendedUntil ? currentExtendedUntil.getTime() : baseEnd;

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

  const executeSubmit = useCallback(async () => {
    if (isFinishingRef.current && isFinished) return;
    isFinishingRef.current = true;
    setShowSubmitConfirm(false);
    if (typeof document !== "undefined" && document.fullscreenElement) {
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
  }, [attempt.id, config.resultVisibility, isFinished]);

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

  // Anti-cheating Listeners (strictly active ONLY while hasStarted && !isFinished)
  useEffect(() => {
    if (!hasStarted || isFinished || isFinishingRef.current) return;

    const handleSecurityInfraction = (type: "WINDOW_BLUR" | "FULLSCREEN_EXIT", description: string) => {
      if (isFinishingRef.current || isFinished || !hasStarted) return;

      blurCountRef.current += 1;
      const count = blurCountRef.current;
      const maxLimit = config.tabSwitchLimit !== undefined ? parseInt(String(config.tabSwitchLimit), 10) : 0;

      // Log cheat signal only during live exam
      logCheatSignalAction(session.id, type, `${description} (Infraction #${count}).`);
      
      if (maxLimit > 0) {
        if (count >= maxLimit) {
          isFinishingRef.current = true;
          setTabSwitchWarning(`Maximum allowed security limit (${maxLimit}) reached. Auto-submitting assessment now.`);
          executeSubmit();
        } else {
          setTabSwitchWarning(`⚠️ Security Warning: ${count} of ${maxLimit} allowed infractions used (${type === "FULLSCREEN_EXIT" ? "Exited Fullscreen" : "Tab Switched"}). Exceeding will auto-submit.`);
        }
      } else if (config.autoSubmitOnFullscreenExit && type === "FULLSCREEN_EXIT") {
        isFinishingRef.current = true;
        setTabSwitchWarning("Exited full-screen mode. Assessment automatically submitted.");
        executeSubmit();
      }
    };

    const handleBlur = () => {
      handleSecurityInfraction("WINDOW_BLUR", "Candidate switched away from the exam window or tab");
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleSecurityInfraction("WINDOW_BLUR", "Candidate minimized window or changed active tab");
      }
    };

    const handleFullscreenChange = () => {
      if (isFinishingRef.current || isFinished || !hasStarted) return;
      if (config.requireFullscreen === false) return;
      
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        handleSecurityInfraction("FULLSCREEN_EXIT", "Candidate exited full-screen mode");
      } else {
        setIsFullscreen(true);
      }
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [hasStarted, isFinished, session.id, config, executeSubmit]);

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

  useEffect(() => {
    const interval = setInterval(async () => {
      const statusData = await getAttemptStatusAction(attempt.id);
      if (!statusData) return;
      
      setSessionStatus(statusData.sessionStatus);

      // Instant live resume if Owner reopens the test from SUBMITTED -> IN_PROGRESS
      if (statusData.status === "IN_PROGRESS" && isFinished) {
        setIsFinished(false);
        isFinishingRef.current = false;
        setHasStarted(true);
        setIsRecovered(true);
        if (statusData.extendedUntil) {
          setCurrentExtendedUntil(new Date(statusData.extendedUntil));
        }
      }

      if (statusData.sessionStatus === "LIVE" && !hasStarted && timeUntilStart > 0) {
        setIsForcedLive(true);
      } else if (statusData.sessionStatus === "COMPLETED" && !isFinished) {
        handleFinishTest(true);
      }

      if (statusData.extendedUntil) {
        setCurrentExtendedUntil(new Date(statusData.extendedUntil));
      }
    }, 10000);
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
        <div className="flex flex-col items-center bg-white p-8 rounded-2xl shadow-soft border border-slate-100">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-700 font-bold text-sm tracking-wide">Synchronizing Secure Clock...</p>
          <p className="text-slate-400 text-xs mt-1">Calibrating with assessment server</p>
        </div>
      </main>
    );
  }

  if (timeUntilStart === 999999) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950 text-white p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="text-center p-10 bg-navy-900/80 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl relative z-10 backdrop-blur-sm">
          <div className="w-14 h-14 bg-brand-600/20 text-brand-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-brand-500/30">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black mb-2 tracking-tight text-white">{session.exam.title}</h2>
          <p className="text-slate-400 text-sm mb-8 font-medium">Waiting for the test administrator to begin the session...</p>
          <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
          <p className="text-xs text-slate-500">Live listener active. This screen will auto-refresh when launched.</p>
        </div>
      </div>
    );
  }

  if (timeUntilStart > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950 text-white p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="text-center p-10 bg-navy-900/80 border border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl relative z-10 backdrop-blur-sm">
          <div className="w-14 h-14 bg-brand-600/20 text-brand-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-brand-500/30">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black mb-2 tracking-tight text-white">{session.exam.title}</h2>
          <p className="text-slate-400 text-sm mb-6 font-medium">Your scheduled assessment starts in:</p>
          <div className="text-6xl font-mono font-black text-brand-400 mb-8 tracking-wider bg-navy-800/80 py-4 px-6 rounded-2xl border border-slate-700/60 inline-block">
            {formatTime(timeUntilStart)}
          </div>
          <p className="text-xs text-slate-500">Please remain on this screen. The assessment will unlock automatically.</p>
        </div>
      </div>
    );
  }

  if (!hasStarted && timeUntilStart <= 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/80 p-6">
        <div className="bg-white border border-slate-200/80 rounded-3xl max-w-4xl w-full shadow-soft-xl overflow-hidden flex flex-col md:flex-row">
          {/* Left Purple Accent Banner (matching reference design) */}
          <div className="md:w-5/12 bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center p-0.5 shadow-sm shrink-0">
                  <img src="/aptix_logo.jpg" alt="Aptix" className="h-full w-full object-contain" />
                </div>
                <span className="text-xs uppercase tracking-widest font-bold text-brand-200">Aptix Assessment</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4 leading-snug">
                {session.exam.title}
              </h1>
              <p className="text-brand-100 text-sm leading-relaxed font-normal opacity-90">
                Please ensure you are in a quiet environment to avoid distractions. Read through the onboarding instructions carefully before starting.
              </p>
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/15 relative z-10 flex items-center justify-between text-xs text-brand-200">
              <span>Candidate: <strong className="text-white">{candidateName}</strong></span>
              <span>{session.durationMinutes} mins total</span>
            </div>

            {/* Background decorative elements */}
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          </div>

          {/* Right Content Panel */}
          <div className="md:w-7/12 p-8 md:p-10 flex flex-col justify-between bg-white">
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Overview & Guidelines</h2>
                <p className="text-slate-500 text-xs mt-0.5">Answer all {questions.length} questions to showcase your skills</p>
              </div>

              {session.exam.instructions && (
                <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/60">
                  <h3 className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-1.5">Instructor Note</h3>
                  <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">{session.exam.instructions}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/60 border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Timed Assessment ({session.durationMinutes} Minutes)</h4>
                    <p className="text-slate-500 text-xs mt-0.5">The countdown starts immediately upon clicking start and cannot be paused.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/60 border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Automated Integrity Proctoring</h4>
                    <p className="text-slate-500 text-xs mt-0.5">Exam runs in full screen. Tab switches and window unfocus events are recorded.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100">
              <button 
                onClick={startExamFullscreen}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl shadow-brand hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
              >
                <span>Start Assessment</span>
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isFinished) {
    const isTimeout = timeLeft <= 0;
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 py-12 overflow-y-auto">
        <div className={`bg-white p-10 rounded-3xl shadow-soft-xl w-full text-center border border-slate-100/90 ${detailedResults && detailedResults.length > 0 ? 'max-w-4xl' : 'max-w-md'}`}>
          {/* Icon (Alarm clock if timeout, checkmark if regular submit) */}
          <div className={`w-16 h-16 ${isTimeout ? 'bg-brand-50 text-brand-600 border border-brand-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm`}>
            {isTimeout ? (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">
            {isTimeout ? "Out of Time" : "Assessment Completed"}
          </h1>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            {isTimeout 
              ? `The time limit has expired and your responses for ${session.exam.title} have been securely submitted.` 
              : `Thank you, ${candidateName}. Your responses for ${session.exam.title} have been safely submitted and recorded.`
            }
          </p>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs font-semibold text-slate-600 mb-6 flex justify-around">
            <span>Questions Attempted: <strong className="text-slate-900">{Object.keys(answers).length} / {questions.length}</strong></span>
          </div>
          
          {config.resultVisibility === "IMMEDIATE" && finalScore !== null && (
            <div className="mb-8 w-full max-w-4xl mx-auto text-left">
              <div className="p-6 bg-brand-50/60 border border-brand-100 rounded-2xl mb-8 text-center shadow-soft-sm">
                <h3 className="text-xs font-bold text-brand-800 uppercase tracking-widest mb-1.5">Your Overall Score</h3>
                <div className="text-4xl font-black text-brand-600 tracking-tight">
                  {typeof finalScore === 'number' ? finalScore.toFixed(1) : 0} <span className="text-lg text-brand-400 font-bold">/ {finalTotalMarks}</span>
                </div>
              </div>

              {detailedResults && detailedResults.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Detailed Breakdown</h3>
                  {dbQuestions.map((q, idx) => {
                    const res = detailedResults.find(r => r.questionId === q.id);
                    if (!res) return null;
                    
                    return (
                      <div key={q.id} className={`p-5 rounded-2xl border transition-all ${res.isCorrect ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
                        <div className="flex gap-4">
                          <span className={`font-black text-sm shrink-0 mt-0.5 ${res.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>Q{idx + 1}.</span>
                          <div className="flex-1 space-y-3">
                            <p className="font-semibold text-slate-900 text-sm">{q.text}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="font-bold text-slate-500 block mb-1">Your Submission:</span>
                                <div className="px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 font-medium text-slate-800">
                                  {answers[q.id] ? (Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).join(", ") : answers[q.id]) : <span className="text-slate-400 italic">No Answer</span>}
                                </div>
                              </div>
                              {res.correctAnswer && (
                                <div>
                                  <span className="font-bold text-slate-500 block mb-1">Correct Answer:</span>
                                  <div className="px-3.5 py-2.5 bg-white rounded-xl border border-emerald-300 text-emerald-800 font-semibold">
                                    {Array.isArray(res.correctAnswer) ? res.correctAnswer.join(", ") : res.correctAnswer}
                                  </div>
                                </div>
                              )}
                            </div>

                            {res.explanation && (
                              <div className="mt-3 p-3.5 bg-white/80 rounded-xl text-xs border border-slate-200/80">
                                <span className="font-bold text-slate-800 block mb-1">Explanation:</span>
                                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{res.explanation}</p>
                              </div>
                            )}
                            
                            <div className="text-right text-[11px] font-bold uppercase tracking-wider text-slate-400 pt-2 border-t border-slate-200/50">
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
            <button className="text-brand-600 font-bold text-sm hover:text-brand-700 hover:underline">
              Return to Login
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (hasStarted && !isFinished && !isFullscreen && config.requireFullscreen !== false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950/95 p-6 z-50 fixed inset-0 backdrop-blur-md">
        <div className="bg-white p-10 rounded-3xl max-w-lg w-full text-center shadow-2xl border border-red-100 animate-in fade-in zoom-in duration-200">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">Assessment Paused</h2>
          <p className="text-slate-600 text-sm mb-8 leading-relaxed">
            You exited full-screen mode. This integrity event has been recorded for review. You must resume full-screen to continue answering questions.
          </p>
          <button 
            onClick={async () => {
              try {
                await document.documentElement.requestFullscreen();
              } catch (err) {
                console.warn(err);
              }
            }}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-sm text-sm"
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
        <div className="bg-white p-10 rounded-3xl shadow-soft-xl max-w-md w-full text-center border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">No Questions Available</h1>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            This exam session was generated without any questions. Please notify the test administrator.
          </p>
          <form action={logoutAction}>
            <button className="text-brand-600 font-bold hover:underline text-sm">Log Out</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <>
      <main 
        className="min-h-screen bg-slate-50/70 flex flex-col select-none"
        onCopy={(e) => { if (config.disableCopyPaste !== false) { e.preventDefault(); return false; } }}
        onPaste={(e) => { if (config.disableCopyPaste !== false) { e.preventDefault(); return false; } }}
      >
        {/* Dark Navy Navbar (matching reference bottom-left) */}
        <header className="bg-navy-900 border-b border-navy-800 px-6 py-3.5 flex justify-between items-center shadow-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center p-0.5 shadow-sm shrink-0">
                <img src="/aptix_logo.jpg" alt="Aptix" className="h-full w-full object-contain" />
              </div>
              <span className="font-extrabold text-white text-base tracking-tight hidden sm:inline">Aptix</span>
            </div>
            <div className="h-4 w-px bg-navy-700 hidden sm:block" />
            <h1 className="text-sm font-semibold text-slate-200 tracking-wide truncate max-w-[200px] sm:max-w-md">
              {session.exam.title}
            </h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Real-time Cloud Autosave Status Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-navy-800/80 border border-slate-700 text-slate-300">
              {syncStatus === "saved" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-emerald-300">Cloud Synced</span>
                </>
              )}
              {syncStatus === "syncing" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-amber-300">Autosaving...</span>
                </>
              )}
              {syncStatus === "cached" && (
                <>
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-cyan-300">Buffered Locally</span>
                </>
              )}
            </div>

            {/* Pill-shaped Countdown Timer (matching reference design) */}
            <div className={`flex items-center gap-2.5 px-4 py-1.5 rounded-full border text-xs font-bold tracking-wider ${
              timeLeft < 300 
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' 
                : 'bg-navy-800 text-slate-200 border-slate-700'
            }`}>
              <svg className="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-mono text-sm text-white">{formatTime(timeLeft)}</span>
              <span className="text-[11px] text-slate-400 font-normal hidden md:inline">remaining</span>
            </div>

            <button 
              onClick={() => handleFinishTest(false)}
              className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 rounded-lg transition-colors border border-slate-700 shadow-sm"
            >
              Finish
            </button>
          </div>
        </header>

        {/* Crash Recovery Notification Banner */}
        {isRecovered && (
          <div className="bg-indigo-900 text-indigo-100 text-xs px-6 py-2 flex items-center justify-between border-b border-indigo-800">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
              <span><strong>Assessment Restored:</strong> Resumed where you left off. All your previous answers and progress have been saved.</span>
            </div>
            <button 
              onClick={() => setIsRecovered(false)}
              className="text-indigo-300 hover:text-white text-[11px] font-bold"
            >
              ✕ Dismiss
            </button>
          </div>
        )}

        <div className="flex-1 flex px-4 md:px-8 py-8 gap-6 max-w-7xl mx-auto w-full">
          {/* Question Palette Sidebar */}
          <aside className="w-64 shrink-0 hidden lg:block">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-soft h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Question Palette
                  </h2>
                  <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                    {Object.keys(answers).length} / {questions.length}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-6">
                  {questions.map((q, i) => {
                    const qId = q.id;
                    const isAnswered = answers[qId] !== undefined;
                    const isVisited = visited.has(qId);
                    const isMarked = markedForReview.has(qId);
                    const isActive = i === currentQuestion;
                    
                    let style = "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"; 
                    if (isMarked) style = "bg-amber-100 text-amber-800 border-amber-300 font-bold"; 
                    else if (isAnswered) style = "bg-brand-600 text-white border-brand-700 font-bold shadow-sm";
                    else if (isVisited) style = "bg-slate-200 text-slate-700 border-slate-300";
                    
                    const ringClass = isActive ? "ring-2 ring-brand-500 ring-offset-2 scale-105" : "";

                    return (
                      <button
                        key={qId}
                        onClick={() => jumpToQuestion(i)}
                        className={`h-9 w-full rounded-xl font-bold text-xs flex items-center justify-center transition-all border ${style} ${ringClass}`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="pt-4 border-t border-slate-100 space-y-2 text-[11px] text-slate-500 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-brand-600 shrink-0" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 shrink-0" />
                  <span>Marked for Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200 shrink-0" />
                  <span>Unanswered</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Question Container (matching reference design) */}
          <div className="flex-1">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft p-6 sm:p-10 min-h-[540px] flex flex-col justify-between">
              <div>
                {/* Question Header Badge */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                  <span className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full uppercase tracking-wider">
                    Question {currentQuestion + 1} of {questions.length}
                  </span>
                  
                  <button 
                    onClick={toggleMarkForReview}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      markedForReview.has(questions[currentQuestion].id) 
                        ? "bg-amber-100 text-amber-800 border-amber-300 shadow-sm" 
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill={markedForReview.has(questions[currentQuestion].id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    {markedForReview.has(questions[currentQuestion].id) ? "Marked" : "Mark for Review"}
                  </button>
                </div>

                {/* Real-time Tab Switch Warning Banner */}
                {tabSwitchWarning && (
                  <div className="mb-6 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⚠️</span>
                      <span>{tabSwitchWarning}</span>
                    </div>
                    <button 
                      onClick={() => setTabSwitchWarning(null)}
                      className="text-amber-600 hover:text-amber-800 text-[11px] font-extrabold ml-3"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Question Stem */}
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug mb-6">
                  {questions[currentQuestion].text}
                </h2>

                {questions[currentQuestion].imageUrl && (
                  <div className="mb-6">
                    <img 
                      src={questions[currentQuestion].imageUrl} 
                      alt="Question illustration" 
                      className="max-h-72 rounded-2xl border border-slate-200 shadow-sm select-none pointer-events-none"
                    />
                  </div>
                )}

                {/* Question Options */}
                <div className="space-y-3 mb-8">
                  {(() => {
                    const q = questions[currentQuestion];
                    const qType = q.type || "MCQ_SINGLE";
                    
                    if (qType === "FILL_BLANK") {
                      const textParts = q.text.split(/(\[\d+\])/g);
                      return (
                        <div className="text-lg font-medium text-slate-800 leading-relaxed bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
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
                                  className="inline-block w-36 mx-2 px-3 py-1.5 border-b-2 border-brand-500 bg-brand-50/60 outline-none text-center font-bold text-brand-700 transition-colors focus:bg-brand-100 rounded-t-lg"
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
                        <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200 max-w-sm">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Enter your numerical answer:</label>
                          <input
                            type="number"
                            step="any"
                            value={answers[q.id] || ""}
                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                            className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-brand-600 focus:ring-0 outline-none text-xl font-mono font-bold text-slate-900"
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
                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group select-none ${
                            isChecked 
                              ? "border-brand-600 bg-brand-50/50 shadow-soft-sm text-slate-900 font-semibold" 
                              : "border-slate-200/80 bg-white hover:bg-slate-50/80 text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <div className={`w-5 h-5 ${qType === "MCQ_MULTI" ? "rounded-lg" : "rounded-full"} border flex items-center justify-center transition-all ${
                            isChecked 
                              ? "border-brand-600 bg-brand-600 text-white" 
                              : "border-slate-300 bg-white group-hover:border-slate-400"
                          }`}>
                            {isChecked && (
                              <div className={qType === "MCQ_MULTI" ? "w-2.5 h-2.5 bg-white rounded-xs" : "w-2 h-2 rounded-full bg-white"} />
                            )}
                          </div>

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
                            className="sr-only"
                          />
                          {opt.imageUrl && (
                            <img src={opt.imageUrl} alt="Option attachment" className="h-12 w-12 object-cover rounded-xl shadow-sm border border-slate-200" />
                          )}
                          <span className="text-sm font-medium leading-relaxed">
                            {optText}
                          </span>
                        </label>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Navigation Bar Footer */}
              <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                <div>
                  {config.allowBackNavigation !== false && (
                    <button 
                      onClick={handlePrev}
                      disabled={currentQuestion === 0}
                      className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-soft-sm"
                    >
                      ← Previous
                    </button>
                  )}
                </div>
                
                {currentQuestion === questions.length - 1 ? (
                  <button
                    onClick={() => handleFinishTest(false)}
                    className="px-8 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-brand hover:shadow-lg transition-all"
                  >
                    Submit Assessment
                  </button>
                ) : (
                  <button 
                    onClick={handleNext}
                    className="px-8 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-brand hover:shadow-lg transition-all flex items-center gap-1.5"
                  >
                    <span>Next</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-in fade-in zoom-in duration-200 border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4 border border-brand-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-2 text-center">Submit Assessment?</h3>
            <p className="text-slate-500 text-xs text-center mb-6 leading-relaxed">
              Are you sure you want to finish? You will not be able to revisit or modify your answers.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeSubmit}
                className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors shadow-brand"
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
