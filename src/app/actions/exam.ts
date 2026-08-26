"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function submitExamAction(attemptId: string, answers: Record<string, string>, timeSpent?: Record<string, number>) {
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Not logged in" };
  
  const payload = await verifyToken(token);
  if (!payload || !payload.userId) {
    return { error: "Not logged in" };
  }
  
  const userId = payload.userId as string;

  const attempt = await prisma.candidateAttempt.findUnique({
    where: { id: attemptId },
    include: { session: { include: { questions: true } } }
  });

  if (!attempt || attempt.userId !== userId) return { error: "Attempt not found" };

  // Clear previous responses for this attempt (idempotent submissions)
  await prisma.candidateResponse.deleteMany({
    where: { attemptId }
  });

  for (const [qId, selectedOption] of Object.entries(answers)) {
    const q = attempt.session.questions.find(q => q.id === qId);
    if (q) {
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
          const candArray = JSON.parse(selectedOption); // e.g. ["Opt A", "Opt B"]
          const correctArray = parsedAnswer.correctAnswers || []; // array of strings
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
          const candBlanks = JSON.parse(selectedOption); // e.g. { "1": "mitochondria" }
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
        // Fallback for legacy data
        isCorrect = selectedOption === (q as any).correctAnswer;
        if (isCorrect) earnedPoints = q.points;
        else earnedPoints = -q.negativePoints;
      }

      await prisma.candidateResponse.create({
        data: {
          userId,
          attemptId,
          questionId: q.id,
          selectedOption,
          isCorrect,
          earnedPoints,
          timeTakenSeconds: timeSpent ? Math.floor((timeSpent[q.id] || 0) / 1000) : 0
        }
      });
    }
  }

  // Mark attempt as SUBMITTED
  await prisma.candidateAttempt.update({
    where: { id: attemptId },
    data: { status: "SUBMITTED", submittedAt: new Date() }
  });

  // Re-run analytics if the session was already completed (e.g. owner forced end)
  if (attempt.session.status === "COMPLETED") {
    const { computeSessionAnalytics } = await import("./analytics");
    await computeSessionAnalytics(attempt.session.id).catch(e => console.error("Late analytics error:", e));
  }

  return { success: true };
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
