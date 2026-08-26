"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function startAttemptAction(sessionId: string) {
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

  return { success: true, attempt };
}

export async function getAttemptStatusAction(attemptId: string) {
  const attempt = await prisma.candidateAttempt.findUnique({
    where: { id: attemptId },
    include: { 
      session: { include: { exam: true } },
      responses: true 
    }
  });
  
  if (!attempt) return null;
  
  const score = attempt.responses.reduce((sum, r) => sum + r.earnedPoints, 0);

  let totalMarks = attempt.session.totalMarks || attempt.session.exam.totalMarks || 0;
  if (totalMarks === 0) {
    const sessionQuestions = await prisma.question.findMany({
      where: { examSessions: { some: { id: attempt.examSessionId } } }
    });
    totalMarks = sessionQuestions.reduce((sum, q) => sum + q.points, 0);
  }

  let detailedResults = null;
  if (attempt.status === "SUBMITTED" || attempt.session.status === "COMPLETED") {
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
    detailedResults
  };
}
