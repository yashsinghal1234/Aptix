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
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  const { answeredCount, notAnsweredCount, notVisitedCount, markedCount, ansMarkedCount } = useMemo(() => {
    let ans = 0;
    let notAns = 0;
    let notVis = 0;
    let mrk = 0;
    let ansMrk = 0;

    questions.forEach((q, idx) => {
      const isAns = answers[q.id] !== undefined && answers[q.id] !== "" && !(Array.isArray(answers[q.id]) && answers[q.id].length === 0);
      const isVis = visited.has(q.id) || idx === currentQuestion;
      const isMrk = markedForReview.has(q.id);

      if (isAns && isMrk) ansMrk++;
      else if (isMrk) mrk++;
      else if (isAns) ans++;
      else if (isVis) notAns++;
      else notVis++;
    });

    return {
      answeredCount: ans,
      notAnsweredCount: notAns,
      notVisitedCount: notVis,
      markedCount: mrk,
      ansMarkedCount: ansMrk
    };
  }, [questions, answers, visited, markedForReview, currentQuestion]);

  const topicBreakdown = useMemo(() => {
    if (!detailedResults || detailedResults.length === 0) return null;
    const catMap: Record<string, { totalPossible: number; earned: number; count: number }> = {};

    dbQuestions.forEach(q => {
      const cat = q.category || "General";
      if (!catMap[cat]) catMap[cat] = { totalPossible: 0, earned: 0, count: 0 };
      catMap[cat].totalPossible += (q.points || 1);
      catMap[cat].count += 1;

      const res = detailedResults.find(r => r.questionId === q.id);
      if (res) {
        catMap[cat].earned += res.earnedPoints;
      }
    });

    const list = Object.entries(catMap).map(([name, data]) => {
      const pct = data.totalPossible > 0 ? Math.round((data.earned / data.totalPossible) * 100) : 0;
      return {
        name,
        earned: data.earned,
        totalPossible: data.totalPossible,
        count: data.count,
        pct: Math.max(0, Math.min(100, pct))
      };
    }).sort((a, b) => b.pct - a.pct);

    return {
      topics: list,
      strongest: list.length > 0 ? list[0] : null,
      focusArea: list.length > 1 ? list[list.length - 1] : null
    };
  }, [detailedResults, dbQuestions]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      setIsFullscreen(!!document.fullscreenElement);
    }
  }, []);

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
        if (config.requireFullscreen === false) {
          setHasStarted(true);
        }
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

  const handleClearResponse = useCallback(() => {
    const qId = questions[currentQuestion]?.id;
    if (!qId) return;

    setAnswers(prev => {
      const next = { ...prev };
      delete next[qId];
      return next;
    });

    const localKey = `aptix_attempt_${attempt.id}`;
    try {
      const local = JSON.parse(localStorage.getItem(localKey) || "{}");
      delete local[qId];
      localStorage.setItem(localKey, JSON.stringify(local));
    } catch {}

    saveDraftAnswerAction(attempt.id, qId, "").catch(err => console.warn(err));
  }, [currentQuestion, questions, attempt.id]);

  const handleMarkForReviewAndNext = useCallback(() => {
    const qId = questions[currentQuestion]?.id;
    if (qId) {
      setMarkedForReview(prev => new Set(prev).add(qId));
    }
    if (currentQuestion < questions.length - 1) {
      jumpToQuestion(currentQuestion + 1);
    }
  }, [currentQuestion, questions, jumpToQuestion]);

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

  // Anti-cheating Telemetry Listeners (strictly active ONLY while hasStarted && !isFinished)
  useEffect(() => {
    if (!hasStarted || isFinished || isFinishingRef.current) return;

    const handleSecurityInfraction = (
      type: "WINDOW_BLUR" | "FULLSCREEN_EXIT" | "COPY_PASTE" | "DEV_TOOLS" | "CONTEXT_MENU", 
      description: string
    ) => {
      if (isFinishingRef.current || isFinished || !hasStarted) return;

      blurCountRef.current += 1;
      const count = blurCountRef.current;
      const maxLimit = config.tabSwitchLimit !== undefined ? parseInt(String(config.tabSwitchLimit), 10) : 0;

      // Log cheat signal to database in real-time
      logCheatSignalAction(session.id, type, `${description} (Infraction #${count}).`);
      
      if (maxLimit > 0) {
        if (count >= maxLimit) {
          isFinishingRef.current = true;
          setTabSwitchWarning(`Maximum allowed security limit (${maxLimit}) reached. Auto-submitting assessment now.`);
          executeSubmit();
        } else {
          setTabSwitchWarning(`Security Warning: Infraction #${count} of ${maxLimit} allowed logged (${description}). Exceeding will auto-submit.`);
        }
      } else if (config.autoSubmitOnFullscreenExit && type === "FULLSCREEN_EXIT") {
        isFinishingRef.current = true;
        setTabSwitchWarning("Exited full-screen mode. Assessment automatically submitted.");
        executeSubmit();
      } else {
        setTabSwitchWarning(`Security Alert: Infraction #${count} logged to examiner (${description}).`);
      }
    };

    const handleBlur = () => {
      handleSecurityInfraction("WINDOW_BLUR", "Candidate switched away from exam window or tab");
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleSecurityInfraction("WINDOW_BLUR", "Candidate minimized window or navigated to another tab");
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

    const handleCopy = (e: ClipboardEvent) => {
      if (config.disableCopyPaste !== false) {
        e.preventDefault();
        handleSecurityInfraction("COPY_PASTE", "Candidate attempted to copy assessment content");
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (config.disableCopyPaste !== false) {
        e.preventDefault();
        handleSecurityInfraction("COPY_PASTE", "Candidate attempted to paste content into assessment");
      }
    };

    const handleCut = (e: ClipboardEvent) => {
      if (config.disableCopyPaste !== false) {
        e.preventDefault();
        handleSecurityInfraction("COPY_PASTE", "Candidate attempted to cut content from assessment");
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      handleSecurityInfraction("CONTEXT_MENU", "Candidate opened right-click context menu");
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Intercept F12 and common DevTools shortcuts
      if (
        e.key === "F12" ||
        (e.ctrlKey && (e.key === "u" || e.key === "U")) ||
        (e.ctrlKey && e.shiftKey && ["I", "i", "J", "j", "C", "c"].includes(e.key))
      ) {
        e.preventDefault();
        handleSecurityInfraction("DEV_TOOLS", "Candidate attempted to open browser developer tools / inspect elements");
      }
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("cut", handleCut);
    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
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
        setIsFullscreen(true);
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
        setHasStarted(false); // Force through fullscreen entry button
        setIsFullscreen(false);
        setIsRecovered(true);
        blurCountRef.current = 0;
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
      <main className="min-h-screen bg-black text-white flex items-center justify-center selection:bg-white selection:text-black">
        <div className="flex flex-col items-center bg-[#0a0c10] p-8 rounded-2xl shadow-2xl border border-neutral-800">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
          <p className="text-white font-bold text-sm tracking-wide">Synchronizing Secure Clock...</p>
          <p className="text-neutral-400 text-xs mt-1">Calibrating with assessment server</p>
        </div>
      </main>
    );
  }

  if (timeUntilStart === 999999) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-6 relative overflow-hidden selection:bg-white selection:text-black">
        <div className="text-center p-10 bg-[#0a0c10] border border-neutral-800 rounded-3xl max-w-lg w-full shadow-2xl relative z-10">
          <div className="w-14 h-14 bg-neutral-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 border border-neutral-800 shadow-inner">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-bold tracking-widest text-neutral-300 uppercase mb-3">
            <span className="text-emerald-400">✦</span>
            <span>Aptix Assessment Hall</span>
          </div>
          <h2 className="text-2xl font-black mb-2 tracking-tight text-white">{session.exam.title}</h2>
          <p className="text-neutral-400 text-sm mb-8 font-medium">Waiting for your test administrator to broadcast and launch the session...</p>
          <div className="w-10 h-10 border-2 border-neutral-700 border-t-white rounded-full animate-spin mx-auto mb-8"></div>
          <p className="text-xs text-neutral-500">Live listener active. This screen will auto-refresh when launched.</p>
        </div>
      </div>
    );
  }

  if (timeUntilStart > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-6 relative overflow-hidden selection:bg-white selection:text-black">
        <div className="text-center p-10 bg-[#0a0c10] border border-neutral-800 rounded-3xl max-w-lg w-full shadow-2xl relative z-10">
          <div className="w-14 h-14 bg-neutral-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 border border-neutral-800 shadow-inner">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-bold tracking-widest text-neutral-300 uppercase mb-3">
            <span className="text-emerald-400">✦</span>
            <span>Assessment Starting Soon</span>
          </div>
          <h2 className="text-2xl font-black mb-2 tracking-tight text-white">{session.exam.title}</h2>
          <p className="text-neutral-400 text-sm mb-6 font-medium">Your scheduled assessment unlocks in:</p>
          <div className="text-6xl font-mono font-black text-white mb-8 tracking-wider bg-neutral-900/90 py-4 px-6 rounded-2xl border border-neutral-800 inline-block shadow-inner">
            {formatTime(timeUntilStart)}
          </div>
          <p className="text-xs text-neutral-500">Please remain on this screen. The assessment will unlock automatically.</p>
        </div>
      </div>
    );
  }

  if (!hasStarted && timeUntilStart <= 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6 selection:bg-white selection:text-black">
        <div className="bg-[#0a0c10] border border-neutral-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col md:flex-row">
          {/* Left Dark Accent Banner */}
          <div className="md:w-5/12 bg-[#07080c] border-b md:border-b-0 md:border-r border-neutral-800 text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="relative w-8 h-8 flex items-center justify-center overflow-hidden shrink-0">
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
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest font-bold text-neutral-400">
                  <span className="text-emerald-400 text-[10px]">✦</span>
                  <span>Aptix Assessment</span>
                </div>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4 leading-snug text-white">
                {session.exam.title}
              </h1>
              <p className="text-neutral-400 text-sm leading-relaxed font-normal">
                Please ensure you are in a quiet environment to avoid distractions. Read through the onboarding instructions carefully before starting.
              </p>
            </div>
            
            <div className="mt-8 pt-6 border-t border-neutral-800 relative z-10 flex items-center justify-between text-xs text-neutral-400">
              <span>Candidate: <strong className="text-white">{candidateName}</strong></span>
              <span>{session.durationMinutes} mins total</span>
            </div>
          </div>

          {/* Right Content Panel */}
          <div className="md:w-7/12 p-8 md:p-10 flex flex-col justify-between bg-[#0a0c10]">
            <div className="space-y-6">
              <div className="border-b border-neutral-800 pb-4">
                <h2 className="text-lg font-bold text-white tracking-tight">Overview & Guidelines</h2>
                <p className="text-neutral-400 text-xs mt-0.5">Answer all {questions.length} questions to showcase your skills</p>
              </div>

              {session.exam.instructions && (
                <div className="bg-[#0d0f14] rounded-xl p-4 border border-neutral-800">
                  <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span className="text-emerald-400 text-[10px]">✦</span>
                    <span>Instructor Note</span>
                  </h3>
                  <p className="text-neutral-300 text-xs leading-relaxed whitespace-pre-wrap">{session.exam.instructions}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#0d0f14] border border-neutral-800">
                  <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0 mt-0.5 border border-neutral-800">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Timed Assessment ({session.durationMinutes} Minutes)</h4>
                    <p className="text-neutral-400 text-xs mt-0.5">The countdown starts immediately upon clicking start and cannot be paused.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#0d0f14] border border-neutral-800">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/20">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Automated Integrity Proctoring</h4>
                    <p className="text-neutral-400 text-xs mt-0.5">Exam runs in full screen. Tab switches and window unfocus events are recorded.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-neutral-800">
              <button 
                onClick={startExamFullscreen}
                className="w-full py-3.5 bg-white hover:bg-neutral-200 text-black font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <span>{isRecovered ? "Enter Fullscreen & Resume Assessment" : "Start Assessment"}</span>
                <svg className="w-4 h-4 text-black group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 py-12 overflow-y-auto selection:bg-white selection:text-black">
        <div className={`bg-[#0a0c10] p-10 rounded-3xl shadow-2xl w-full text-center border border-neutral-800 ${detailedResults && detailedResults.length > 0 ? 'max-w-4xl' : 'max-w-md'}`}>
          {/* Icon (Alarm clock if timeout, checkmark if regular submit) */}
          <div className={`w-16 h-16 ${isTimeout ? 'bg-amber-950/40 text-amber-400 border border-amber-500/30' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm`}>
            {isTimeout ? (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white mb-2">
            {isTimeout ? "Time Has Expired" : "Assessment Complete!"}
          </h1>
          <p className="text-neutral-400 text-xs font-medium max-w-sm mx-auto mb-8">
            {isTimeout 
              ? "Your allocated examination time has completed. Your responses were automatically synchronized and sealed."
              : "Thank you for completing this assessment. Your responses have been submitted to the evaluating examiner."
            }
          </p>

          <div className="bg-[#0d0f14] rounded-2xl p-4 border border-neutral-800 text-xs font-semibold text-neutral-400 mb-6 flex justify-around">
            <span>Questions Attempted: <strong className="text-white">{Object.keys(answers).length} / {questions.length}</strong></span>
          </div>
          
          {config.resultVisibility === "IMMEDIATE" && finalScore !== null && (
            <div className="mb-8 w-full max-w-4xl mx-auto text-left">
              <div className="p-6 bg-[#0d0f14] border border-neutral-800 rounded-3xl mb-6 text-center shadow-lg">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Your Overall Score</h3>
                <div className="text-4xl font-black text-white tracking-tight">
                  {typeof finalScore === 'number' ? finalScore.toFixed(1) : 0} <span className="text-lg text-neutral-400 font-bold">/ {finalTotalMarks}</span>
                </div>
                <div className="mt-2 text-xs font-bold text-neutral-400">
                  Accuracy: {finalTotalMarks ? Math.round(((finalScore || 0) / finalTotalMarks) * 100) : 0}%
                </div>
              </div>

              {/* Topic Performance Diagnostics */}
              {topicBreakdown && topicBreakdown.topics.length > 0 && (
                <div className="mb-8 p-6 bg-[#0d0f14] border border-neutral-800 rounded-3xl space-y-5">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>Topic Mastery & Performance Breakdown</span>
                    </h3>
                    <span className="text-[11px] font-bold text-neutral-400">{topicBreakdown.topics.length} Evaluated Areas</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {topicBreakdown.topics.map((t, idx) => (
                      <div key={idx} className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 shadow-xs">
                        <div className="flex justify-between items-center text-xs font-bold mb-2">
                          <span className="text-neutral-200">{t.name}</span>
                          <span className={`${t.pct >= 75 ? 'text-emerald-400' : t.pct >= 50 ? 'text-white' : 'text-amber-400'}`}>
                            {t.pct}% ({t.earned.toFixed(1)}/{t.totalPossible} pts)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800/80">
                          <div 
                            className={`h-full rounded-full transition-all ${t.pct >= 75 ? 'bg-striped-emerald' : t.pct >= 50 ? 'bg-striped-blue' : 'bg-striped-pink'}`}
                            style={{ width: `${t.pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-neutral-500 mt-1.5 block">{t.count} question{t.count > 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>

                  {/* Diagnostic Highlights */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-800">
                    {topicBreakdown.strongest && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Top Strength:</span>
                        <span>{topicBreakdown.strongest.name} ({topicBreakdown.strongest.pct}%)</span>
                      </div>
                    )}
                    {topicBreakdown.focusArea && topicBreakdown.focusArea.name !== topicBreakdown.strongest?.name && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-bold">
                        <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span>Recommended Focus:</span>
                        <span>{topicBreakdown.focusArea.name} ({topicBreakdown.focusArea.pct}%)</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detailedResults && detailedResults.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-white border-b border-neutral-800 pb-2">Detailed Question Review</h3>
                  {dbQuestions.map((q, idx) => {
                    const res = detailedResults.find(r => r.questionId === q.id);
                    if (!res) return null;
                    
                    return (
                      <div key={q.id} className={`p-5 rounded-2xl border transition-all ${res.isCorrect ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-rose-950/20 border-rose-500/40'}`}>
                        <div className="flex gap-4">
                          <span className={`font-black text-sm shrink-0 mt-0.5 ${res.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>Q{idx + 1}.</span>
                          <div className="flex-1 space-y-3">
                            <p className="font-semibold text-white text-sm">{q.text}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="font-bold text-neutral-400 block mb-1">Your Submission:</span>
                                <div className="px-3.5 py-2.5 bg-neutral-900 rounded-xl border border-neutral-800 font-medium text-neutral-200">
                                  {answers[q.id] ? (Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).join(", ") : answers[q.id]) : <span className="text-neutral-500 italic">No Answer</span>}
                                </div>
                              </div>
                              {res.correctAnswer && (
                                <div>
                                  <span className="font-bold text-neutral-400 block mb-1">Correct Answer:</span>
                                  <div className="px-3.5 py-2.5 bg-emerald-950/60 rounded-xl border border-emerald-500/40 text-emerald-300 font-semibold">
                                    {Array.isArray(res.correctAnswer) ? res.correctAnswer.join(", ") : res.correctAnswer}
                                  </div>
                                </div>
                              )}
                            </div>

                            {res.explanation && (
                              <div className="mt-3 p-3.5 bg-[#07080c] rounded-xl text-xs border border-neutral-800">
                                <span className="font-bold text-neutral-300 block mb-1">Explanation:</span>
                                <p className="text-neutral-400 leading-relaxed whitespace-pre-wrap">{res.explanation}</p>
                              </div>
                            )}
                            
                            <div className="text-right text-[11px] font-bold uppercase tracking-wider text-neutral-500 pt-2 border-t border-neutral-800">
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

          <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
            {config.resultVisibility === "IMMEDIATE" && finalScore !== null && (
              <button
                type="button"
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-white hover:bg-neutral-200 text-black font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Download / Print Scorecard PDF</span>
              </button>
            )}
            <form action={logoutAction}>
              <button className="text-neutral-400 font-bold text-xs hover:text-white px-4 py-2.5 transition-colors">
                Return to Login
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  if (hasStarted && !isFinished && !isFullscreen && config.requireFullscreen !== false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black/90 p-6 z-50 fixed inset-0 backdrop-blur-md selection:bg-white selection:text-black">
        <div className="bg-[#0a0c10] p-10 rounded-3xl max-w-lg w-full text-center shadow-2xl border border-rose-900/60 animate-in fade-in zoom-in duration-200">
          <div className="w-16 h-16 bg-rose-950/60 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-rose-500/30">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white mb-3 tracking-tight">Assessment Paused</h2>
          <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
            You exited full-screen mode. This integrity event has been recorded for review. You must resume full-screen to continue answering questions.
          </p>
          <button 
            onClick={async () => {
              try {
                await document.documentElement.requestFullscreen();
                setIsFullscreen(true);
              } catch (err) {
                console.warn(err);
              }
            }}
            className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl transition-colors shadow-lg text-sm"
          >
            Return to Full Screen
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 selection:bg-white selection:text-black">
        <div className="bg-[#0a0c10] p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border border-neutral-800">
          <div className="w-16 h-16 bg-rose-950/60 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/30">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white mb-3">No Questions Available</h1>
          <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
            This exam session was generated without any questions. Please notify the test administrator.
          </p>
          <form action={logoutAction}>
            <button className="text-neutral-400 hover:text-white font-bold text-sm transition-colors">Log Out</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <>
      <main 
        className="min-h-screen bg-black text-white flex flex-col select-none selection:bg-white selection:text-black font-sans"
        onCopy={(e) => { if (config.disableCopyPaste !== false) { e.preventDefault(); return false; } }}
        onPaste={(e) => { if (config.disableCopyPaste !== false) { e.preventDefault(); return false; } }}
      >
        {/* Pitch Black Upper Bar Header */}
        <header className="bg-[#07080c] border-b border-neutral-800/80 px-4 sm:px-6 py-2.5 sm:py-3 flex justify-between items-center shadow-2xl sticky top-0 z-30 relative">
          {/* Left: Branding & Assessment Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative w-8 h-8 flex items-center justify-center overflow-hidden shrink-0">
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
              <div className="hidden md:flex items-center gap-1">
                <span className="font-black text-white text-base tracking-tight">Aptix</span>
                <span className="text-[10px] text-emerald-400">✦</span>
              </div>
            </div>
            
            <div className="h-4 w-px bg-neutral-800 hidden sm:block" />
            
            <div className="truncate min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
                  {session.exam.title}
                </h1>
                {session.pin && (
                  <span className="hidden lg:inline-flex text-[10px] font-mono font-bold bg-neutral-900 text-neutral-300 px-2 py-0.5 rounded-md border border-neutral-800 shrink-0">
                    PIN: {session.pin}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Candidate Info & Answered Progress (Visible on Medium+ screens) */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-semibold text-neutral-300 shadow-inner">
              <div className="w-5 h-5 rounded-full bg-white text-black text-[10px] font-black flex items-center justify-center shrink-0">
                {candidateName ? candidateName.charAt(0).toUpperCase() : "C"}
              </div>
              <span className="text-neutral-500 text-[11px]">Candidate:</span>
              <span className="text-white font-bold max-w-[120px] truncate">{candidateName}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-bold text-neutral-300 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{answeredCount + ansMarkedCount} of {questions.length} Answered</span>
            </div>
          </div>

          {/* Right: Autosave, Timer, Fullscreen & Finish */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Real-time Cloud Autosave Status Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-900 border border-neutral-800 text-neutral-300 shadow-inner">
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
                  <span className="w-2 h-2 rounded-full bg-neutral-400" />
                  <span className="text-neutral-300">Buffered</span>
                </>
              )}
            </div>

            {/* Pill-shaped Countdown Timer */}
            <div className={`flex items-center gap-2 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full border text-xs font-bold tracking-wider transition-all ${
              timeLeft < 300 
                ? 'bg-rose-950/60 text-rose-300 border-rose-500/50 animate-pulse shadow-lg shadow-rose-950/50' 
                : 'bg-neutral-900 text-white border-neutral-800 shadow-inner'
            }`}>
              <svg className="w-3.5 h-3.5 text-neutral-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-mono text-xs sm:text-sm font-black text-white">{formatTime(timeLeft)}</span>
              <span className="text-[10px] text-neutral-500 font-normal hidden xl:inline">remaining</span>
            </div>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={async () => {
                try {
                  if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                    setIsFullscreen(true);
                  } else {
                    await document.exitFullscreen();
                    setIsFullscreen(false);
                  }
                } catch (err) {
                  console.warn(err);
                }
              }}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              className="p-1.5 sm:p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors hidden sm:flex items-center justify-center cursor-pointer shadow-xs"
            >
              {isFullscreen ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>

            {/* Finish Button */}
            <button 
              onClick={() => handleFinishTest(false)}
              className="text-xs font-extrabold text-black bg-white hover:bg-neutral-200 border border-white px-3 sm:px-4 py-1.5 rounded-xl transition-all shadow-md whitespace-nowrap flex items-center gap-1 cursor-pointer"
            >
              <span>Submit</span>
              <span>→</span>
            </button>
          </div>

          {/* Linear Progress Bar along bottom of Header */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-neutral-900 overflow-hidden">
            <div 
              className="h-full bg-striped-emerald transition-all duration-300"
              style={{
                width: `${questions.length > 0 ? ((answeredCount + ansMarkedCount) / questions.length) * 100 : 0}%`
              }}
            />
          </div>
        </header>

        {tabSwitchWarning && (
          <div className="bg-rose-600 text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-200 sticky top-[57px] z-30">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{tabSwitchWarning}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setTabSwitchWarning(null)}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-bold transition-colors ml-4 shrink-0"
            >
              Acknowledge
            </button>
          </div>
        )}

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
          {/* Question Palette Sidebar (GATE / JEE / CAT Standard) */}
          <aside className="w-72 shrink-0 hidden lg:block">
            <div className="bg-[#0a0c10] p-5 rounded-3xl border border-neutral-800 shadow-xl h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-neutral-800">
                  <h2 className="text-xs font-black text-white uppercase tracking-wider">
                    Question Palette
                  </h2>
                  <span className="text-xs font-bold text-neutral-300 bg-neutral-900 px-2.5 py-0.5 rounded-full border border-neutral-800">
                    {answeredCount + ansMarkedCount} / {questions.length} Ans
                  </span>
                </div>

                {/* State Counters Summary Grid */}
                <div className="grid grid-cols-2 gap-1.5 mb-4 text-[11px] font-bold">
                  <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
                    <span className="w-4 h-4 rounded-md bg-emerald-500 text-black flex items-center justify-center text-[10px] font-black shrink-0">{answeredCount}</span>
                    <span className="truncate">Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-rose-950/40 text-rose-300 border border-rose-500/30">
                    <span className="w-4 h-4 rounded-md bg-rose-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">{notAnsweredCount}</span>
                    <span className="truncate">Not Answered</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-purple-950/40 text-purple-300 border border-purple-500/30">
                    <span className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">{markedCount}</span>
                    <span className="truncate">Marked Review</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-purple-950/70 text-purple-200 border border-purple-500/40">
                    <span className="w-4 h-4 rounded-md bg-purple-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 relative">
                      {ansMarkedCount}
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    </span>
                    <span className="truncate">Ans & Marked</span>
                  </div>
                </div>

                {/* Question Numbers Grid */}
                <div className="max-h-[340px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-4 gap-2">
                    {questions.map((q, i) => {
                      const qId = q.id;
                      const isAns = answers[qId] !== undefined && answers[qId] !== "" && !(Array.isArray(answers[qId]) && answers[qId].length === 0);
                      const isVis = visited.has(qId) || i === currentQuestion;
                      const isMrk = markedForReview.has(qId);
                      const isActive = i === currentQuestion;

                      let style = "bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white";
                      let badge = null;

                      if (isAns && isMrk) {
                        style = "bg-purple-900 text-purple-100 border-purple-600 shadow-sm";
                        badge = <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-black" />;
                      } else if (isMrk) {
                        style = "bg-purple-950/80 text-purple-300 border-purple-700 rounded-full shadow-sm";
                      } else if (isAns) {
                        style = "bg-emerald-950/80 text-emerald-300 border-emerald-700 shadow-sm";
                      } else if (isVis) {
                        style = "bg-rose-950/80 text-rose-300 border-rose-800 shadow-sm";
                      }

                      const ringClass = isActive ? "ring-2 ring-white ring-offset-2 ring-offset-[#0a0c10] scale-105 z-10 font-black" : "";

                      return (
                        <button
                          key={qId}
                          onClick={() => jumpToQuestion(i)}
                          className={`h-9 w-full rounded-xl font-bold text-xs flex items-center justify-center transition-all border relative ${style} ${ringClass}`}
                        >
                          {badge}
                          <span>{i + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Legend Footer */}
              <div className="pt-3 mt-3 border-t border-neutral-800 text-[10px] text-neutral-500 font-medium text-center">
                <span>Click any question number to jump directly</span>
              </div>
            </div>
          </aside>

          {/* Main Question Container */}
          <div className="flex-1">
            <div className="bg-[#0a0c10] rounded-3xl border border-neutral-800 shadow-xl p-6 sm:p-9 min-h-[540px] flex flex-col justify-between">
              <div>
                {/* Question Header Badge & Autosave Confirmation */}
                <div className="flex flex-wrap justify-between items-center gap-2 mb-6 pb-4 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white bg-neutral-900 px-3 py-1 rounded-full uppercase tracking-wider border border-neutral-800">
                      Question {currentQuestion + 1} of {questions.length}
                    </span>
                    {questions[currentQuestion].category && (
                      <span className="text-xs font-bold text-neutral-400 bg-neutral-900 px-2.5 py-1 rounded-full border border-neutral-800">
                        {questions[currentQuestion].category}
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-neutral-500">
                      (+{questions[currentQuestion].points || 1} / -{questions[currentQuestion].negativePoints || 0} pts)
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Autosaved ✓</span>
                    </span>

                    <button 
                      onClick={toggleMarkForReview}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                        markedForReview.has(questions[currentQuestion].id) 
                          ? "bg-purple-950/80 text-purple-300 border-purple-500/40 shadow-sm" 
                          : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800"
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill={markedForReview.has(questions[currentQuestion].id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      {markedForReview.has(questions[currentQuestion].id) ? "Marked" : "Mark Review"}
                    </button>
                  </div>
                </div>

                {/* Real-time Tab Switch Warning Banner */}
                {tabSwitchWarning && (
                  <div className="mb-6 p-3.5 bg-amber-950/50 border border-amber-500/40 text-amber-300 rounded-2xl text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{tabSwitchWarning}</span>
                    </div>
                    <button 
                      onClick={() => setTabSwitchWarning(null)}
                      className="text-amber-400 hover:text-white text-[11px] font-extrabold ml-3"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Question Stem */}
                <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug mb-6">
                  {questions[currentQuestion].text}
                </h2>

                {questions[currentQuestion].imageUrl && (
                  <div className="mb-6">
                    <img 
                      src={questions[currentQuestion].imageUrl} 
                      alt="Question illustration" 
                      className="max-h-72 rounded-2xl border border-neutral-800 shadow-sm select-none pointer-events-none"
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
                        <div className="text-lg font-medium text-neutral-200 leading-relaxed bg-[#0d0f14] p-6 rounded-2xl border border-neutral-800">
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
                                    const nextObj = { ...currentObj, [blankId]: e.target.value };
                                    handleAnswerSelect(nextObj, q.id);
                                  }}
                                  className="inline-block w-36 mx-2 px-3 py-1.5 border-b-2 border-white bg-neutral-900 outline-none text-center font-bold text-white transition-colors focus:bg-neutral-800 rounded-t-lg"
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
                        <div className="bg-[#0d0f14] p-6 rounded-2xl border border-neutral-800 max-w-sm">
                          <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Enter your numerical answer:</label>
                          <input
                            type="number"
                            step="any"
                            value={answers[q.id] || ""}
                            onChange={(e) => handleAnswerSelect(e.target.value, q.id)}
                            className="w-full px-4 py-3 bg-neutral-900 border-2 border-neutral-800 rounded-xl focus:border-white focus:ring-0 outline-none text-xl font-mono font-bold text-white"
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

                      const optionLabel = String.fromCharCode(65 + idx); // A, B, C, D

                      return (
                        <label
                          key={idx}
                          className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group select-none ${
                            isChecked 
                              ? "border-white bg-neutral-800 text-white font-semibold shadow-sm" 
                              : "border-neutral-800 bg-[#0d0f14] hover:bg-neutral-900 text-neutral-200 hover:border-neutral-700"
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-xl border flex items-center justify-center font-bold text-xs transition-all ${
                            isChecked 
                              ? "border-white bg-white text-black font-black" 
                              : "border-neutral-700 bg-neutral-800 text-neutral-300 group-hover:border-neutral-600"
                          }`}>
                            {optionLabel}
                          </div>

                          <input
                            type={qType === "MCQ_MULTI" ? "checkbox" : "radio"}
                            name={`q-${q.id}`}
                            value={optText}
                            checked={isChecked}
                            onChange={() => {
                              if (qType === "MCQ_MULTI") {
                                const current = answers[q.id] || [];
                                let next = [];
                                if (current.includes(optText)) {
                                  next = current.filter((x: string) => x !== optText);
                                } else {
                                  next = [...current, optText];
                                }
                                handleAnswerSelect(next, q.id);
                              } else {
                                handleAnswerSelect(optText, q.id);
                              }
                            }}
                            className="sr-only"
                          />
                          {opt.imageUrl && (
                            <img src={opt.imageUrl} alt="Option attachment" className="h-12 w-12 object-cover rounded-xl shadow-sm border border-neutral-800" />
                          )}
                          <span className="text-sm font-medium leading-relaxed flex-1">
                            {optText}
                          </span>
                        </label>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Navigation Action Toolbar */}
              <div className="flex flex-wrap justify-between items-center gap-3 pt-6 border-t border-neutral-800">
                <div className="flex items-center gap-2">
                  {config.allowBackNavigation !== false && (
                    <button 
                      onClick={handlePrev}
                      disabled={currentQuestion === 0}
                      className="px-5 py-2.5 rounded-xl border border-neutral-800 text-neutral-300 font-bold text-xs hover:bg-neutral-900 disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center gap-1.5"
                    >
                      <span>←</span>
                      <span>Previous</span>
                    </button>
                  )}

                  <button
                    onClick={handleClearResponse}
                    disabled={!answers[questions[currentQuestion]?.id]}
                    className="px-4 py-2.5 rounded-xl border border-neutral-800 text-neutral-400 font-bold text-xs hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-800/60 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-all flex items-center gap-1.5"
                    title="Clear current answer choice"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Clear Selection</span>
                  </button>
                </div>
                
                <div className="flex items-center gap-2.5">
                  <button 
                    onClick={handleMarkForReviewAndNext}
                    className="px-5 py-2.5 rounded-xl bg-purple-950/40 text-purple-300 hover:bg-purple-900/50 border border-purple-500/30 font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span>Mark Review & Next</span>
                  </button>

                  {currentQuestion === questions.length - 1 ? (
                    <button
                      onClick={() => handleFinishTest(false)}
                      className="px-7 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Submit Assessment</span>
                    </button>
                  ) : (
                    <button 
                      onClick={handleNext}
                      className="px-7 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
                    >
                      <span>Save & Next</span>
                      <span>→</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0a0c10] rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-in fade-in zoom-in duration-200 border border-neutral-800">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center mx-auto mb-4 border border-neutral-800">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-extrabold text-white mb-2 text-center">Submit Assessment?</h3>
            <p className="text-neutral-400 text-xs text-center mb-6 leading-relaxed">
              Are you sure you want to finish? You will not be able to revisit or modify your answers.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 px-4 py-2.5 text-xs font-bold text-neutral-300 bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors border border-neutral-800"
              >
                Cancel
              </button>
              <button 
                onClick={executeSubmit}
                className="flex-1 px-4 py-2.5 text-xs font-extrabold text-black bg-white hover:bg-neutral-200 rounded-xl transition-colors shadow-md"
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
