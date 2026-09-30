"use server";

import { prisma } from "@/lib/prisma";

export async function computeSessionAnalytics(sessionId: string) {
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: {
      exam: true,
      questions: true,
      attempts: {
        include: { responses: true }
      }
    }
  });

  if (!session || session.attempts.length === 0) return;

  const { exam, questions, attempts } = session;
  const numAttempts = attempts.length;
  // Calculate total marks from the actual questions in this session
  const totalMarks = questions.reduce((sum, q) => sum + q.points, 0) || exam.totalMarks || 1;

  // 1. Calculate each student's score
  const studentScores = attempts.map(attempt => {
    const score = attempt.responses.reduce((sum, r) => sum + r.earnedPoints, 0);
    return { attemptId: attempt.id, score };
  });

  studentScores.sort((a, b) => a.score - b.score);

  // 2. Cohort-level stats
  const meanScore = studentScores.reduce((sum, s) => sum + s.score, 0) / numAttempts;
  const medianScore = numAttempts % 2 === 0
    ? (studentScores[numAttempts / 2 - 1].score + studentScores[numAttempts / 2].score) / 2
    : studentScores[Math.floor(numAttempts / 2)].score;
    
  const lowestScore = studentScores[0].score;
  const highestScore = studentScores[numAttempts - 1].score;
  
  const passScore = (exam.passCriteria / 100) * totalMarks;
  const passCount = studentScores.filter(s => s.score >= passScore).length;
  const passRate = (passCount / numAttempts) * 100;

  // Score distribution (Deciles: 0-10%, 10-20%... of max score)
  const distribution = new Array(10).fill(0);
  studentScores.forEach(s => {
    let bucket = Math.floor((s.score / totalMarks) * 10);
    if (bucket >= 10) bucket = 9;
    if (bucket < 0) bucket = 0;
    distribution[bucket]++;
  });

  await prisma.sessionStats.upsert({
    where: { sessionId },
    update: {
      meanScore, medianScore, passRate, highestScore, lowestScore,
      scoreDistribution: JSON.stringify(distribution),
      computedAt: new Date()
    },
    create: {
      sessionId,
      meanScore, medianScore, passRate, highestScore, lowestScore,
      scoreDistribution: JSON.stringify(distribution)
    }
  });

  // 3. Item Analysis
  // Top 27% and Bottom 27%
  const groupSize = Math.max(1, Math.floor(numAttempts * 0.27));
  const bottomGroupIds = new Set(studentScores.slice(0, groupSize).map(s => s.attemptId));
  const topGroupIds = new Set(studentScores.slice(numAttempts - groupSize).map(s => s.attemptId));

  for (const question of questions) {
    let correctCount = 0;
    let topCorrectCount = 0;
    let bottomCorrectCount = 0;
    let totalTimeSpent = 0;
    const distractorCounts: Record<string, number> = {};

    for (const attempt of attempts) {
      const response = attempt.responses.find(r => r.questionId === question.id);
      if (!response) continue;

      totalTimeSpent += response.timeTakenSeconds;
      
      // Update distractors
      const selected = response.selectedOption;
      distractorCounts[selected] = (distractorCounts[selected] || 0) + 1;

      if (response.isCorrect) {
        correctCount++;
        if (topGroupIds.has(attempt.id)) topCorrectCount++;
        if (bottomGroupIds.has(attempt.id)) bottomCorrectCount++;
      }
    }

    const pValue = correctCount / numAttempts;
    
    // Discrimination Index: (Top Correct Rate) - (Bottom Correct Rate)
    const topCorrectRate = topGroupIds.size > 0 ? topCorrectCount / topGroupIds.size : 0;
    const bottomCorrectRate = bottomGroupIds.size > 0 ? bottomCorrectCount / bottomGroupIds.size : 0;
    const discrimination = topCorrectRate - bottomCorrectRate;
    
    const avgTimeSpent = totalTimeSpent / numAttempts;

    await prisma.questionStats.upsert({
      where: {
        sessionId_questionId: { sessionId, questionId: question.id }
      },
      update: {
        pValue, discrimination, avgTimeSpent,
        distractors: JSON.stringify(distractorCounts)
      },
      create: {
        sessionId, questionId: question.id,
        pValue, discrimination, avgTimeSpent,
        distractors: JSON.stringify(distractorCounts)
      }
    });
  }
}

let telemetryCache: {
  timestamp: number;
  data: {
    liveSessionsCount: number;
    inProgressAttemptsCount: number;
    liveCheatFlagsCount: number;
    totalCheatFlagsCount: number;
    cheatFlagsByType: { type: string; count: number }[];
    completedAttemptsCount: number;
  };
} | null = null;

const TELEMETRY_CACHE_TTL_MS = 6000; // 6 seconds memory cache

export async function getLiveTelemetryData() {
  const now = Date.now();
  if (telemetryCache && (now - telemetryCache.timestamp) < TELEMETRY_CACHE_TTL_MS) {
    return telemetryCache.data;
  }

  try {
    const [
      liveSessionsCount,
      inProgressAttemptsCount,
      liveCheatFlagsCount,
      totalCheatFlagsCount,
      cheatFlagsByType,
      completedAttemptsCount,
    ] = await Promise.all([
      prisma.examSession.count({ where: { status: "LIVE" } }),
      prisma.candidateAttempt.count({
        where: {
          status: "IN_PROGRESS",
          session: { status: "LIVE" }
        }
      }),
      prisma.cheatFlag.count({
        where: {
          session: { status: "LIVE" }
        }
      }),
      prisma.cheatFlag.count(),
      prisma.cheatFlag.groupBy({
        by: ['type'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),
      prisma.candidateAttempt.count({ where: { status: "SUBMITTED" } }),
    ]);

    const result = {
      liveSessionsCount,
      inProgressAttemptsCount,
      liveCheatFlagsCount,
      totalCheatFlagsCount,
      cheatFlagsByType: cheatFlagsByType.map(f => ({ type: f.type, count: f._count.id })),
      completedAttemptsCount,
    };

    telemetryCache = {
      timestamp: now,
      data: result
    };

    return result;
  } catch (err) {
    console.error("[getLiveTelemetryData] Error fetching live telemetry:", err);
    return telemetryCache?.data || null;
  }
}

