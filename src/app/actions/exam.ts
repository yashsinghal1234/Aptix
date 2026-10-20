"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { randomUUID } from "crypto";

import { gradeResponse } from "@/lib/scoring";
import { getEffectiveEnd, getDeadlineState, clampSubmittedAt } from "@/lib/deadline";
import {
  getCachedQuestionForGrading,
  getCachedAttemptStatus,
  setCachedAttemptStatus,
  markCachedAttemptSubmitted
} from "@/lib/exam-cache";

/**
 * Real-time Debounced Autosave for Individual Question Selection.
 * Protects against computer crashes, tab closure, power outages, and sudden network drops.
 */
export async function saveDraftAnswerAction(
  attemptId: string,
  questionId: string,
  selectedOption: string,
  timeTakenSeconds = 0
) {
  const auth = await requireAuth();
  if ("error" in auth || !auth.user) return { error: "error" in auth ? auth.error : "Unauthorized" };
  const userId = auth.user.id;

  {
    const _att = await prisma.candidateAttempt.findUnique({ where: { id: attemptId }, select: { examSessionId: true } });
    if (_att) {
      const _b = await prisma.sessionBlocked.findUnique({
        where: { examSessionId_email: { examSessionId: _att.examSessionId, email: String(auth.user.email).toLowerCase() } },
      });
      if (_b) return { error: "You have been blocked by the proctor.", blocked: true };
    }
  }

  // Check in-memory attempt deadline cache first (0ms)
  const cachedAttempt = getCachedAttemptStatus(attemptId);
  if (cachedAttempt) {
    if (cachedAttempt.userId !== userId) return { error: "Attempt not found" };
    if (cachedAttempt.isSubmitted) return { error: "Assessment already submitted", isSubmitted: true };
    if (Date.now() > cachedAttempt.effectiveEndMs) {
      await prisma.candidateAttempt.update({
        where: { id: attemptId },
        data: { status: "SUBMITTED", submittedAt: new Date(cachedAttempt.effectiveEndMs) }
      });
      markCachedAttemptSubmitted(attemptId);
      return { error: "Assessment time expired", isSubmitted: true };
    }
  } else {
    // Check-on-Access: Auto-submit if deadline has passed (0s grace for saves)
    const attempt = await prisma.candidateAttempt.findUnique({
      where: { id: attemptId },
      include: { session: true }
    });

    if (!attempt || attempt.userId !== userId) return { error: "Attempt not found" };

    if (attempt.status === "SUBMITTED") {
      markCachedAttemptSubmitted(attemptId);
      return { error: "Assessment already submitted", isSubmitted: true };
    }

    const { state } = getDeadlineState(attempt.session, attempt);
    if (state !== "OPEN") {
      const effectiveEnd = getEffectiveEnd(attempt.session, attempt);
      await prisma.candidateAttempt.update({
        where: { id: attemptId },
        data: { status: "SUBMITTED", submittedAt: new Date(Math.min(Date.now(), effectiveEnd.getTime())) }
      });
      markCachedAttemptSubmitted(attemptId);
      return { error: "Assessment time expired", isSubmitted: true };
    }

    setCachedAttemptStatus(attemptId, {
      userId,
      effectiveEndMs: getEffectiveEnd(attempt.session, attempt).getTime(),
      isSubmitted: false
    });
  }

  const q = await getCachedQuestionForGrading(questionId);
  if (!q) return { error: "Question not found" };

  const { isCorrect, earnedPoints } = gradeResponse(q, selectedOption);


  await prisma.candidateResponse.upsert({
    where: {
      attemptId_questionId: {
        attemptId,
        questionId
      }
    },
    update: {
      selectedOption,
      isCorrect,
      earnedPoints,
      timeTakenSeconds
    },
    create: {
      userId,
      attemptId,
      questionId,
      selectedOption,
      isCorrect,
      earnedPoints,
      timeTakenSeconds
    }
  });

  return { success: true };
}

