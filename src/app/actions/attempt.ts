"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { requireAuth } from "@/lib/auth";
import { randomInt } from "crypto";

// In-memory registry of active device sessions per attempt:
// attemptId -> { deviceSessionId: string, lastSeen: number }
const activeAttemptSessions = new Map<string, { deviceSessionId: string; lastSeen: number }>();

export async function clearAttemptSession(attemptId: string) {
  activeAttemptSessions.delete(attemptId);
}

export async function startAttemptAction(sessionId: string, clientDeviceId?: string) {
  const auth = await requireAuth();
  if ("error" in auth || !auth.user) {
    return { error: "error" in auth ? auth.error : "Unauthorized" };
  }

  const userId = auth.user.id;

  let attempt = await prisma.candidateAttempt.findFirst({
    where: { userId, examSessionId: sessionId }
  });

  if (!attempt) {
    attempt = await prisma.candidateAttempt.create({
      data: {
        userId,
        examSessionId: sessionId,
        shuffleSeed: randomInt(100000, 9999999),
        status: "IN_PROGRESS"
      }
    });
  }

  if (clientDeviceId && attempt && attempt.status === "IN_PROGRESS") {
    const existing = activeAttemptSessions.get(attempt.id);
    const nowMs = Date.now();
    if (existing && existing.deviceSessionId !== clientDeviceId && (nowMs - existing.lastSeen) < 25000) {
      return {
        error: "Active assessment session already in progress on another device or tab.",
        concurrentSessionDetected: true,
        attempt
      };
    }
    activeAttemptSessions.set(attempt.id, {
      deviceSessionId: clientDeviceId,
      lastSeen: nowMs
    });
  }

  return { success: true, attempt };
}

