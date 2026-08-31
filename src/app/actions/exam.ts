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

  const upsertOps = [];

  for (const [qId, selectedOption] of Object.entries(answers)) {
    const q = attempt.session.questions.find(item => item.id === qId);
    if (!q) continue;

    const { isCorrect, earnedPoints } = gradeResponse(q, selectedOption);
    const timeTakenSeconds = timeSpent ? Math.floor((timeSpent[q.id] || 0) / 1000) : 0;

    upsertOps.push(
      prisma.candidateResponse.upsert({
        where: {
          attemptId_questionId: {
            attemptId,
            questionId: q.id
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
          questionId: q.id,
          selectedOption,
          isCorrect,
          earnedPoints,
          timeTakenSeconds
        }
      })
    );
  }

  await prisma.$transaction(upsertOps);
  return { success: true };
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

  // Sync any remaining answers
  await batchSyncDraftAnswersAction(attemptId, answers, timeSpent);

  // Mark attempt as SUBMITTED
  await prisma.candidateAttempt.update({
    where: { id: attemptId },
    data: { status: "SUBMITTED", submittedAt: new Date() }
  });

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