/**
 * High-throughput Batch Autosave of multiple answers
 */
export async function batchSyncDraftAnswersAction(
  attemptId: string,
  answers: Record<string, string>,
  timeSpent?: Record<string, number>
) {
  const auth = await requireAuth();
  if ("error" in auth || !auth.user) return { error: "error" in auth ? auth.error : "Unauthorized" };
  const userId = auth.user.id;

  {
    const _att = await prisma.candidateAttempt.findUnique({ where: { id: attemptId }, select: { examSessionId: true } });
    if (_att) {
      const _b = await prisma.sessionBlocked.findUnique({
        where: { examSessionId_email: { examSessionId: _att.examSessionId, email: String(auth.user.email).toLowerCase() } },
      });
      if (_b) return { error: "You have been blocked by the proctor.", blocked: true };
    }
  }

  const attempt = await prisma.candidateAttempt.findUnique({
    where: { id: attemptId },
    include: { session: { include: { questions: true } } }
  });

  if (!attempt || attempt.userId !== userId) return { error: "Attempt not found" };

  if (attempt.status === "SUBMITTED") {
    return { error: "Assessment already submitted", isSubmitted: true };
  }

  // Check-on-Access: saves stop at deadline (0s grace); final submit has its own 60s window below.
  const { state: batchState, effectiveEnd: batchEnd } = getDeadlineState(attempt.session, attempt);
  const now = new Date();

  // If time has expired beyond grace period (60s), auto-submit and lock answers
  if (batchState === "CLOSED") {
    await prisma.candidateAttempt.update({
      where: { id: attemptId },
      data: { status: "SUBMITTED", submittedAt: new Date(Math.min(now.getTime(), batchEnd.getTime())) }
    });
    return { error: "Assessment deadline expired", isSubmitted: true };
  }

  const responsesToUpsert = [];

  for (const [qId, selectedOption] of Object.entries(answers)) {
    const q = attempt.session.questions.find(item => item.id === qId);
    if (!q) continue;

    const { isCorrect, earnedPoints } = gradeResponse(q, selectedOption);
    const timeTakenSeconds = timeSpent ? Math.floor((timeSpent[q.id] || 0) / 1000) : 0;

    responsesToUpsert.push({
      id: `resp_${randomUUID()}`,
      userId,
      attemptId,
      questionId: q.id,
      selectedOption: String(selectedOption),
      isCorrect,
      earnedPoints,
      timeTakenSeconds
    });
  }

  if (responsesToUpsert.length === 0) {
    return { success: true };
  }

  // High-Throughput Transaction-Free Multi-Row Raw SQL Upsert
  // Executes in a single database round-trip (~15ms vs 2500ms on Neon Ohio)
  try {
    const { Prisma } = await import("@prisma/client");
    const valueTuples = responsesToUpsert.map(
      r => Prisma.sql`(${r.id}, ${r.userId}, ${r.attemptId}, ${r.questionId}, ${r.selectedOption}, ${r.isCorrect}, ${r.earnedPoints}, ${r.timeTakenSeconds})`
    );

    await prisma.$executeRaw`
      INSERT INTO "CandidateResponse" ("id", "userId", "attemptId", "questionId", "selectedOption", "isCorrect", "earnedPoints", "timeTakenSeconds")
      VALUES ${Prisma.join(valueTuples)}
      ON CONFLICT ("attemptId", "questionId")
      DO UPDATE SET
        "selectedOption" = EXCLUDED."selectedOption",
        "isCorrect" = EXCLUDED."isCorrect",
        "earnedPoints" = EXCLUDED."earnedPoints",
        "timeTakenSeconds" = EXCLUDED."timeTakenSeconds";
    `;
    return { success: true };
  } catch (sqlErr) {
    console.warn("Direct raw SQL upsert fallbacking to Prisma transaction:", sqlErr);
    const fallbackOps = responsesToUpsert.map(r =>
      prisma.candidateResponse.upsert({
        where: {
          attemptId_questionId: {
            attemptId: r.attemptId,
            questionId: r.questionId
          }
        },
        update: {
          selectedOption: r.selectedOption,
          isCorrect: r.isCorrect,
          earnedPoints: r.earnedPoints,
          timeTakenSeconds: r.timeTakenSeconds
        },
        create: {
          id: r.id,
          userId: r.userId,
          attemptId: r.attemptId,
          questionId: r.questionId,
          selectedOption: r.selectedOption,
          isCorrect: r.isCorrect,
          earnedPoints: r.earnedPoints,
          timeTakenSeconds: r.timeTakenSeconds
        }
      })
    );
    await prisma.$transaction(fallbackOps);
    return { success: true };
  }
}

