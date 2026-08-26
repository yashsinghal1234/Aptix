"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

function gradeResponse(q: any, selectedOption: string) {
  let isCorrect = false;
  let earnedPoints = 0;

  try {
    const parsedAnswer = JSON.parse(q.answerData);
    const qType = q.type || "MCQ_SINGLE";

    if (qType === "MCQ_SINGLE" || qType === "TRUE_FALSE") {
      isCorrect = selectedOption === (parsedAnswer.correctAnswer || (q as any).correctAnswer);
      if (isCorrect) earnedPoints = q.points;
      else earnedPoints = -q.negativePoints;
    } 
    else if (qType === "MCQ_MULTI") {
      const candArray = JSON.parse(selectedOption);
      const correctArray = parsedAnswer.correctAnswers || [];
      if (Array.isArray(candArray) && candArray.length === correctArray.length) {
        isCorrect = correctArray.every((ans: string) => candArray.includes(ans));
      }
      if (isCorrect) earnedPoints = q.points;
      else earnedPoints = -q.negativePoints;
    }
    else if (qType === "NUMERIC") {
      const candVal = parseFloat(selectedOption);
      if (!isNaN(candVal) && Math.abs(candVal - parsedAnswer.exact) <= parsedAnswer.tolerance) {
        isCorrect = true;
        earnedPoints = q.points;
      } else {
        earnedPoints = -q.negativePoints;
      }
    }
    else if (qType === "FILL_BLANK") {
      const candBlanks = JSON.parse(selectedOption);
      let totalEarned = 0;
      let allCorrect = true;

      for (const [blankId, config] of Object.entries(parsedAnswer.blanks || {})) {
        const conf = config as any;
        const candVal = (candBlanks[blankId] || "").trim();
        const candCheck = conf.caseSensitive ? candVal : candVal.toLowerCase();
        const accepted = (conf.accepted || []).map((v: string) => conf.caseSensitive ? v.trim() : v.trim().toLowerCase());
        
        if (accepted.includes(candCheck)) {
          totalEarned += (conf.points || 1);
        } else {
          allCorrect = false;
        }
      }

      if (parsedAnswer.partialCredit) {
        isCorrect = totalEarned > 0;
        earnedPoints = totalEarned;
      } else {
        isCorrect = allCorrect;
        earnedPoints = allCorrect ? q.points : -q.negativePoints;
      }
    }
  } catch (e) {
    isCorrect = selectedOption === (q as any).correctAnswer;
    if (isCorrect) earnedPoints = q.points;
    else earnedPoints = -q.negativePoints;
  }

  return { isCorrect, earnedPoints };
}

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
 * Sweeps all expired attempts and auto-submits them without spawning 1000 individual timers.
 */
export async function sweepExpiredAttemptsAction() {
  const now = new Date();

  // Find all LIVE sessions whose duration has elapsed
  const liveSessions = await prisma.examSession.findMany({
    where: { status: "LIVE" },
    include: { attempts: { where: { status: "IN_PROGRESS" } } }
  });

  let sweptCount = 0;

  for (const session of liveSessions) {
    const sessionStart = session.startTime || session.createdAt;
    const baseEnd = new Date(sessionStart.getTime() + session.durationMinutes * 60 * 1000);
    const effectiveEnd = session.extendedUntil || baseEnd;

    if (now > effectiveEnd) {
      // Auto-submit all in-progress attempts for this session
      const expiredAttempts = session.attempts;
      if (expiredAttempts.length > 0) {
        await prisma.candidateAttempt.updateMany({
          where: {
            id: { in: expiredAttempts.map(a => a.id) },
            status: "IN_PROGRESS"
          },
          data: {
            status: "SUBMITTED",
            submittedAt: now
          }
        });
        sweptCount += expiredAttempts.length;
      }
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