export async function getAttemptStatusAction(attemptId: string, clientDeviceId?: string) {
  const auth = await requireAuth();
  if ("error" in auth || !auth.user) return null;
  const { user } = auth;

  let attempt = await prisma.candidateAttempt.findUnique({
    where: { id: attemptId },
    include: { 
      session: { include: { exam: true } },
      responses: true 
    }
  });
  
  if (!attempt) return null;

  const blockedUser = await prisma.user.findUnique({ where: { id: attempt.userId }, select: { email: true } });
  if (blockedUser) {
    const blocked = await prisma.sessionBlocked.findUnique({
      where: { examSessionId_email: { examSessionId: attempt.examSessionId, email: blockedUser.email.toLowerCase() } },
    });
    if (blocked) {
      if (attempt.status === "IN_PROGRESS") {
        await prisma.candidateAttempt.update({ where: { id: attemptId }, data: { status: "SUBMITTED", submittedAt: new Date() } });
        attempt = { ...attempt, status: "SUBMITTED", submittedAt: new Date() } as typeof attempt;
      }
      return {
        status: attempt.status,
        sessionStatus: attempt.session.status,
        blocked: true,
        error: "You have been blocked by the proctor. Contact support.",
        score: null,
        totalMarks: 1,
        canViewResults: false,
        canViewPodium: false,
        cohort: null,
        detailedResults: null,
      } as any;
    }
  }

  // Authorization check: 
  // 1. OWNER can view any attempt
  // 2. SETTER can only view if they are the author of the exam template (exam.createdBySetterId)
  // 3. CANDIDATE can only view their own attempt
  const isOwner = user.role === "OWNER";
  const isAssignedSetter = user.role === "SETTER" && attempt.session.exam.createdBySetterId === user.id;
  const isCandidateAttemptOwner = user.id === attempt.userId;

  if (!isOwner && !isAssignedSetter && !isCandidateAttemptOwner) {
    return { error: "Forbidden: You do not have permission to view this attempt status." } as any;
  }
  
  // Check-on-Access (Lazy Auto-Submit on Deadline) - fallback if cron misses a run
  const now = new Date();
  const { getEffectiveEnd } = await import("@/lib/deadline");
  const effectiveEnd = getEffectiveEnd(attempt.session, attempt);

  let currentStatus = attempt.status;
  if (currentStatus === "IN_PROGRESS" && now > effectiveEnd) {
    await prisma.candidateAttempt.update({
      where: { id: attemptId },
      data: { status: "SUBMITTED", submittedAt: effectiveEnd }
    });
    attempt = { ...attempt, status: "SUBMITTED", submittedAt: effectiveEnd } as typeof attempt;
    currentStatus = "SUBMITTED";
  }

  let concurrentSessionDetected = false;
  if (clientDeviceId && currentStatus === "IN_PROGRESS") {
    const existing = activeAttemptSessions.get(attemptId);
    const nowMs = Date.now();
    if (existing && existing.deviceSessionId !== clientDeviceId && (nowMs - existing.lastSeen) < 25000) {
      concurrentSessionDetected = true;
      prisma.cheatFlag.create({
        data: {
          userId: attempt.userId,
          examSessionId: attempt.examSessionId,
          type: "CONCURRENT_SESSION",
          description: "Multiple active browser tabs or devices detected concurrently during assessment."
        }
      }).catch(err => console.error("Cheat flag error:", err));
    } else {
      activeAttemptSessions.set(attemptId, {
        deviceSessionId: clientDeviceId,
        lastSeen: nowMs
      });
    }
  } else if (currentStatus === "SUBMITTED") {
    activeAttemptSessions.delete(attemptId);
  }

  let resultVisibility = attempt.session.exam.resultVisibility || "IMMEDIATE";
  let resultsReleased = false;
  let podiumRevealed = false;
  if (attempt.session.configSnapshot) {
    try {
      const snap = JSON.parse(attempt.session.configSnapshot);
      if (snap.resultVisibility) {
        resultVisibility = snap.resultVisibility;
      }
      if (snap.resultsReleased !== undefined) {
        resultsReleased = Boolean(snap.resultsReleased);
      }
      if (snap.podiumRevealed !== undefined) {
        podiumRevealed = Boolean(snap.podiumRevealed);
      }
    } catch {}
  }

  const isSessionConcluded = attempt.session.status === "COMPLETED";
  let canViewResults = false;
  if (resultVisibility === "IMMEDIATE") {
    canViewResults = (currentStatus === "SUBMITTED" || isSessionConcluded);
  } else if (resultVisibility === "AFTER_RELEASE") {
    // ONLY when instructor explicitly releases the results via the live monitor or results page
    canViewResults = resultsReleased;
  } else if (resultVisibility === "NEVER") {
    canViewResults = resultsReleased;
  }

  const canViewPodium = canViewResults && podiumRevealed;

  const score = attempt.responses.reduce((sum, r) => sum + r.earnedPoints, 0);

  let totalMarks = attempt.session.totalMarks || attempt.session.exam.totalMarks || 0;
  if (totalMarks === 0) {
    const sessionQuestions = await prisma.question.findMany({
      where: { examSessions: { some: { id: attempt.examSessionId } } }
    });
    totalMarks = sessionQuestions.reduce((sum, q) => sum + q.points, 0);
  }

  let detailedResults = null;
  if (canViewResults && (currentStatus === "SUBMITTED" || isSessionConcluded)) {
    const showCorrect = attempt.session.exam.showCorrectAnswers ?? true;
    const showExpl = attempt.session.exam.showExplanation ?? false;
    
    if (showCorrect || showExpl) {
      const sessionQuestions = await prisma.question.findMany({
        where: { examSessions: { some: { id: attempt.examSessionId } } }
      });
      detailedResults = attempt.responses.map(r => {
        const q = sessionQuestions.find(sq => sq.id === r.questionId);
        let correctAns: string | undefined = undefined;
        let explanationText: string | undefined = undefined;

        if (q && showCorrect) {
          try {
            const parsed = JSON.parse(q.answerData);
            correctAns = parsed.correctAnswer || (parsed.correctAnswers ? parsed.correctAnswers.join(", ") : q.answerData);
          } catch(e) {
            correctAns = q.answerData;
          }
        }

        if (q && showExpl) {
          try {
            const parsedOpts = JSON.parse(q.options);
            const optWithExp = parsedOpts.find((opt: any) => opt.explanation);
            if (optWithExp) explanationText = optWithExp.explanation;
          } catch(e) {}
        }

        return {
          questionId: r.questionId,
          isCorrect: r.isCorrect,
          earnedPoints: r.earnedPoints,
          correctAnswer: correctAns,
          explanation: explanationText
        };
      });
    }
  }

  let cohort = null;
  if (canViewResults && (currentStatus === "SUBMITTED" || isSessionConcluded)) {
    try {
      const allAttempts = await prisma.candidateAttempt.findMany({
        where: { examSessionId: attempt.examSessionId },
        include: { responses: true, user: { select: { id: true, name: true } } }
      });

      const ranked = allAttempts.map(a => {
        const timeTakenSeconds = a.submittedAt && (a.startedAt || a.createdAt)
          ? Math.max(0, Math.round(
              (new Date(a.submittedAt).getTime() - new Date(a.startedAt || a.createdAt).getTime()) / 1000
            ))
          : null;
        return {
          id: a.id,
          userId: a.userId,
          name: (a as any).user?.name || "Candidate",
          score: a.responses.reduce((sum, r) => sum + r.earnedPoints, 0),
          status: a.status,
          createdAt: a.createdAt,
          submittedAt: a.submittedAt,
          timeTakenSeconds,
        };
      });

      // Sort with tie-breaking: higher score -> submitted status -> faster time taken / earlier submission -> earlier join
      ranked.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.status === "SUBMITTED" && b.status !== "SUBMITTED") return -1;
        if (b.status === "SUBMITTED" && a.status !== "SUBMITTED") return 1;
        const aTime = a.timeTakenSeconds ?? (a.submittedAt ? new Date(a.submittedAt).getTime() : Infinity);
        const bTime = b.timeTakenSeconds ?? (b.submittedAt ? new Date(b.submittedAt).getTime() : Infinity);
        if (aTime !== bTime) return aTime - bTime;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      const scoresList = ranked.map(r => r.score);
      const totalCandidates = Math.max(1, ranked.length);

      // Mascot emblems for the podium (best-effort; falls back to defaults)
      let mascotByUser: Record<string, string> = {};
      try {
        const mascotLogs = await prisma.auditLog.findMany({
          where: { action: "CHOSEN_MASCOT", details: { contains: attempt.examSessionId } },
          orderBy: { timestamp: "desc" }
        });
        for (const log of mascotLogs) {
          if (log.details && !mascotByUser[log.userId]) {
            try {
              const parsed = JSON.parse(log.details);
              if (parsed.mascotId) mascotByUser[log.userId] = parsed.mascotId;
            } catch {}
          }
        }
      } catch {}

      const { getMascotById } = await import("@/lib/mascots");
      const podium = ranked.slice(0, 3).map(r => {
        const m = getMascotById(mascotByUser[r.userId]);
        return {
          name: r.name.split(" ")[0] || "Candidate",
          score: Math.round(r.score * 10) / 10,
          mascot: m.emoji,
          gifUrl: m.gifUrl,
          mascotId: m.id
        };
      });

      const myIndex = ranked.findIndex(r => r.id === attempt.id || r.userId === attempt.userId);
      const rank = myIndex >= 0 ? myIndex + 1 : 1;
      const percentile = totalCandidates > 1
        ? Math.max(1, Math.min(100, Math.round(((totalCandidates - rank) / (totalCandidates - 1)) * 100)))
        : 100;

      const mean = Math.round((scoresList.reduce((sum, s) => sum + s, 0) / totalCandidates) * 10) / 10;
      const mid = Math.floor(scoresList.length / 2);
      const median = scoresList.length % 2 !== 0
        ? scoresList[mid]
        : Math.round(((scoresList[mid - 1] + scoresList[mid]) / 2) * 10) / 10;

      cohort = {
        rank,
        totalCandidates,
        percentile,
        mean,
        median,
        topScores: scoresList.slice(0, 3),
        podium: canViewPodium ? podium : [],
        podiumRevealed: canViewPodium
      };
    } catch (e) {
      console.warn("Cohort calculation error:", e);
    }
  }

  return {
    status: attempt.status,
    sessionStatus: attempt.session.status,
    extendedUntil: attempt.extendedUntil || attempt.session.extendedUntil || null,
    score: canViewResults ? score : null,
    totalMarks: totalMarks || 1,
    startTime: attempt.session.startTime,
    durationMinutes: attempt.session.durationMinutes,
    // Use startedAt (click "Start Exam") as the reference, not createdAt (login time).
    // This prevents pre-exam instruction-reading time from inflating the time-taken figure.
    timeTakenSeconds: attempt.submittedAt && (attempt.startedAt || attempt.createdAt)
      ? Math.min(
          attempt.session.durationMinutes * 60,
          Math.max(1, Math.round(
            (new Date(attempt.submittedAt).getTime() -
              new Date((attempt as any).startedAt || attempt.createdAt).getTime()) / 1000
          ))
        )
      : null,
    cohort: canViewResults ? cohort : null,
    detailedResults: canViewResults ? detailedResults : null,
    resultVisibility,
    resultsReleased,
    podiumRevealed,
    canViewPodium,
    canViewResults,
    concurrentSessionDetected
  };
}

