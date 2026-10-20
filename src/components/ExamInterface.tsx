"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { submitExamAction, saveDraftAnswerAction, batchSyncDraftAnswersAction } from "@/app/actions/exam";
import { logCheatSignalAction } from "@/app/actions/cheat";
import { getAttemptStatusAction, getAttemptDeadlineAction } from "@/app/actions/attempt";
import { setCachedAttemptStatus, getCachedAttemptStatus } from "@/lib/exam-cache";
import { useServerTime } from "@/hooks/useServerTime";
import { saveDraftAnswersToIndexedDB, getDraftAnswersFromIndexedDB, clearDraftAnswersFromIndexedDB } from "@/lib/indexed-db";
import { detectVirtualMachine, createExtensionGuardian } from "@/lib/anti-cheat-detector";
import { getMascotById } from "@/lib/mascots";
import { ExamReviewModal } from "@/components/ExamReviewModal";
import CandidateScorecardView from "@/components/CandidateScorecardView";
import { CandidateTopbar, CandidateFooter } from "@/components/candidate/CandidateChrome";
import { Flower } from "@/components/owner/OpsPanels";
import { SecureLaunchOverlay } from "@/components/candidate/SecureLaunchOverlay";

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
  initialAnswers = {},
  mascotId = null,
  isGamified = false,
}: { 
  candidateName: string; 
  session: any; 
  attempt: any; 
  dbQuestions: any[];
  initialAnswers?: Record<string, string>;
  mascotId?: string | null;
  isGamified?: boolean;
}) {
  const chosenMascot = isGamified && mascotId ? getMascotById(mascotId) : null;
  const [hasStarted, setHasStarted] = useState(false);
  const [isSecuring, setIsSecuring] = useState(false);
  const [secureStep, setSecureStep] = useState(0);
  const [secureError, setSecureError] = useState<string | null>(null);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [proctorArming, setProctorArming] = useState(true);
  const [armedAt, setArmedAt] = useState<string | null>(null);
  useEffect(() => {
    const id = setTimeout(() => {
      setProctorArming(false);
      setArmedAt(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    }, 2800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>(initialAnswers);
  const [syncStatus, setSyncStatus] = useState<"saved" | "syncing" | "cached">("saved");
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
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
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [submittingReason, setSubmittingReason] = useState<string>("");
  // Submission delivery diagnostics: rendered on the submitting screen itself
  // so a stalled/hanging upload is visible without opening DevTools.
  const [submitStage, setSubmitStage] = useState<"sending" | "failed">("sending");
  const [submitErrorCode, setSubmitErrorCode] = useState<string>("");
  const [submitSeconds, setSubmitSeconds] = useState(0);
  const submitResendRef = useRef<(() => Promise<{ delivered: boolean; detail: string }>) | null>(null);
  
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finalTotalMarks, setFinalTotalMarks] = useState<number | null>(null);
  const [detailedResults, setDetailedResults] = useState<any[] | null>(null);
  const [cohortData, setCohortData] = useState<any | null>(null);
  const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false);
  const [isConcurrentLockout, setIsConcurrentLockout] = useState(false);

  const initialTimeSpent = useMemo(() => {
    if (attempt.submittedAt && attempt.createdAt) {
      const diffSec = Math.round((new Date(attempt.submittedAt).getTime() - new Date(attempt.createdAt).getTime()) / 1000);
      return Math.min(session.durationMinutes * 60, Math.max(1, diffSec));
    }
    return null;
  }, [attempt.submittedAt, attempt.createdAt, session.durationMinutes]);

  const [finalTimeSpent, setFinalTimeSpent] = useState<number | null>(initialTimeSpent);

  const [currentExtendedUntil, setCurrentExtendedUntil] = useState<Date | null>(
    attempt.extendedUntil ? new Date(attempt.extendedUntil) : (session.extendedUntil ? new Date(session.extendedUntil) : null)
  );

  const clientDeviceIdRef = useRef<string>("");

  // Pre-exam system diagnostics state
  // null = browser can't report (e.g. Safari masks displays/VM) - shown as
  // Unknown, never as a false Healthy.
  const [diagnostics, setDiagnostics] = useState<{
    ping: number | null;
    battery: { charging: boolean; level: number } | null;
    isSingleScreen: boolean | null;
    screenRes: string;
    isVM: boolean;
    vmKnown: boolean;
    vmRenderer: string;
    isChecking: boolean;
  }>({
    ping: null,
    battery: null,
    isSingleScreen: null,
    screenRes: typeof window !== "undefined" ? `${window.screen.width}×${window.screen.height}` : "1920×1080",
    isVM: false,
    vmKnown: false,
    vmRenderer: "",
    isChecking: true,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storageKey = `aptix_device_id_${attempt.id}`;
      let devId = sessionStorage.getItem(storageKey);
      if (!devId) {
        devId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `dev_${Date.now()}_${Math.random()}`;
        sessionStorage.setItem(storageKey, devId);
      }
      clientDeviceIdRef.current = devId;
    }

    // 1. Run Pre-flight Terminal Diagnostic Checks
    const runDiagnostics = async () => {
      let measuredPing: number | null = null;
      try {
        const t0 = performance.now();
        await fetch("/api/time", { cache: "no-store" });
        measuredPing = Math.round(performance.now() - t0);
      } catch {
        measuredPing = null;
      }

      let battInfo: { charging: boolean; level: number } | null = null;
      try {
        if (typeof navigator !== "undefined" && (navigator as any).getBattery) {
          const b = await (navigator as any).getBattery();
          battInfo = { charging: b.charging, level: Math.round(b.level * 100) };
        }
      } catch {}

      const vm = detectVirtualMachine();
      if (vm.isVM) {
        logCheatSignalAction(session.id, "VIRTUAL_MACHINE", `Virtual machine / sandbox detected (${vm.renderer || vm.vendor}).`);
      }

      const extFlag = typeof window !== "undefined" ? (window.screen as any)?.isExtended : undefined;
      const resStr = typeof window !== "undefined" ? `${window.screen.width}×${window.screen.height}` : "Standard";

      setDiagnostics({
        ping: measuredPing,
        battery: battInfo,
        isSingleScreen: extFlag === undefined ? null : !extFlag,
        screenRes: resStr,
        isVM: vm.isVM,
        vmKnown: vm.confidence !== "NONE",
        vmRenderer: vm.renderer,
        isChecking: false,
      });
    };

    runDiagnostics();

    // ── Owner "Reset exam" generation check ────────────────────────────────
    // A reset re-shuffles the seed on the SAME attempt id, so any browser cache
    // (IndexedDB drafts / localStorage crash buffer / start stamp) written
    // BEFORE the reset is stale and must be discarded.
    const currentSeed = String(attempt.shuffleSeed ?? "");
    const genKey = `aptix_attempt_gen_${attempt.id}`;
    try {
      const recorded = localStorage.getItem(genKey);
      if (recorded && currentSeed && recorded !== currentSeed) {
        clearDraftAnswersFromIndexedDB(attempt.id).catch(() => {});
        localStorage.removeItem(`aptix_attempt_${attempt.id}`);
        localStorage.removeItem(`aptix_attempt_start_${attempt.id}`);
      }
      if (currentSeed) localStorage.setItem(genKey, currentSeed);
    } catch {}

    // 2. Load cached draft answers from IndexedDB for crash recovery
    getDraftAnswersFromIndexedDB(attempt.id).then((offlineData) => {
      if (offlineData && offlineData.answers && Object.keys(offlineData.answers).length > 0) {
        setAnswers((prev) => {
          const merged = { ...offlineData.answers, ...prev };
          answersRef.current = merged;
          return merged;
        });
        if (offlineData.timeSpent) {
          timeSpentRef.current = { ...offlineData.timeSpent, ...timeSpentRef.current };
        }
        setIsRecovered(true);
      }
    });
  }, [attempt.id, session.id]);

  const answersRef = useRef(answers);
  const timeSpentRef = useRef<Record<string, number>>({});
  const isFinishingRef = useRef(isAlreadySubmitted);
  const blurCountRef = useRef(0);           // All infractions (for logging)
  const tabSwitchCountRef = useRef(0);      // Only WINDOW_BLUR tab switches (for limit enforcement)
  const lastInfractionTimestampRef = useRef<number>(0);
  const lastFocusLossAtRef = useRef<number>(0); // unified focus-loss dedup clock
  const hiddenAtRef = useRef<number>(0); // for duration-away logging
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const executeSubmitRef = useRef<((msg?: string) => Promise<void>) | null>(null);
  const timeUpRef = useRef(false); // mirrors shouldAutoSubmit without stale closures
  const recalcTimeRef = useRef<(() => void) | null>(null); // foreground timer recalc

  const config = useMemo(() => {
    try {
      return session.configSnapshot ? JSON.parse(session.configSnapshot) : {};
    } catch {
      return {};
    }
  }, [session.configSnapshot]);

  const resultVisibility = useMemo(() => {
    return (config.resultVisibility || session.exam?.resultVisibility || "IMMEDIATE") as "IMMEDIATE" | "AFTER_RELEASE" | "NEVER";
  }, [config.resultVisibility, session.exam?.resultVisibility]);

  const [resultsReleased, setResultsReleased] = useState(Boolean(config.resultsReleased));

  const canViewResults = useMemo(() => {
    if (resultVisibility === "IMMEDIATE") return true;
    if (resultVisibility === "AFTER_RELEASE" || resultVisibility === "NEVER") return resultsReleased;
    return false;
  }, [resultVisibility, resultsReleased]);

  const candidateRoll = useMemo(() => {
    return session.pin ? `PIN-${session.pin}` : (attempt.id ? `ID-${String(attempt.id).slice(-8).toUpperCase()}` : "NB2026-0418");
  }, [session.pin, attempt.id]);

  useEffect(() => { 
    answersRef.current = answers; 
  }, [answers]);

  // Stamp the last successful cloud sync for the telemetry banner
  useEffect(() => {
    if (syncStatus === "saved") setLastSyncedAt(new Date());
  }, [syncStatus]);

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
      const doc = document as any;
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement));
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
    // Same generation check as above: discard the localStorage crash buffer
    // written before an owner reset (fresh shuffle seed on the same attempt).
    try {
      const genKey2 = `aptix_attempt_gen_${attempt.id}`;
      const recorded2 = localStorage.getItem(genKey2);
      const seed2 = String(attempt.shuffleSeed ?? "");
      if (recorded2 && seed2 && recorded2 !== seed2) {
        localStorage.removeItem(`aptix_attempt_${attempt.id}`);
        localStorage.removeItem(`aptix_attempt_start_${attempt.id}`);
      }
    } catch {}
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

  // Debounced Autosave to Server + Instant Local Storage & IndexedDB Mirror
  const handleAnswerSelect = useCallback((optValue: any, explicitQId?: string) => {
    if (isFinished || isFinishingRef.current || timeUpRef.current) return;
    const qId = explicitQId || questions[currentQuestion]?.id;
    if (!qId) return;

    setAnswers(prev => {
      const next = { ...prev, [qId]: optValue };
      answersRef.current = next;

      // 1. Instant local persistence (LocalStorage + Asynchronous IndexedDB)
      try {
        localStorage.setItem(`aptix_attempt_${attempt.id}`, JSON.stringify(next));
      } catch (e) {}
      saveDraftAnswersToIndexedDB(attempt.id, next, timeSpentRef.current).catch(() => {});

      return next;
    });

    setSyncStatus("syncing");

    // 2. Debounced background flush to PostgreSQL / SQLite
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (timeUpRef.current || isFinishingRef.current) return;
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

  // Full checkpoint synchronization across network drops / offline reconnects
  const flushPendingAnswers = useCallback(async () => {
    if (isFinished || isFinishingRef.current || timeUpRef.current) return;
    try {
      const stringifiedAnswers: Record<string, string> = {};
      for (const [k, v] of Object.entries(answersRef.current)) {
        stringifiedAnswers[k] = typeof v === "string" ? v : JSON.stringify(v);
      }
      const res = await batchSyncDraftAnswersAction(attempt.id, stringifiedAnswers, timeSpentRef.current);
      if (res && res.success) {
        setSyncStatus("saved");
      }
    } catch (e) {
      console.warn("[Aptix Resilience] Pending sync delayed, buffered locally", e);
    }
  }, [attempt.id, isFinished]);

  // Network Recovery Listener: Auto-flush offline buffer immediately upon WiFi / Internet reconnection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushPendingAnswers();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus("cached");
    };

    const handleBeforeUnload = () => {
      try {
        const stringifiedAnswers: Record<string, string> = {};
        for (const [k, v] of Object.entries(answersRef.current)) {
          stringifiedAnswers[k] = typeof v === "string" ? v : JSON.stringify(v);
        }
        localStorage.setItem(`aptix_attempt_${attempt.id}`, JSON.stringify(stringifiedAnswers));
      } catch (e) {}
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Periodic 30-second resilience check: Flushes any unsynced offline state
    const periodicFlush = setInterval(() => {
      if (syncStatus === "cached" && typeof navigator !== "undefined" && navigator.onLine) {
        flushPendingAnswers();
      }
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearInterval(periodicFlush);
    };
  }, [flushPendingAnswers, syncStatus, attempt.id]);

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
    if (isFinished || isFinishingRef.current || timeUpRef.current) return;
    const qId = questions[currentQuestion]?.id;
    if (!qId) return;

    let updatedNext: Record<string, any> = {};
    setAnswers(prev => {
      const next = { ...prev };
      delete next[qId];
      updatedNext = next;
      return next;
    });

    const localKey = `aptix_attempt_${attempt.id}`;
    try {
      const local = JSON.parse(localStorage.getItem(localKey) || "{}");
      delete local[qId];
      localStorage.setItem(localKey, JSON.stringify(local));
    } catch {}

    saveDraftAnswersToIndexedDB(attempt.id, updatedNext, timeSpentRef.current).catch(() => {});
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
    if (isFinished || isAlreadySubmitted) return;

    const calculateTimes = () => {
      const now = getServerTime();
      const rawStart = session.startTime ? new Date(session.startTime).getTime() : null;

      // Scheduled session: waiting for start time
      if (sessionStatus === "SCHEDULED" && rawStart && now < rawStart && !isForcedLive) {
        setTimeUntilStart(Math.floor((rawStart - now) / 1000));
        setTimeLeft(session.durationMinutes * 60);
        return;
      }

      setTimeUntilStart(0);

      // Check if candidate previously started (crash recovery / page refresh)
      const storageStart = typeof window !== "undefined" ? localStorage.getItem(`aptix_attempt_start_${attempt.id}`) : null;

      // If candidate has NOT started yet and has no recorded start time:
      if (!hasStarted && !storageStart) {
        // Freeze allotted time at full duration while on guidelines/readiness
        setTimeLeft(session.durationMinutes * 60);
        return;
      }

      // Candidate has started (either currently or recovered from previous start)
      let attemptStart: number;
      if (storageStart) {
        attemptStart = Number(storageStart);
      } else {
        attemptStart = now;
        if (typeof window !== "undefined") {
          localStorage.setItem(`aptix_attempt_start_${attempt.id}`, String(now));
        }
      }

      const baseEnd = attemptStart + (session.durationMinutes * 60 * 1000);
      const end = currentExtendedUntil ? currentExtendedUntil.getTime() : baseEnd;

      if (now < end) {
        setTimeLeft(Math.floor((end - now) / 1000));
      } else {
        setTimeLeft(0);
        timeUpRef.current = true;
        if (!isFinished && hasStarted) setShouldAutoSubmit(true);
      }
    };

    recalcTimeRef.current = calculateTimes;
    calculateTimes();
    const timer = setInterval(calculateTimes, 1000);
    return () => clearInterval(timer);
  }, [session, currentExtendedUntil, isFinished, hasStarted, isForcedLive, sessionStatus, synced, getServerTime, attempt.id]);

  // ── Submission watchdog + dual transports ────────────────────────────────
  // Never let the submit screen spin forever: every delivery attempt is raced
  // against a hard timeout. The action is idempotent (re-submitting an already
  // SUBMITTED attempt just returns isSubmitted:true), and abandoned attempts
  // are auto-closed by the server-side sweeper, so a failure can be retried.
  const SUBMIT_TIMEOUT_MS = 45_000;

  const sendSubmission = useCallback(async (
    attemptId: string,
    answersPayload: Record<string, string>,
    timeSpentPayload: Record<string, number>,
    clientStartedAtMs?: number
  ): Promise<{ delivered: boolean; detail: string }> => {
    const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
      Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
        ),
      ]);
    const inspect = (r: any): { delivered: boolean; detail: string } => {
      if (!r) return { delivered: true, detail: "" };
      if (r.success) return { delivered: true, detail: "" };
      if (r.isSubmitted) return { delivered: true, detail: r.error || "Assessment already closed." };
      if (r.error) return { delivered: false, detail: r.error };
      return { delivered: true, detail: "" };
    };

    // Transport 1: Next server action.
    let firstDetail = "";
    try {
      const r = await withTimeout(
        submitExamAction(attemptId, answersPayload, timeSpentPayload, clientStartedAtMs),
        SUBMIT_TIMEOUT_MS,
        "Submission (server action)"
      );
      const v = inspect(r);
      if (v.delivered) return v;
      firstDetail = v.detail;
    } catch (err1) {
      console.error("[submit] server action transport failed, trying HTTP fallback...", err1);
    }

    // Transport 2: plain HTTP POST route (bypasses the server-action transport).
    try {
      const res = await withTimeout(
        fetch("/api/exam/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId, answers: answersPayload, timeSpent: timeSpentPayload, clientStartedAtMs }),
          keepalive: true,
        }),
        SUBMIT_TIMEOUT_MS,
        "Submission (HTTP fallback)"
      );
      const r = await res.json().catch(() => null);
      if (!res.ok && !r) throw new Error(`HTTP fallback responded ${res.status}`);
      return inspect(r);
    } catch (err2) {
      console.error("[submit] HTTP fallback also failed:", err2);
      return {
        delivered: false,
        detail: firstDetail || (err2 instanceof Error ? err2.message : "network unreachable"),
      };
    }
  }, []);

  // Finishing sequence after a confirmed delivery (or a manual Continue):
  // clear drafts, exit fullscreen, show the completion screen.
  const completeSubmitFlow = useCallback(async () => {
    clearDraftAnswersFromIndexedDB(attempt.id).catch(() => {});

    // Guaranteed sequence: SUBMIT FIRST, THEN EXIT FULLSCREEN
    if (typeof document !== "undefined") {
      const doc = document as any;
      if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement) {
        try {
          if (doc.exitFullscreen) {
            await doc.exitFullscreen().catch(() => {});
          } else if (doc.webkitExitFullscreen) {
            await doc.webkitExitFullscreen();
          } else if (doc.mozCancelFullScreen) {
            await doc.mozCancelFullScreen();
          } else if (doc.msExitFullscreen) {
            await doc.msExitFullscreen();
          }
        } catch (e) {}
      }
    }
    setIsFullscreen(false);
    setIsFinished(true);
    setIsSubmittingExam(false);
    setSubmitStage("sending");
    setSubmitErrorCode("");

    if (canViewResults) {
      const statusData = await getAttemptStatusAction(attempt.id, clientDeviceIdRef.current);
      if (statusData && statusData.score !== null) {
        setFinalScore(statusData.score);
        setFinalTotalMarks(statusData.totalMarks);
        if (statusData.detailedResults) {
          setDetailedResults(statusData.detailedResults);
        }
        if (statusData.cohort) {
          setCohortData(statusData.cohort);
        }
        if (statusData.timeTakenSeconds) {
          setFinalTimeSpent(statusData.timeTakenSeconds);
        }
      }
    }
  }, [attempt.id, canViewResults]);

  const executeSubmit = useCallback(async (reasonMessage?: string) => {
    if (isFinishingRef.current || isFinished) return;
    // Always update the ref so anti-cheat listeners always call latest version
    // (ref is updated below after definition)
    isFinishingRef.current = true;
    // Freeze everything instantly: kill pending debounced saves and mark the
    // attempt submitted in the local deadline cache so nothing can write
    // mid-submit while the network request is still loading.
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    try {
      // Preserve the REAL deadline instead of stamping "now" — collapsing the
      // timer would flip the render into the "Time Has Expired" branch.
      const cached = getCachedAttemptStatus(attempt.id);
      setCachedAttemptStatus(attempt.id, {
        userId: attempt.userId,
        effectiveEndMs: cached?.effectiveEndMs ?? (
          currentExtendedUntil
            ? new Date(currentExtendedUntil).getTime()
            : (session.startTime && session.durationMinutes
                ? new Date(session.startTime).getTime() + session.durationMinutes * 60_000
                : Date.now() + 60_000)
        ),
        isSubmitted: true,
      });
    } catch {}
    setIsSubmittingExam(true);
    if (reasonMessage) {
      setSubmittingReason(reasonMessage);
    }
    setShowSubmitConfirm(false);
    
    // Stamp startedAt from localStorage before clearing it
    let clientStartedAtMs: number | undefined;
    try {
      const storedStart = localStorage.getItem(`aptix_attempt_start_${attempt.id}`);
      if (storedStart) clientStartedAtMs = Number(storedStart);
      localStorage.removeItem(`aptix_attempt_start_${attempt.id}`);
    } catch (e) {}

    const stringifiedAnswers: Record<string, string> = {};
    for (const [k, v] of Object.entries(answersRef.current)) {
      stringifiedAnswers[k] = typeof v === "string" ? v : JSON.stringify(v);
    }
    
    const finalElapsed = session.durationMinutes
      ? Math.max(1, session.durationMinutes * 60 - timeLeft)
      : (attempt.createdAt ? Math.round((Date.now() - new Date(attempt.createdAt).getTime()) / 1000) : 180);
    setFinalTimeSpent(finalElapsed);

    setSubmitStage("sending");
    setSubmitErrorCode("");
    const delivery = await sendSubmission(attempt.id, stringifiedAnswers, timeSpentRef.current, clientStartedAtMs);
    submitResendRef.current = () =>
      sendSubmission(attempt.id, stringifiedAnswers, timeSpentRef.current, clientStartedAtMs);
    if (!delivery.delivered) {
      // Both transports failed — keep the diagnostic screen up with manual
      // Resend / Continue controls instead of faking a completion.
      console.error("[submit] delivery failed on both transports:", delivery.detail);
      setSubmitErrorCode(delivery.detail || "Both submission transports failed.");
      setSubmitStage("failed");
      return;
    }
    await completeSubmitFlow();
  }, [attempt.id, canViewResults, isFinished, session.durationMinutes, timeLeft, attempt.createdAt, sendSubmission, completeSubmitFlow]);

  // Always keep ref in sync so stale closure never prevents auto-submit
  useEffect(() => { executeSubmitRef.current = executeSubmit; }, [executeSubmit]);

  // Elapsed-seconds ticker for the submitting screen (visible time diagnostics).
  useEffect(() => {
    if (!isSubmittingExam) {
      setSubmitSeconds(0);
      return;
    }
    const t = setInterval(() => setSubmitSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [isSubmittingExam]);

  // ── Deadline re-sync ─────────────────────────────────────────────────────
  // Extensions applied by the owner while this tab is open never reach the
  // initially server-rendered props, so the candidate countdown would drift
  // from the owner monitor (e.g. monitor 25:03 vs exam 10:xx). Re-sync the
  // effective deadline every 30 seconds; the timer effect below reacts to
  // any currentExtendedUntil change instantly.
  useEffect(() => {
    if (!hasStarted) return;
    const poll = async () => {
      // Only skip while a submission is genuinely in flight. isFinishingRef
      // stays true forever after a finished submit, so guarding on it here
      // would block the reset-recovery check below on the finished screen.
      if (isSubmittingExam) return;
      try {
        const res = await getAttemptDeadlineAction(attempt.id);
        if (!res || res.error || res.isSubmitted) return;
        // Owner re-opened this attempt after "Reset exam": the client showing a
        // finished screen must follow the server and run the fresh attempt.
        if (isFinished) {
          window.location.reload();
          return;
        }
        if (res.extendedUntil) {
          const nextMs = new Date(res.extendedUntil).getTime();
          setCurrentExtendedUntil(prev =>
            !prev || new Date(prev).getTime() < nextMs ? new Date(nextMs) : prev
          );
        }
      } catch {}
    };
    poll();
    const t = setInterval(poll, 30_000);
    return () => clearInterval(t);
  }, [hasStarted, isFinished, isSubmittingExam, attempt.id]);

  useEffect(() => {
    if (shouldAutoSubmit && !isFinishingRef.current) {
      isFinishingRef.current = true; // Set synchronously before the async call
      (executeSubmitRef.current ?? executeSubmit)("Assessment time expired. Automatically submitting...");
    }
  }, [shouldAutoSubmit, executeSubmit]);

  // Submitting lock overlay: the instant submit starts, block every
  // pointer interaction so answers can't change while loading.
  const submittingLock = isSubmittingExam && (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-[2px]" role="alert" aria-live="assertive">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0d0f14] px-6 py-4 shadow-2xl">
        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        <span className="text-sm font-bold text-white">Submitting… answers locked</span>
      </div>
    </div>
  );

  const handleFinishTest = useCallback(async (force = false) => {
    if (force) {
      executeSubmit("Assessment concluded. Finalizing submission...");
    } else {
      setShowSubmitConfirm(true);
    }
  }, [executeSubmit]);

  // Anti-cheating Telemetry Listeners (strictly active ONLY while hasStarted && !isFinished)
  useEffect(() => {
    if (!hasStarted || isFinished || isFinishingRef.current) return;

    const handleSecurityInfraction = (
      type: "WINDOW_BLUR" | "FULLSCREEN_EXIT" | "COPY_PASTE" | "DEV_TOOLS" | "CONTEXT_MENU" | "MULTI_MONITOR" | "CONCURRENT_SESSION", 
      description: string
    ) => {
      if (isFinishingRef.current || isFinished || !hasStarted) return;

      const now = Date.now();
      const isFocusLoss = type === "WINDOW_BLUR" || type === "FULLSCREEN_EXIT";

      // ── Unified focus-loss counting ──────────────────────────────────────
      // One physical gesture (Alt-Tab, minimize, fullscreen exit) fires
      // window.blur + visibilitychange + fullscreenchange together, sometimes
      // straddling a second boundary. Collapse anything inside a 1.5s window
      // into a single infraction so counts match reality in both directions.
      if (isFocusLoss) {
        if (now - lastFocusLossAtRef.current < 1500) return;
        lastFocusLossAtRef.current = now;
        lastInfractionTimestampRef.current = now;
      }

      // ── Global infraction counter (for logging only) ───────────────────────────
      blurCountRef.current += 1;
      const totalInfractions = blurCountRef.current;

      // ── Focus-loss counter (for limit enforcement) ─────────────────────────
      // Both tab switches AND fullscreen exits consume the same budget.
      // Right-clicks, copy attempts, and F12 presses do NOT eat the budget.
      if (isFocusLoss) {
        tabSwitchCountRef.current += 1;
      }
      const tabSwitchCount = tabSwitchCountRef.current;

      // Default 5 when the template never set a limit; explicit 0 = unlimited.
      const parsedLimit = parseInt(String(config.tabSwitchLimit ?? ""), 10);
      const tabLimit = isNaN(parsedLimit) ? 5 : parsedLimit;

      // Log cheat signal to database in real-time
      logCheatSignalAction(session.id, type, `${description} (Focus loss #${tabSwitchCount}, Total infraction #${totalInfractions}).`);

      if (type === "FULLSCREEN_EXIT" && config.autoSubmitOnFullscreenExit) {
        // Owner explicitly armed instant submit on fullscreen exit
        if (!isFinishingRef.current) {
          isFinishingRef.current = true;
          const msg = "Exited full-screen mode. Assessment automatically submitted.";
          setTabSwitchWarning(msg);
          (executeSubmitRef.current ?? executeSubmit)(msg);
        }
      } else if (tabLimit > 0 && isFocusLoss) {
        // ── Focus-loss limit enforcement ───────────────────────────────────────
        if (tabSwitchCount >= tabLimit) {
          if (!isFinishingRef.current) {
            isFinishingRef.current = true;
            const msg = `Focus-loss limit reached (${tabSwitchCount}/${tabLimit}). Auto-submitting assessment now.`;
            setTabSwitchWarning(msg);
            (executeSubmitRef.current ?? executeSubmit)(msg);
          }
        } else {
          setTabSwitchWarning(
            `Focus Warning: Focus loss ${tabSwitchCount}/${tabLimit} recorded. ` +
            `Reaching ${tabLimit} will automatically submit your exam.`
          );
        }
      } else {
        // Non-focus-loss infraction, or unlimited budget: warn but don't auto-submit
        if (!isFocusLoss || tabLimit === 0) {
          setTabSwitchWarning(`Security Alert: Infraction #${totalInfractions} logged to examiner (${description}).`);
        }
      }
    };

    // Extended / Multi-monitor Detection
    const checkMultiMonitor = () => {
      if (typeof window !== "undefined" && (window.screen as any)?.isExtended === true) {
        handleSecurityInfraction("MULTI_MONITOR", "Candidate connected multiple displays / extended monitors");
      }
    };
    checkMultiMonitor();
    if (typeof window !== "undefined" && (window.screen as any)?.addEventListener) {
      try {
        (window.screen as any).addEventListener("change", checkMultiMonitor);
      } catch (_) {}
    }

    const handleBlur = () => {
      handleSecurityInfraction("WINDOW_BLUR", "Candidate switched away from exam window or tab");
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        handleSecurityInfraction("WINDOW_BLUR", "Candidate minimized window or navigated to another tab");
      } else {
        // Log how long the candidate was away (info only, no extra budget)
        const awayMs = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
        hiddenAtRef.current = 0;
        if (awayMs >= 10000 && !isFinishingRef.current && !isFinished && hasStarted) {
          logCheatSignalAction(session.id, "WINDOW_BLUR", `Candidate returned after ${Math.round(awayMs / 1000)}s away.`);
        }
        // Background throttling stalls setInterval: recompute deadline immediately
        // on return so expired candidates submit instead of gaining free time.
        try {
          recalcTimeRef.current?.();
        } catch {}
      }
    };

    const handleFullscreenChange = () => {
      if (isFinishingRef.current || isFinished || !hasStarted) return;
      if (config.requireFullscreen === false) return;
      
      const doc = document as any;
      const activeFs = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
      if (!activeFs) {
        setIsFullscreen(false);
        handleSecurityInfraction("FULLSCREEN_EXIT", "Candidate exited full-screen mode");
      } else {
        setIsFullscreen(true);
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      if (config.disableCopyPaste !== false) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        try {
          if (e.clipboardData) {
            e.clipboardData.setData("text/plain", "");
          }
        } catch (_) {}
        handleSecurityInfraction("COPY_PASTE", "Candidate attempted to copy assessment content");
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (config.disableCopyPaste !== false) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleSecurityInfraction("COPY_PASTE", "Candidate attempted to paste content into assessment");
      }
    };

    const handleCut = (e: ClipboardEvent) => {
      if (config.disableCopyPaste !== false) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        try {
          if (e.clipboardData) {
            e.clipboardData.setData("text/plain", "");
          }
        } catch (_) {}
        handleSecurityInfraction("COPY_PASTE", "Candidate attempted to cut content from assessment");
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      handleSecurityInfraction("CONTEXT_MENU", "Candidate opened right-click context menu");
      return false;
    };

    const handleAuxClick = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleSecurityInfraction("CONTEXT_MENU", "Candidate attempted right-click via pointer button");
        return false;
      }
    };

    const handleSelectStart = (e: Event) => {
      if (config.disableCopyPaste !== false) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (typeof window !== "undefined") {
          window.getSelection()?.removeAllRanges();
        }
        return false;
      }
    };

    const handleSelectionChange = () => {
      if (config.disableCopyPaste !== false && typeof window !== "undefined") {
        const sel = window.getSelection();
        if (sel && sel.toString().length > 0) {
          sel.removeAllRanges();
        }
      }
    };

    // Lock down oncontextmenu property to prevent extensions from unsetting it (e.g. document.oncontextmenu = null)
    try {
      Object.defineProperty(document, "oncontextmenu", {
        get: () => handleContextMenu,
        set: () => {},
        configurable: true,
      });
      Object.defineProperty(window, "oncontextmenu", {
        get: () => handleContextMenu,
        set: () => {},
        configurable: true,
      });
    } catch (_) {}

    const handleKeyDown = (e: KeyboardEvent) => {
      // Intercept F12 and common DevTools shortcuts (Windows/Linux: Ctrl+Shift+I/J/C, Ctrl+U; Mac: Cmd+Option+I/J/C, Cmd+Option+U)
      const isMacDevTools = (e.metaKey && e.altKey && ["i", "j", "c", "u"].includes(e.key.toLowerCase())) ||
                            (e.metaKey && e.shiftKey && ["c", "i", "j"].includes(e.key.toLowerCase()));
      const isWinDevTools = e.key === "F12" ||
                            (e.ctrlKey && (e.key === "u" || e.key === "U")) ||
                            (e.ctrlKey && e.shiftKey && ["I", "i", "J", "j", "C", "c"].includes(e.key));

      if (isMacDevTools || isWinDevTools) {
        e.preventDefault();
        handleSecurityInfraction("DEV_TOOLS", "Candidate attempted to open browser developer tools / inspect elements");
      }

      // Block PrintScreen capture key (Windows) and macOS screenshot shortcuts (Cmd+Shift+3/4/5)
      const isMacScreenshot = e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key);
      if (e.key === "PrintScreen" || e.code === "PrintScreen" || isMacScreenshot) {
        e.preventDefault();
        try {
          if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText("");
          }
        } catch (_) {}
        handleSecurityInfraction("COPY_PASTE", isMacScreenshot ? "Candidate attempted screen capture via macOS shortcut (Cmd+Shift)" : "Candidate attempted screen capture via PrintScreen key");
      }

      // Block Ctrl+P (Print/PDF export), Ctrl+S (Save page), Ctrl+A (Select all)
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === "p") {
          e.preventDefault();
          handleSecurityInfraction("COPY_PASTE", "Candidate attempted to print or export page via Ctrl+P");
        } else if (key === "s") {
          e.preventDefault();
          handleSecurityInfraction("DEV_TOOLS", "Candidate attempted to save assessment webpage via Ctrl+S");
        } else if (key === "a" && config.disableCopyPaste !== false) {
          e.preventDefault();
          handleSecurityInfraction("COPY_PASTE", "Candidate attempted to select all content via Ctrl+A");
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || e.code === "PrintScreen") {
        try {
          if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText("");
          }
        } catch (_) {}
        handleSecurityInfraction("COPY_PASTE", "Candidate attempted screen capture via PrintScreen key");
      }
    };

    const captureActive = { capture: true, passive: false };
    const capturePassive = { capture: true, passive: true };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    // Safari/iPad fire only prefixed variants - without these the paused
    // overlay never syncs on Apple devices.
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    // Capture-phase registration on window AND document to execute before extension content scripts
    window.addEventListener("contextmenu", handleContextMenu, captureActive);
    document.addEventListener("contextmenu", handleContextMenu, captureActive);
    window.addEventListener("auxclick", handleAuxClick, captureActive);
    document.addEventListener("auxclick", handleAuxClick, captureActive);
    window.addEventListener("pointerdown", handleAuxClick, captureActive);
    document.addEventListener("pointerdown", handleAuxClick, captureActive);

    window.addEventListener("copy", handleCopy, captureActive);
    document.addEventListener("copy", handleCopy, captureActive);
    window.addEventListener("paste", handlePaste, captureActive);
    document.addEventListener("paste", handlePaste, captureActive);
    window.addEventListener("cut", handleCut, captureActive);
    document.addEventListener("cut", handleCut, captureActive);

    document.addEventListener("selectstart", handleSelectStart, captureActive);
    document.addEventListener("selectionchange", handleSelectionChange, capturePassive);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const cleanupGuardian = createExtensionGuardian((extName) => {
      handleSecurityInfraction("DEV_TOOLS", `Unauthorized third-party AI or helper extension detected: ${extName}`);
    });

    return () => {
      cleanupGuardian();
      try {
        delete (document as any).oncontextmenu;
        delete (window as any).oncontextmenu;
      } catch (_) {}

      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);

      window.removeEventListener("contextmenu", handleContextMenu, captureActive);
      document.removeEventListener("contextmenu", handleContextMenu, captureActive);
      window.removeEventListener("auxclick", handleAuxClick, captureActive);
      document.removeEventListener("auxclick", handleAuxClick, captureActive);
      window.removeEventListener("pointerdown", handleAuxClick, captureActive);
      document.removeEventListener("pointerdown", handleAuxClick, captureActive);

      window.removeEventListener("copy", handleCopy, captureActive);
      document.removeEventListener("copy", handleCopy, captureActive);
      window.removeEventListener("paste", handlePaste, captureActive);
      document.removeEventListener("paste", handlePaste, captureActive);
      window.removeEventListener("cut", handleCut, captureActive);
      document.removeEventListener("cut", handleCut, captureActive);

      document.removeEventListener("selectstart", handleSelectStart, captureActive);
      document.removeEventListener("selectionchange", handleSelectionChange, capturePassive);

      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (typeof window !== "undefined" && (window.screen as any)?.removeEventListener) {
        try {
          (window.screen as any).removeEventListener("change", checkMultiMonitor);
        } catch (_) {}
      }
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
    setSecureError(null);
    setSecureStep(0);
    setIsSecuring(true);
    const statusData = await getAttemptStatusAction(attempt.id, clientDeviceIdRef.current);
    if (statusData?.concurrentSessionDetected) {
      setIsConcurrentLockout(true);
      setIsSecuring(false);
      return;
    }
    setSecureStep(1);

    if (diagnostics.isVM) {
      logCheatSignalAction(session.id, "VIRTUAL_MACHINE", `Candidate launched assessment from a virtualized environment (${diagnostics.vmRenderer}).`);
    }

    if (config.requireFullscreen !== false) {
      try {
        const el = document.documentElement as any;
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        } else if (el.mozRequestFullScreen) {
          await el.mozRequestFullScreen();
        } else if (el.msRequestFullscreen) {
          await el.msRequestFullscreen();
        }
        setIsFullscreen(true);
      } catch (err) {
        console.warn("Fullscreen request failed", err);
      }
    }
    setSecureStep(2);

    // Server clock must be synced - it decides the deadline, not this device
    if (!synced) {
      setSecureError("Could not reach the server clock. Check your connection and try again.");
      setIsSecuring(false);
      return;
    }
    setSecureStep(3);

    // Crash-recovery buffer must be writable before answers flow
    if (typeof indexedDB === "undefined") {
      setSecureError("Crash-recovery storage is unavailable in this browser. Use Chrome or Edge on desktop.");
      setIsSecuring(false);
      return;
    }
    setSecureStep(4);

    if (typeof window !== "undefined") {
      const startKey = `aptix_attempt_start_${attempt.id}`;
      if (!localStorage.getItem(startKey)) {
        localStorage.setItem(startKey, String(Date.now()));
      }
    }

    setHasStarted(true);
    setSecureStep(5);
    // Monitors arm on hasStarted; hold the finished card briefly so the
    // candidate sees lockdown complete, then enter the paper.
    setTimeout(() => {
      setIsSecuring(false);
      setSecureStep(0);
    }, 800);
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      const statusData = await getAttemptStatusAction(attempt.id, clientDeviceIdRef.current);
      if (!statusData) return;
      
      if (statusData.concurrentSessionDetected) {
        setIsConcurrentLockout(true);
        if (typeof document !== "undefined") {
          const doc = document as any;
          try {
            if (doc.exitFullscreen && (doc.fullscreenElement || doc.webkitFullscreenElement)) {
              (doc.fullscreenElement ? doc.exitFullscreen() : doc.webkitExitFullscreen()).catch(() => {});
            } else if (doc.webkitExitFullscreen && doc.webkitFullscreenElement) {
              doc.webkitExitFullscreen();
            }
          } catch {}
        }
        return;
      }

      setSessionStatus(statusData.sessionStatus);

      if (statusData.canViewResults !== undefined) {
        if (statusData.canViewResults) {
          setResultsReleased(true);
          if (statusData.score !== null) setFinalScore(statusData.score);
          if (statusData.totalMarks) setFinalTotalMarks(statusData.totalMarks);
          if (statusData.detailedResults) setDetailedResults(statusData.detailedResults);
          if (statusData.timeTakenSeconds) setFinalTimeSpent(statusData.timeTakenSeconds);
          if (statusData.cohort) setCohortData(statusData.cohort);
        } else if (!statusData.canViewResults && resultsReleased) {
          setResultsReleased(false);
        }
      }

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
    }, isFinished || isAlreadySubmitted ? 3000 : 8000);
    return () => clearInterval(interval);
  }, [attempt.id, isFinished, isAlreadySubmitted, hasStarted, timeUntilStart, handleFinishTest, resultsReleased]);

  // Scorecard retrieval if submitted and results are allowed to be viewed
  useEffect(() => {
    if (isAlreadySubmitted && canViewResults) {
      getAttemptStatusAction(attempt.id, clientDeviceIdRef.current).then((statusData) => {
        if (statusData && statusData.score !== null) {
          setFinalScore(statusData.score);
          setFinalTotalMarks(statusData.totalMarks);
          if (statusData.detailedResults) {
            setDetailedResults(statusData.detailedResults);
          }
          if (statusData.cohort) {
            setCohortData(statusData.cohort);
          }
          if (statusData.timeTakenSeconds) {
            setFinalTimeSpent(statusData.timeTakenSeconds);
          }
        }
      });
    }
  }, [isAlreadySubmitted, canViewResults, attempt.id]);

  const handleReturnToLogin = () => {
    if (typeof document !== "undefined") {
      try {
        const doc = document as any;
        if (doc.fullscreenElement && doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.mozFullScreenElement && doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        }
      } catch (e) {}
    }
    try {
      localStorage.removeItem(`aptix_attempt_${attempt.id}`);
      localStorage.removeItem(`aptix_attempt_start_${attempt.id}`);
    } catch (e) {}
    clearDraftAnswersFromIndexedDB(attempt.id).catch(() => {});
    window.location.href = "/api/auth/logout";
  };

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

  if (isConcurrentLockout) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6 selection:bg-rose-500 selection:text-white">
        <div className="bg-[#0e0a0d] p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center border border-rose-900/50">
          <div className="w-16 h-16 bg-rose-950/60 text-rose-400 border border-rose-500/40 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-950/30">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-3.5a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/30 text-rose-300 text-[11px] font-bold tracking-wider uppercase mb-3">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            Security Lockdown
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mb-3">
            Concurrent Session Detected
          </h1>
          <p className="text-neutral-400 text-xs font-medium leading-relaxed mb-6">
            This examination attempt is actively running in another browser tab, window, or separate device. Simultaneous multi-tab or multi-device sessions are strictly prohibited to ensure assessment integrity.
          </p>
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 text-left mb-6 text-xs text-neutral-400 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-500 font-medium">Candidate:</span>
              <span className="text-neutral-200 font-bold">{candidateName}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-500 font-medium">Security Signal:</span>
              <span className="text-rose-400 font-bold">Flagged & Logged to Examiner</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-500 font-medium">Resolution:</span>
              <span className="text-neutral-300">Close other tabs or contact your proctor</span>
            </div>
          </div>
          <button
            onClick={handleReturnToLogin}
            className="w-full py-3.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-2xl transition duration-200 text-xs tracking-wider uppercase border border-neutral-700"
          >
            Return to Login
          </button>
        </div>
      </main>
    );
  }

  // 1. If candidate has completed/submitted the exam
  if (isFinished || isAlreadySubmitted) {
    const timeSpentCalculated = finalTimeSpent !== null
      ? finalTimeSpent
      : (session.durationMinutes ? Math.max(1, session.durationMinutes * 60 - timeLeft) : 180);

    // If candidate is allowed to view results and score is loaded, show the full Scorecard
    if (canViewResults && finalScore !== null) {
      return (
        <CandidateScorecardView
          candidateName={candidateName}
          candidateRoll={candidateRoll}
          examTitle={session.exam?.title || session.title || "Quantitative Aptitude"}
          examCode={session.exam?.code || "ENG-26"}
          dateStr={new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          attemptNumber={attempt.attemptNumber || 1}
          finalScore={finalScore}
          totalMarks={finalTotalMarks}
          timeTakenSeconds={timeSpentCalculated}
          allottedMinutes={session.durationMinutes || 60}
          questions={questions}
          answers={answers}
          detailedResults={detailedResults || []}
          timeSpent={timeSpentRef.current}
          cohort={cohortData}
          onReturnToLogin={handleReturnToLogin}
        />
      );
    }

    // If candidate is allowed to view results but score is still compiling right after submission
    if (canViewResults && finalScore === null) {
      return (
        <main className="min-h-screen bg-black text-white flex items-center justify-center selection:bg-white selection:text-black">
          <div className="flex flex-col items-center bg-[#0a0c10] p-8 rounded-2xl shadow-2xl border border-neutral-800">
            <div className="w-10 h-10 border-2 border-white/20 border-t-lime-400 rounded-full animate-spin mb-4"></div>
            <p className="text-white font-bold text-sm tracking-wide">Compiling Scorecard...</p>
            <p className="text-neutral-400 text-xs mt-1">Calculating verified grades & cohort standings</p>
          </div>
        </main>
      );
    }

    // Results are withheld / hidden (resultVisibility === "NEVER" or pending "AFTER_RELEASE")
    const mins = Math.floor(timeSpentCalculated / 60);
    const secs = timeSpentCalculated % 60;
    const timeFormatted = `${mins}m ${String(secs).padStart(2, "0")}s`;
    const answeredCountTotal = Object.values(answers).filter(v => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)).length;
    const isPendingRelease = resultVisibility === "AFTER_RELEASE";

    return (
      <div className="min-h-screen bg-[#060607] text-white flex flex-col font-sans selection:bg-lime-400 selection:text-black">
        <CandidateTopbar candidateName={candidateName} roll={candidateRoll} />
        
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-10 flex items-center justify-center">
          <div className="w-full bg-[#0c0d12] rounded-3xl border border-white/10 p-6 sm:p-10 shadow-2xl relative overflow-hidden text-center space-y-6">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-lime-400/10 blur-3xl pointer-events-none rounded-full" />
            
            {/* Checkmark Badge */}
            <div className="w-20 h-20 rounded-3xl bg-lime-300/10 border border-lime-300/30 flex items-center justify-center text-lime-300 mx-auto shadow-xl shadow-lime-950/50 relative">
              <svg className="w-10 h-10 text-lime-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-300/10 border border-lime-300/25 text-lime-300 text-[11px] font-mono font-bold tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                <span>Responses Recorded</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Assessment Submitted Successfully
              </h1>
              <p className="text-neutral-400 text-xs sm:text-sm font-medium leading-relaxed max-w-lg mx-auto">
                {isPendingRelease
                  ? "Your examination attempt has concluded and your responses are safely locked. Results for this assessment will appear automatically once released by the instructor in the live monitor."
                  : "Your examination attempt has concluded and your responses are safely recorded. Results for this assessment are withheld by the instructor."}
              </p>
            </div>

            {/* Assessment Meta Box */}
            <div className="bg-black/50 border border-white/10 rounded-2xl p-5 text-left space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="text-[10px] font-mono font-bold tracking-wider uppercase text-neutral-500">Assessment</p>
                  <p className="text-sm font-bold text-white mt-0.5">{session.exam?.title || session.title || "Assessment"}</p>
                </div>
                <span className="text-xs font-mono font-bold text-lime-300 bg-lime-300/10 border border-lime-300/20 px-2.5 py-1 rounded-lg">
                  SUBMITTED
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <p className="text-[10px] font-mono text-neutral-500 uppercase">Questions Attempted</p>
                  <p className="text-base font-bold text-white mt-0.5 font-mono">
                    {answeredCountTotal} <span className="text-xs text-neutral-500 font-normal">/ {questions.length}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-neutral-500 uppercase">Time Spent</p>
                  <p className="text-base font-bold text-white mt-0.5 font-mono">{timeFormatted}</p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-mono text-neutral-500 uppercase">Result Policy</p>
                  <p className="text-xs font-bold text-neutral-300 mt-1">
                    {isPendingRelease ? "Pending Release by Instructor" : "Withheld by Instructor"}
                  </p>
                </div>
              </div>
            </div>

            {/* Security Guarantee Note */}
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-neutral-400 text-left">
              <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Cryptographic hash stored. Local draft answers cleared. You may safely exit.</span>
            </div>

            {/* Exit Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleReturnToLogin}
                className="w-full py-3.5 bg-white hover:bg-neutral-200 text-black font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Exit Assessment Hall</span>
              </button>
            </div>
          </div>
        </main>

        <CandidateFooter />
      </div>
    );
  }

  // 2. If the exam session itself is already COMPLETED (or closed by administrator)
  if (sessionStatus === "COMPLETED" || session.status === "COMPLETED") {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 selection:bg-white selection:text-black">
        <div className="bg-[#0a0c10] p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border border-neutral-800">
          <div className="w-16 h-16 bg-neutral-900 text-neutral-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-neutral-800 shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] font-bold tracking-widest text-neutral-400 uppercase mb-3">
            <span>Assessment Concluded</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">{session.exam.title}</h1>
          <p className="text-neutral-400 text-xs font-medium max-w-sm mx-auto mb-8 leading-relaxed">
            This examination session has concluded and is no longer accepting new attempts or submissions.
          </p>
          <button
            type="button"
            onClick={handleReturnToLogin}
            className="w-full py-3.5 bg-white hover:bg-neutral-200 text-black font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Return to Login</span>
          </button>
        </div>
      </main>
    );
  }

  // 3. Waiting for administrator to broadcast/launch the session
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
            <span>APTIX Assessment Hall</span>
          </div>
          <h2 className="text-2xl font-black mb-2 tracking-tight text-white">{session.exam.title}</h2>
          <p className="text-neutral-400 text-sm mb-8 font-medium">Waiting for your test administrator to broadcast and launch the session...</p>
          <div className="w-10 h-10 border-2 border-neutral-700 border-t-white rounded-full animate-spin mx-auto mb-8"></div>
          <p className="text-xs text-neutral-500 mb-6">Live listener active. This screen will auto-refresh when launched.</p>
          
          <button
            type="button"
            onClick={handleReturnToLogin}
            className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 px-4 py-2.5 rounded-xl transition-all border border-neutral-800 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Return to Login</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. Countdown to scheduled start
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
          <p className="text-xs text-neutral-500 mb-6">Please remain on this screen. The assessment will unlock automatically.</p>
          
          <button
            type="button"
            onClick={handleReturnToLogin}
            className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 px-4 py-2.5 rounded-xl transition-all border border-neutral-800 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Return to Login</span>
          </button>
        </div>
      </div>
    );
  }

  // 5. If allotted time has expired (whether started or not) — but never while
  // a submission is in flight: the deadline-cache freeze legitimately zeroes
  // the local timer, and the submitting/finished screens must win instead.
  if (timeLeft <= 0 && !isFinishingRef.current) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 selection:bg-white selection:text-black">
        <div className="bg-[#0a0c10] p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border border-neutral-800">
          <div className="w-16 h-16 bg-amber-950/40 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Time Has Expired</h1>
          <p className="text-neutral-400 text-xs font-medium max-w-sm mx-auto mb-8 leading-relaxed">
            The allotted examination time for this session has completed.
          </p>
          <button
            type="button"
            onClick={handleReturnToLogin}
            className="w-full py-3.5 bg-white hover:bg-neutral-200 text-black font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Return to Login</span>
          </button>
        </div>
      </main>
    );
  }

  // 6. Onboarding / Guidelines screen (ONLY shown when exam is open and candidate has not clicked start yet)
  if (!hasStarted && timeUntilStart <= 0 && timeLeft > 0) {
    const marksPerQ = session.exam?.marksPerQuestion ?? (session.totalMarks > 0 && questions.length > 0 ? (session.totalMarks / questions.length) : 1);
    const totalMarksPreview = session.totalMarks || session.exam?.totalMarks || (questions.length * marksPerQ);
    const passPct = Math.round(session.exam?.passCriteria ?? config.passCriteria ?? 50);
    const domainLock = session.allowedEmailDomain || session.exam?.allowedEmailDomain;
    const cleanDescription = (session.exam?.description || "").replace(/\[MODE:GAMIFIED\]/g, "").trim();
    const startLabel = session.startTime
      ? new Date(session.startTime).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" })
      : "Window opens at launch";
    const negLine = config.negativeMarkingEnabled && (config.negativeMarksValue ?? 0.25) > 0
      ? `-${config.negativeMarksValue ?? 0.25} negative marking`
      : "No negative marking";
    const rollId = attempt.id ? `ID-${String(attempt.id).slice(-8).toUpperCase()}` : "CANDIDATE";
    const readiness: { label: string; sub: string; state: "READY" | "OPEN" | "LIMITED" }[] = [
      { label: "Institution domain", sub: domainLock ? `@${String(domainLock).replace(/^@/, "")} enforced` : "Open entry · any verified email", state: "READY" },
      { label: "Server time", sub: synced ? "NTP calibrated · authoritative" : "Calibrating…", state: synced ? "READY" : "LIMITED" },
      { label: "Fullscreen", sub: config.requireFullscreen === false ? "Not required for this exam" : "Request at launch", state: "READY" },
      { label: "Single-device session", sub: "Lease verified on start", state: "READY" },
      { label: "Local recovery storage", sub: typeof indexedDB !== "undefined" ? "IndexedDB available" : "Memory buffer only", state: typeof indexedDB !== "undefined" ? "READY" : "LIMITED" },
      { label: "Multiple displays", sub: diagnostics.isSingleScreen === null ? "Unknown on this browser" : diagnostics.isSingleScreen ? "Single display detected" : "Extended displays detected", state: diagnostics.isSingleScreen === null ? "LIMITED" : diagnostics.isSingleScreen ? "READY" : "LIMITED" },
    ];
    return (
      <div className="min-h-[111vh] bg-[#060607] text-neutral-100 flex flex-col font-sans select-none">
        <CandidateTopbar candidateName={candidateName} roll={rollId} />
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-4">
          <div className="flex items-center justify-between gap-6 px-1 pt-1">
            <div>
              <h1 className="text-3xl sm:text-[40px] font-black text-white tracking-tight leading-none">
                Ready when you are<span className="text-lime-300">.</span>
              </h1>
            </div>
            <Flower className="w-10 h-10 sm:w-12 sm:h-12 shrink-0" />
          </div>

          <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
            <div className="space-y-4">
              {/* Assessment card */}
              <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-white">{session.exam?.title || "Assessment"}</h2>
                    <p className="text-[10px] text-neutral-500 mt-1">KIET Deemed to be University · Engineering cohort 2026</p>
                  </div>
                  <span className="text-[9px] font-black tracking-[0.14em] text-neutral-300 bg-white/[0.06] border border-white/10 rounded-full px-2.5 py-1 whitespace-nowrap">
                    SECURE ASSESSMENT
                  </span>
                </div>

                {/* 4 Key Metrics */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { v: String(questions.length), s: "Questions" },
                    { v: `${session.durationMinutes} min`, s: "Duration" },
                    { v: String(Math.round(totalMarksPreview)), s: "Total Marks" },
                    { v: `${passPct}%`, s: "Pass Criteria" },
                  ].map((c, i) => (
                    <div key={i} className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <p className="text-xl sm:text-2xl font-black text-white tabular-nums">{c.v}</p>
                      <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mt-1">{c.s}</p>
                    </div>
                  ))}
                </div>

                {/* Meta details strip */}
                <div className="mt-4 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-neutral-400">
                    <span className="text-neutral-300 font-medium">{startLabel}</span>
                    <span className="text-neutral-600">·</span>
                    <span className="text-neutral-300">{negLine}</span>
                    <span className="text-neutral-600">·</span>
                    <span>+{marksPerQ} pts per question (0 for unattempted)</span>
                  </div>

                  {cleanDescription ? (
                    <p className="text-xs text-neutral-300 leading-relaxed bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                      {cleanDescription}
                    </p>
                  ) : null}

                  {session.exam?.instructions ? (
                    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 space-y-1">
                      <p className="text-[10px] font-black tracking-wider uppercase text-lime-300">
                        Exam Instructions
                      </p>
                      <p className="text-xs text-neutral-200 leading-relaxed whitespace-pre-line">
                        {session.exam.instructions}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Rules */}
              <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
                <h3 className="text-[13px] font-bold text-white mb-3">Know the rules</h3>
                <div className="space-y-3">
                  {[
                    ["01", "Keep this exam in fullscreen", config.requireFullscreen === false ? "Fullscreen is optional for this exam. Focus changes are still recorded." : "Do not switch tabs or windows. Focus changes are recorded."],
                    ["02", "One person. One session.", "Only this tab and one device may hold your exam lease. A second session is blocked."],
                    ["03", "No external assistance", "No calculators, notes, messaging, or unauthorized resources. Optional hardware and display checks depend on your browser."],
                    ["04", "The deadline is authoritative", "When the timer carries you, saved answers are submitted automatically. A refresh does not reset time."],
                  ].map(([n, t, d]) => (
                    <div key={n} className="flex gap-3">
                      <span className="text-[10px] font-mono font-bold text-lime-200/80 pt-0.5 shrink-0">{n}</span>
                      <div>
                        <p className="text-xs font-bold text-white">{t}</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">{d}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-[#f2a488]/[0.06] border border-[#f2a488]/20 p-3">
                  <p className="text-[11px] font-bold text-[#f2a488]">⚠ Real-Time Anti-Cheat Proctoring Active</p>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Unapproved tab switching, window minimization, or unauthorized peripheral changes trigger security warnings and can result in automatic exam termination. All events are logged for faculty review.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Readiness */}
              <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-bold text-white">System readiness</h3>
                  <span className={`text-[9px] font-bold tracking-[0.14em] ${proctorArming ? "text-neutral-500 animate-pulse" : "text-neutral-600"}`}>
                    {proctorArming ? "ARMING PROCTORS" : `CHECKED ${armedAt ?? "--:--:--"}`}
                  </span>
                </div>
                {proctorArming ? (
                  <div className="py-10 flex flex-col items-center justify-center text-center gap-3">
                    <span className="w-8 h-8 rounded-full border-2 border-white/10 border-t-lime-300 animate-spin" />
                    <p className="text-[13px] font-black text-white tracking-tight">Preparing proctoring…</p>
                    <p className="text-[11px] text-neutral-400 max-w-[240px] leading-relaxed">
                      Arming the tab-switch guard, single-device lease and integrity monitor. Every attempt in this room is recorded and reviewed.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {readiness.map((r) => (
                      <div key={r.label} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-neutral-200">{r.label}</p>
                          <p className="text-[10px] text-neutral-500 truncate">{r.sub}</p>
                        </div>
                        <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded shrink-0 ${r.state === "READY" ? "text-lime-200 bg-lime-300/10" : r.state === "OPEN" ? "text-neutral-300 bg-white/[0.06]" : "text-[#f2a488] bg-[#f2a488]/10"}`}>
                          {r.state === "READY" ? "READY" : r.state === "OPEN" ? "OPEN" : "CHECK"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cleared */}
              <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
                <h3 className="text-[13px] font-bold text-white">You&rsquo;re cleared to begin</h3>
                <label className="mt-3 flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={rulesAccepted} onChange={(e) => setRulesAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#bef264]" />
                  <span className="text-[11px] text-neutral-300 leading-relaxed">I have read the instructions and agree to the assessment policies.</span>
                </label>
                <button
                  onClick={startExamFullscreen}
                  disabled={!rulesAccepted}
                  className="mt-3 w-full py-3 rounded-xl bg-lime-300 hover:brightness-110 text-black font-black text-xs transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <span>→ Enter fullscreen &amp; start exam</span>
                </button>
                <p className="mt-2.5 text-[10px] text-neutral-600 leading-relaxed">
                  Fullscreen is verified at launch and monitored; timer starts automatically and endures after a crash. Offline time does not extend the deadline.
                </p>
              </div>
            </div>
          </div>
        </main>
        <CandidateFooter />
      </div>
    );
  }

  if (isSubmittingExam || (isFinishingRef.current && !isFinished)) {
    const failed = submitStage === "failed";
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6 selection:bg-lime-400 selection:text-black">
        <div className="bg-[#0a0c10] p-10 rounded-3xl max-w-lg w-full text-center shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-200">
          {failed ? (
            <div className="w-16 h-16 bg-rose-950/60 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/30">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          ) : (
            <div className="w-16 h-16 border-4 border-lime-400/20 border-t-lime-400 rounded-full animate-spin mx-auto mb-6" />
          )}
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
            {failed ? "Submission could not reach the server" : "Submitting Assessment"}
          </h2>
          {failed ? (
            <>
              <p className="text-neutral-400 text-sm mb-3 leading-relaxed">
                Your answers are locked for this attempt. The server auto-closes this attempt at the deadline, so no time is lost.
              </p>
              {submitErrorCode ? (
                <p className="text-[11px] font-mono text-rose-300/80 bg-rose-500/5 border border-rose-500/20 rounded-lg px-3 py-2 mb-5 break-words">
                  {submitErrorCode}
                </p>
              ) : null}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    setSubmitStage("sending");
                    setSubmitErrorCode("");
                    const result = submitResendRef.current ? await submitResendRef.current() : { delivered: false, detail: "" };
                    if (result.delivered) {
                      await completeSubmitFlow();
                    } else {
                      setSubmitStage("failed");
                      setSubmitErrorCode("Resend failed too. Your answers stay locked; the server auto-closes this attempt at the deadline.");
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-lime-300 hover:bg-lime-200 text-black font-extrabold text-xs transition-all"
                >
                  Resend submission
                </button>
                <button
                  type="button"
                  onClick={() => { completeSubmitFlow(); }}
                  className="px-5 py-2.5 rounded-xl border border-white/10 bg-[#0c0d12] hover:bg-white/5 text-neutral-300 font-bold text-xs transition-all"
                >
                  Continue
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-neutral-400 text-sm mb-4 leading-relaxed">
                {submittingReason || "Finalizing responses and securely synchronizing with examination servers..."}
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[11px] text-neutral-400 font-mono">
                <span>
                  {submitSeconds > 15
                    ? `Still finalizing — ${submitSeconds}s elapsed. A retry panel appears if the server can't be reached.`
                    : "Submitting exam securely before exiting fullscreen..."}
                </span>
            </div>
            </>
          )}
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
                const el = document.documentElement as any;
                if (el.requestFullscreen) {
                  await el.requestFullscreen();
                } else if (el.webkitRequestFullscreen) {
                  await el.webkitRequestFullscreen();
                } else if (el.mozRequestFullScreen) {
                  await el.mozRequestFullScreen();
                } else if (el.msRequestFullscreen) {
                  await el.msRequestFullscreen();
                }
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
          <button
            type="button"
            onClick={handleReturnToLogin}
            className="w-full py-3.5 bg-white hover:bg-neutral-200 text-black font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Return to Login</span>
          </button>
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
        {/* ── Top Navbar matching Figma ─────────────────────── */}
        <header className="h-14 shrink-0 border-b border-white/10 bg-[#060607] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          {/* Left: Branding */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center overflow-hidden shrink-0 rounded-lg bg-black/40 ring-1 ring-white/10">
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
            <span className="font-black text-[18px] tracking-tight text-white leading-none uppercase">
              APTIX
            </span>
            <span className="w-px h-4 bg-white/15 mx-1" />
            <span className="hidden sm:inline text-[11px] font-medium text-neutral-400">Assessment Platform</span>
          </div>

          {/* Center: University Badge */}
          <div className="hidden md:flex items-center">
            <span className="text-[10px] font-bold tracking-[0.14em] text-neutral-300 bg-white/[0.06] border border-white/10 rounded-full px-3.5 py-1 uppercase">
              KIET Deemed to be University
            </span>
          </div>

          {/* Right: Candidate Profile Pill */}
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-purple-600/80 border border-purple-400/30 text-white text-xs font-black flex items-center justify-center shrink-0">
              {candidateName ? candidateName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "AR"}
            </span>
            <div className="hidden sm:block leading-tight text-right">
              <span className="block text-xs font-bold text-white tracking-tight">{candidateName || "Ananya Rao"}</span>
              <span className="block text-[10px] text-neutral-400 font-mono">
                {session.pin ? `PIN-${session.pin}` : (attempt.id ? `ID-${String(attempt.id).slice(-8).toUpperCase()}` : "NB2026-0418")}
              </span>
            </div>
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

        {/* ── Subheader & Timer Bar matching Figma ────────── */}
        <div className="max-w-7xl mx-auto w-full px-4 md:px-8 pt-6 pb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {session.exam?.title || session.title || "Quantitative Aptitude · Q4"}
            </h1>
            <p className="text-xs text-neutral-400 font-mono mt-1 flex items-center gap-2">
              <span>{session.pin ? `PIN-${session.pin}` : (session.exam?.code || "ENG-26")}</span>
              <span>·</span>
              <span>Attempt {attempt.attemptNumber || 1}</span>
              <span>·</span>
              <span>{questions.length} questions</span>
              <span>·</span>
              <span className="text-emerald-400">Fullscreen active</span>
            </p>
          </div>

          {/* Server-calibrated countdown timer card */}
          <div className="bg-[#0c0d12] border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-4 shadow-xl">
            <div className="flex items-center gap-2.5 text-white">
              <svg className="w-6 h-6 text-lime-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" strokeWidth="2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 7v5l3 2" />
              </svg>
              <span className="text-3xl font-mono font-black tracking-tight text-white tabular-nums">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Main 2-Column Work Area ───────────────────────── */}
        <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 flex flex-col lg:flex-row gap-6">
          {/* Left Column: Question Card & Actions */}
          <div className="flex-1 flex flex-col justify-between min-w-0">
            {/* The Question Card */}
            <div className="bg-[#0c0d12] rounded-2xl border border-white/10 p-6 sm:p-8 shadow-2xl flex flex-col justify-between flex-1">
              <div>
                {/* Meta Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                  <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-3 py-1 bg-white/5 border border-white/10 rounded-md text-neutral-300">
                    QUESTION {currentQuestion + 1} / {questions.length}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">
                    {(() => {
                      const tq = questions[currentQuestion].type || "MCQ_SINGLE";
                      const kind = tq === "MCQ_MULTI" ? "Multiple choice" : tq === "FILL_BLANK" ? "Fill in the blanks" : tq === "NUMERIC" ? "Numerical entry" : "Single choice";
                      return `${kind} · +${questions[currentQuestion].points || 1} / -${questions[currentQuestion].negativePoints || 0}`;
                    })()}
                  </span>
                </div>

                {/* Question Stem */}
                <h2 className="text-xl sm:text-2xl font-semibold text-white leading-relaxed mb-4 question-stem-wrap break-words">
                  {questions[currentQuestion].text}
                </h2>

                {questions[currentQuestion].imageUrl && (
                  <div className="mb-6">
                    <img 
                      src={questions[currentQuestion].imageUrl} 
                      alt="Question illustration" 
                      className="max-h-72 rounded-xl border border-white/10 shadow-sm select-none pointer-events-none"
                    />
                  </div>
                )}

                <p className="text-xs text-neutral-400 font-medium mb-5">
                  {(() => {
                    const t = questions[currentQuestion].type || "MCQ_SINGLE";
                    return t === "MCQ_MULTI" ? "Select all that apply." : "Select one answer.";
                  })()}
                </p>

                {/* Question Options */}
                <div
                  className={`mb-8 ${(() => {
                    const t = questions[currentQuestion].type || "MCQ_SINGLE";
                    const isChoice = t === "MCQ_SINGLE" || t === "MCQ_MULTI";
                    // Auto-grid: choice questions with an illustration flow into
                    // two columns so the options stay visible without scrolling.
                    const hasImage = Boolean(questions[currentQuestion].imageUrl);
                    if (isChoice && hasImage) return "grid grid-cols-1 sm:grid-cols-2 gap-3 items-start";
                    return "space-y-3";
                  })()}`}
                >
                  {(() => {
                    const q = questions[currentQuestion];
                    const qType = q.type || "MCQ_SINGLE";
                    
                    if (qType === "FILL_BLANK") {
                      const textParts = q.text.split(/(\[\d+\])/g);
                      return (
                        <div className="text-lg font-medium text-neutral-200 leading-relaxed bg-white/[0.02] p-6 rounded-xl border border-white/10">
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
                                  className="inline-block w-36 mx-2 px-3 py-1.5 border-b-2 border-lime-400 bg-neutral-900 outline-none text-center font-bold text-white transition-colors focus:bg-neutral-800 rounded-t-lg"
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
                        <div className="bg-white/[0.02] p-6 rounded-xl border border-white/10 max-w-sm">
                          <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Enter your numerical answer:</label>
                          <input
                            type="number"
                            step="any"
                            value={answers[q.id] || ""}
                            onChange={(e) => handleAnswerSelect(e.target.value, q.id)}
                            className="w-full px-4 py-3 bg-neutral-900 border-2 border-white/10 rounded-xl focus:border-lime-400 focus:ring-0 outline-none text-xl font-mono font-bold text-white"
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
                          className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer select-none ${
                            isChecked 
                              ? "border-[#bef264] bg-[#bef264]/[0.04] text-white shadow-sm ring-1 ring-[#bef264]/40" 
                              : "border-white/10 bg-white/[0.01] hover:bg-white/[0.04] text-neutral-200 hover:border-white/20"
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-full border flex items-center justify-center font-bold text-xs transition-all shrink-0 ${
                            isChecked 
                              ? "border-[#bef264] text-[#bef264] font-black" 
                              : "border-white/20 text-neutral-400"
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
                          <span className="text-sm font-normal text-neutral-100 flex-1 leading-relaxed">
                            {optText}
                          </span>
                        </label>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Bottom Actions inside Question Card */}
              <div className="flex items-center justify-between pt-5 border-t border-white/10">
                <button
                  type="button"
                  onClick={toggleMarkForReview}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    markedForReview.has(questions[currentQuestion].id)
                      ? "bg-[#2c1d42] border-purple-500/60 text-purple-200"
                      : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span>{markedForReview.has(questions[currentQuestion].id) ? "✓ Marked for review" : "Marked for review"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearResponse}
                  disabled={!answers[questions[currentQuestion]?.id]}
                  className="text-xs font-medium text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 transition-colors cursor-pointer"
                >
                  Clear response
                </button>
              </div>
            </div>

            {/* Row below question card: Previous, Help text, Save & Next */}
            <div className="flex items-center justify-between gap-4 mt-6">
              {config.allowBackNavigation !== false ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentQuestion === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-[#0c0d12] hover:bg-white/5 disabled:opacity-25 text-neutral-300 font-bold text-xs transition-all cursor-pointer"
                >
                  <span>← Previous</span>
                </button>
              ) : <div />}

              {currentQuestion === questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setShowSubmitConfirm(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-lime-300 hover:bg-lime-200 text-black font-extrabold text-xs shadow-lg transition-all cursor-pointer"
                >
                  <span>Review & submit →</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-lime-300 hover:bg-lime-200 text-black font-extrabold text-xs shadow-lg transition-all cursor-pointer"
                >
                  <span>→ Save & next</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Question Navigator */}
          <aside className="w-80 shrink-0">
            <div className="bg-[#0c0d12] rounded-2xl border border-white/10 p-5 shadow-2xl flex flex-col justify-between h-full">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-bold text-white">Question navigator</h3>
                  <span className="text-xs font-mono font-bold text-neutral-400">
                    {answeredCount + ansMarkedCount} / {questions.length} SAVED
                  </span>
                </div>

                {/* 5-Column Grid */}
                <div className="grid grid-cols-5 gap-2.5 max-h-[380px] overflow-y-auto p-1.5">
                  {questions.map((q, i) => {
                    const qId = q.id;
                    const isAns = answers[qId] !== undefined && answers[qId] !== "" && !(Array.isArray(answers[qId]) && answers[qId].length === 0);
                    const isVis = visited.has(qId) || i === currentQuestion;
                    const isMrk = markedForReview.has(qId);
                    const isActive = i === currentQuestion;

                    let tileStyle = "bg-white/[0.02] border-white/10 text-neutral-400 hover:border-white/20";
                    if (isMrk) {
                      tileStyle = "bg-purple-600 border-purple-500 text-white font-bold hover:bg-purple-500";
                    } else if (isAns) {
                      tileStyle = "bg-green-600 border-green-500 text-white font-bold hover:bg-green-500";
                    } else if (isVis) {
                      tileStyle = "bg-neutral-900 border-neutral-700 text-neutral-300";
                    }

                    const activeRing = isActive ? "ring-2 ring-white ring-offset-2 ring-offset-[#0c0d12] text-white font-black z-10" : "";

                    return (
                      <button
                        type="button"
                        key={qId}
                        onClick={() => jumpToQuestion(i)}
                        className={`h-10 rounded-xl text-xs flex items-center justify-center transition-all border relative cursor-pointer ${tileStyle} ${activeRing}`}
                      >
                        <span>{i + 1}{isMrk ? "•" : ""}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Legend below grid */}
                <div className="mt-6 pt-5 border-t border-white/10 space-y-2 text-[11px] font-medium text-neutral-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Answered · {answeredCount + ansMarkedCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>Marked for review · {markedCount + ansMarkedCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full border border-neutral-400 bg-neutral-400/30" />
                    <span>Visited, unanswered · {notAnsweredCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full border border-neutral-600" />
                    <span>Unvisited · {Math.max(0, questions.length - (visited.size || 0))}</span>
                  </div>
                </div>
              </div>

              {/* Bottom: Review & Submit action */}
              <div className="mt-6 pt-5 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowSubmitConfirm(true)}
                  className="w-full py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>→ Review & submit</span>
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* ── Footer matching Figma ─────────────────────────── */}
        <footer className="border-t border-white/10 bg-[#060607] px-6 py-3 mt-10 flex items-center justify-between text-[11px] text-neutral-500">
          <span>APTIX Assessment Platform · KIET Deemed to be University</span>
          <span>Secure session • Server time is authoritative</span>
        </footer>
      </main>

      {/* ── Screen 2: Final Submission Review Modal ────────── */}
      <ExamReviewModal
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onSubmit={() => executeSubmit("Candidate confirmed final submission.")}
        isSubmitting={isSubmittingExam || isFinishingRef.current}
        questions={questions}
        answers={answers}
        markedForReview={markedForReview}
        timeLeft={timeLeft}
        syncStatus={syncStatus}
        session={session}
      />
      {submittingLock}
      {isSecuring && (
        <SecureLaunchOverlay
          stepIndex={secureStep}
          failMessage={secureError}
          onClose={() => {
            setIsSecuring(false);
            setSecureError(null);
            setSecureStep(0);
          }}
        />
      )}
    </>
  );
}
