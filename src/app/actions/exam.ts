"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

import { gradeResponse } from "@/lib/scoring";

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
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Unauthorized" };

  const payload = await verifyToken(token);
  if (!payload || !payload.userId) return { error: "Unauthorized" };

  const userId = payload.userId as string;

  // Check-on-Access (Lazy Evaluation): Auto-submit if deadline has passed
  const attempt = await prisma.candidateAttempt.findUnique({
    where: { id: attemptId },
    include: { session: true }
  });

  if (!attempt || attempt.userId !== userId) return { error: "Attempt not found" };

  if (attempt.status === "SUBMITTED") {
    return { error: "Assessment already submitted", isSubmitted: true };
  }

  const sessionStart = attempt.session.startTime || attempt.session.createdAt;
  const baseEnd = new Date(sessionStart.getTime() + attempt.session.durationMinutes * 60000);
  const effectiveEnd = attempt.extendedUntil || attempt.session.extendedUntil || baseEnd;
  const now = new Date();

  if (now > effectiveEnd) {
    // Deadline passed: Auto-submit immediately
    await prisma.candidateAttempt.update({
      where: { id: attemptId },
      data: { status: "SUBMITTED", submittedAt: now }
    });
    return { error: "Assessment time expired", isSubmitted: true };
  }

  const q = await prisma.question.findUnique({
    where: { id: questionId }
  });

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
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Unauthorized" };

  const payload = await verifyToken(token);
  if (!payload || !payload.userId) return { error: "Unauthorized" };

  const userId = payload.userId as string;

  const attempt = await prisma.candidateAttempt.findUnique({
    where: { id: attemptId },
    include: { session: { include: { questions: true } } }
  });

  if (!attempt || attempt.userId !== userId) return { error: "Attempt not found" };

  if (attempt.status === "SUBMITTED") {
    return { error: "Assessment already submitted", isSubmitted: true };
  }

  // Check-on-Access: deadline enforcement
  const sessionStart = attempt.session.startTime || attempt.session.createdAt;
  const baseEnd = new Date(sessionStart.getTime() + attempt.session.durationMinutes * 60000);
  const effectiveEnd = attempt.extendedUntil || attempt.session.extendedUntil || baseEnd;
  const now = new Date();

  // If time has expired beyond grace period (60s), auto-submit and lock answers
  if (now.getTime() > effectiveEnd.getTime() + 60000) {
    await prisma.candidateAttempt.update({
      where: { id: attemptId },
      data: { status: "SUBMITTED", submittedAt: new Date(effectiveEnd.getTime() + 60000) }
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
      id: `resp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
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
  timeSpent?: Record<string, number>
) {
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Not logged in" };
  
  const payload = await verifyToken(token);
  if (!payload || !payload.userId) return { error: "Not logged in" };
  
  const userId = payload.userId as string;

  const attempt = await prisma.candidateAttempt.findUnique({
    where: { id: attemptId },
    include: { session: { include: { questions: true } } }
  });

  if (!attempt || attempt.userId !== userId) return { error: "Attempt not found" };

  // Calculate deadline and enforce server-side integrity
  const sessionStart = attempt.session.startTime || attempt.session.createdAt;
  const baseEnd = new Date(sessionStart.getTime() + attempt.session.durationMinutes * 60000);
  const effectiveEnd = attempt.extendedUntil || attempt.session.extendedUntil || baseEnd;
  const now = new Date();
  const GRACE_PERIOD_MS = 60 * 1000;
  
  let finalSubmittedAt = now;
  if (now.getTime() > effectiveEnd.getTime() + GRACE_PERIOD_MS) {
    finalSubmittedAt = new Date(effectiveEnd.getTime() + GRACE_PERIOD_MS);
    await prisma.cheatFlag.create({
      data: {
        userId,
        examSessionId: attempt.examSessionId,
        type: "LATE_SUBMISSION",
        description: `Late submission detected. Submitted at ${now.toISOString()}, but allotted window expired at ${effectiveEnd.toISOString()} (${Math.round((now.getTime() - effectiveEnd.getTime()) / 1000)}s past window).`
      }
    }).catch(e => console.error("Cheat flag error:", e));
  }

  // Sync any remaining answers (only if not already submitted)
  if (attempt.status !== "SUBMITTED") {
    await batchSyncDraftAnswersAction(attemptId, answers, timeSpent);
  }

  // Mark attempt as SUBMITTED
  await prisma.candidateAttempt.update({
    where: { id: attemptId },
    data: { status: "SUBMITTED", submittedAt: finalSubmittedAt }
  });

  // Clear device lock session
  const { clearAttemptSession } = await import("./attempt");
  await clearAttemptSession(attemptId).catch(() => {});

  // Re-run analytics if the session was completed
  if (attempt.session.status === "COMPLETED") {
    const { computeSessionAnalytics } = await import("./analytics");
    await computeSessionAnalytics(attempt.session.id).catch(e => console.error("Late analytics error:", e));
  }

  return { success: true };
}

/**
 * Periodic O(1) Server-Side Sweeper for Exam Deadline.
 * Sweeps all expired attempts and auto-submits them without spawning individual timers.
 */
export async function sweepExpiredAttemptsAction() {
  const now = new Date();

  // Find all LIVE sessions whose duration has elapsed
  const liveSessions = await prisma.examSession.findMany({
    where: { status: "LIVE" },
    include: { 
      attempts: { 
        where: { status: "IN_PROGRESS" },
        include: { responses: true }
      } 
    }
  });

  let sweptCount = 0;
  const sessionsToRecalculate = new Set<string>();

  for (const session of liveSessions) {
    const sessionStart = session.startTime || session.createdAt;
    const baseEnd = new Date(sessionStart.getTime() + session.durationMinutes * 60 * 1000);
    const sessionEffectiveEnd = session.extendedUntil || baseEnd;

    for (const attempt of session.attempts) {
      const candidateDeadline = attempt.extendedUntil || sessionEffectiveEnd;
      if (now > candidateDeadline) {
        await prisma.candidateAttempt.update({
          where: { id: attempt.id },
          data: {
            status: "SUBMITTED",
            submittedAt: now
          }
        });
        sweptCount++;
        sessionsToRecalculate.add(session.id);
      }
    }
  }

  // Re-compute analytics for any updated sessions
  if (sessionsToRecalculate.size > 0) {
    const { computeSessionAnalytics } = await import("./analytics");
    for (const sId of Array.from(sessionsToRecalculate)) {
      await computeSessionAnalytics(sId).catch(e => console.error("Sweeper analytics error:", e));
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