/**
 * Lightweight per-attempt deadline re-sync for the open candidate tab.
 * Extensions applied by the owner (global session or per-candidate) after the
 * tab already loaded must reach the running exam timer, or the owner monitor
 * and the candidate countdown drift apart. Deliberately cheap: two columns on
 * the attempt + one on the session.
 */
export async function getAttemptDeadlineAction(attemptId: string) {
  const auth = await requireAuth();
  if ("error" in auth || !auth.user) return { error: "Unauthorized" };

  const attempt = await prisma.candidateAttempt.findUnique({
    where: { id: attemptId },
    select: {
      userId: true,
      status: true,
      extendedUntil: true,
      session: { select: { extendedUntil: true } },
    },
  });
  if (!attempt || attempt.userId !== auth.user.id) return { error: "Attempt not found" };
  if (attempt.status === "SUBMITTED") return { isSubmitted: true, extendedUntil: null };

  // The candidate always gets whichever deadline is LATER (a later global
  // extension must not be shadowed by an older per-candidate one).
  const attemptEndMs = attempt.extendedUntil ? attempt.extendedUntil.getTime() : 0;
  const sessionEndMs = attempt.session.extendedUntil ? attempt.session.extendedUntil.getTime() : 0;
  const maxEndMs = Math.max(attemptEndMs, sessionEndMs);

  return {
    isSubmitted: false,
    extendedUntil: maxEndMs > 0 ? new Date(maxEndMs) : null,
  };
}
