"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

// In-memory registry of active device sessions per attempt:
// attemptId -> { deviceSessionId: string, lastSeen: number }
const activeAttemptSessions = new Map<string, { deviceSessionId: string; lastSeen: number }>();

export async function clearAttemptSession(attemptId: string) {
  activeAttemptSessions.delete(attemptId);
}

export async function startAttemptAction(sessionId: string, clientDeviceId?: string) {
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Unauthorized" };
  const payload = await verifyToken(token);
  if (!payload || !payload.userId) return { error: "Unauthorized" };

  const userId = payload.userId as string;

  let attempt = await prisma.candidateAttempt.findFirst({
    where: { userId, examSessionId: sessionId }
  });

  if (!attempt) {
    attempt = await prisma.candidateAttempt.create({
      data: {
        userId,
        examSessionId: sessionId,
        shuffleSeed: Math.floor(Math.random() * 1000000),
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
  const attempt = await prisma.candidateAttempt.findUnique({
    where: { id: attemptId },
    include: { 
      session: { include: { exam: true } },
      responses: true 
    }
  });
  
  if (!attempt) return null;
  
  // Check-on-Access (Lazy Auto-Submit on Deadline)
  const now = new Date();
  const sessionStart = attempt.session.startTime || attempt.session.createdAt;
  const baseEnd = new Date(sessionStart.getTime() + attempt.session.durationMinutes * 60000);
  const effectiveEnd = attempt.extendedUntil || attempt.session.extendedUntil || baseEnd;

  let currentStatus = attempt.status;
  if (currentStatus === "IN_PROGRESS" && now > effectiveEnd) {
    await prisma.candidateAttempt.update({
      where: { id: attemptId },
      data: { status: "SUBMITTED", submittedAt: now }
    });
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

  const score = attempt.responses.reduce((sum, r) => sum + r.earnedPoints, 0);

  let totalMarks = attempt.session.totalMarks || attempt.session.exam.totalMarks || 0;
  if (totalMarks === 0) {
    const sessionQuestions = await prisma.question.findMany({
      where: { examSessions: { some: { id: attempt.examSessionId } } }
    });
    totalMarks = sessionQuestions.reduce((sum, q) => sum + q.points, 0);
  }

  let detailedResults = null;
  if (currentStatus === "SUBMITTED" || attempt.session.status === "COMPLETED") {
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

  return {
    status: attempt.status,
    sessionStatus: attempt.session.status,
    extendedUntil: attempt.extendedUntil || attempt.session.extendedUntil || null,
    score: score,
    totalMarks: totalMarks || 1,
    startTime: attempt.session.startTime,
    durationMinutes: attempt.session.durationMinutes,
    detailedResults,
    concurrentSessionDetected
  };
}