/**
 * Final Exam Submission (Marks status as SUBMITTED & guarantees final sync)
 */
export async function submitExamAction(
  attemptId: string,
  answers: Record<string, string>,
  timeSpent?: Record<string, number>,
  clientStartedAtMs?: number  // When candidate clicked "Start Exam" (not login time)
) {
  const auth = await requireAuth();
  if ("error" in auth || !auth.user) return { error: "Not logged in" };
  const userId = auth.user.id;
  console.log("[submitExamAction] received:", attemptId);

  {
    const _att = await prisma.candidateAttempt.findUnique({ where: { id: attemptId }, select: { examSessionId: true } });
    if (_att) {
      const _b = await prisma.sessionBlocked.findUnique({
        where: { examSessionId_email: { examSessionId: _att.examSessionId, email: String(auth.user.email).toLowerCase() } },
      });
      if (_b) return { error: "You have been blocked by the proctor.", blocked: true };
    }
  }

  const attempt = await prisma.candidateAttempt.findUnique({
    where: { id: attemptId },
    include: { session: { include: { questions: true } } }
  });

  if (!attempt || attempt.userId !== userId) return { error: "Attempt not found" };

  // Server-authoritative deadline: saves stop at end, final submit has a 60s
  // submit-only grace window. Past grace, answers are dropped but the attempt
  // is still marked submitted so results stay consistent.
  const { state: submitState, effectiveEnd } = getDeadlineState(attempt.session, attempt);
  const now = new Date();

  let finalSubmittedAt = clampSubmittedAt(attempt.session, attempt, now);
  let answersDropped = false;
  if (submitState === "CLOSED") {
    answersDropped = true;
    await prisma.cheatFlag.create({
      data: {
        userId,
        examSessionId: attempt.examSessionId,
        type: "LATE_SUBMISSION",
        description: `Late submission detected. Submitted at ${now.toISOString()}, but allotted window expired at ${effectiveEnd.toISOString()} (${Math.round((now.getTime() - effectiveEnd.getTime()) / 1000)}s past window). Answers after grace were not saved.`
      }
    }).catch(e => console.error("Cheat flag error:", e));
  } else if (submitState === "GRACE") {
    finalSubmittedAt = now;
    await prisma.cheatFlag.create({
      data: {
        userId,
        examSessionId: attempt.examSessionId,
        type: "LATE_SUBMISSION",
        description: `Submission during 60s grace window at ${now.toISOString()}, window expired at ${effectiveEnd.toISOString()}.`
      }
    }).catch(e => console.error("Cheat flag error:", e));
  }

  // Sync any remaining answers (only if not already submitted)
  // Past grace the sync is skipped: late answers are dropped, never stored.
  if (attempt.status !== "SUBMITTED" && !answersDropped) {
    const syncRes = await batchSyncDraftAnswersAction(attemptId, answers, timeSpent);
    if (syncRes && "isSubmitted" in syncRes && (syncRes as { isSubmitted?: boolean }).isSubmitted) {
      answersDropped = true;
    }
  }

  // Mark attempt as SUBMITTED and stamp startedAt for accurate time tracking
  const createdMs = attempt.createdAt.getTime();
  const submittedMs = finalSubmittedAt.getTime();
  // Accept clientStartedAtMs only if it's a sensible value between the session
  // start, attempt creation and submission (never trust raw client time).
  const sessionFloorMs = (attempt.session.startTime || attempt.createdAt).getTime();
  const resolvedStartedAt =
    clientStartedAtMs &&
    clientStartedAtMs > sessionFloorMs &&
    clientStartedAtMs > createdMs &&
    clientStartedAtMs < submittedMs
      ? new Date(clientStartedAtMs)
      : null;

  await prisma.candidateAttempt.update({
    where: { id: attemptId },
    data: {
      status: "SUBMITTED",
      submittedAt: finalSubmittedAt,
      ...(resolvedStartedAt ? { startedAt: resolvedStartedAt } : {}),
    },
  });
  markCachedAttemptSubmitted(attemptId);

  // Clear device lock session
  const { clearAttemptSession } = await import("./attempt");
  await clearAttemptSession(attemptId).catch(() => {});

  // Re-run analytics if the session was completed
  if (attempt.session.status === "COMPLETED") {
    const { computeSessionAnalytics } = await import("./analytics");
    await computeSessionAnalytics(attempt.session.id).catch(e => console.error("Late analytics error:", e));
  }

  console.log("[submitExamAction] complete:", attemptId);
  return { success: true };
}

/**
 * Periodic O(1) Server-Side Sweeper for Exam Deadline.
 * Sweeps all expired attempts and auto-submits them without spawning individual timers.
 */
export async function sweepExpiredAttemptsAction(internalSecret?: string) {
  const auth = await requireAuth(["OWNER"]);
  const isOwner = !("error" in auth);
  const isValidCron = internalSecret && process.env.CRON_SECRET && internalSecret === process.env.CRON_SECRET;

  if (!isOwner && !isValidCron) {
    return { error: "Unauthorized: sweepExpiredAttempts requires Owner privileges or valid Cron secret." };
  }

  const now = new Date();

  // Capped per run so the sweeper stays inside serverless timeouts.
  // Lazy sweep-on-read in getAttemptStatusAction covers anything missed.
  const liveSessions = await prisma.examSession.findMany({
    where: { status: 'LIVE' },
    include: {
      attempts: {
        where: { status: 'IN_PROGRESS' },
        include: { responses: true }
      }
    },
    take: 50,
  });

  let sweptCount = 0;
  const sessionsToRecalculate = new Set<string>();
  const { getEffectiveEnd } = await import('@/lib/deadline');
  const { markCachedAttemptSubmitted } = await import('@/lib/exam-cache');

  for (const session of liveSessions) {
    for (const attempt of session.attempts) {
      const candidateDeadline = getEffectiveEnd(session, attempt);
      if (now > candidateDeadline) {
        await prisma.candidateAttempt.update({
          where: { id: attempt.id },
          data: {
            status: 'SUBMITTED',
            submittedAt: candidateDeadline
          }
        });
        markCachedAttemptSubmitted(attempt.id);
        sweptCount++;
        sessionsToRecalculate.add(session.id);
      }
    }
  }
  // Re-compute analytics for any updated sessions
  if (sessionsToRecalculate.size > 0) {
    const { computeSessionAnalytics } = await import("./analytics");
    for (const sId of Array.from(sessionsToRecalculate)) {
      await computeSessionAnalytics(sId, internalSecret).catch(e => console.error("Sweeper analytics error:", e));
    }
  }

  return { sweptCount };
}

export async function getExamStatusAction(sessionId: string) {
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    select: { status: true }
  });
  return session?.status || null;
}

export async function getActiveExamStatusAction() {
  const session = await prisma.examSession.findFirst({
    where: { status: { in: ["SCHEDULED", "LIVE"] } },
    select: { id: true, status: true }
  });
  return session || null;
}
