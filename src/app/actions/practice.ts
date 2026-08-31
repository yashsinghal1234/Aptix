"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function getPracticeQuestionsAction(params: {
  topic?: string;
  difficulty?: string;
  count?: number;
}) {
  try {
    const token = cookies().get("token")?.value;
    let userId: string | null = null;

    if (token) {
      const payload = await verifyToken(token);
      if (payload) userId = payload.userId as string;
    }

    const { topic, difficulty, count = 10 } = params;

    // 1. Identify questions currently locked in upcoming/live scheduled sessions
    const activeSessions = await prisma.examSession.findMany({
      where: { status: { in: ["SCHEDULED", "LIVE"] } },
      select: {
        questions: { select: { id: true } }
      }
    });

    const reservedQuestionIds = new Set<string>();
    activeSessions.forEach(s => {
      s.questions.forEach(q => reservedQuestionIds.add(q.id));
    });

    // 2. Build where filter for approved questions
    const whereClause: any = {
      status: "APPROVED"
    };

    if (reservedQuestionIds.size > 0) {
      whereClause.id = { notIn: Array.from(reservedQuestionIds) };
    }

    if (topic && topic !== "ALL") {
      whereClause.category = topic;
    }

    if (difficulty && difficulty !== "ALL") {
      whereClause.difficultyLevel = difficulty;
    }

    // 3. Fetch matching pool
    let questionsPool = await prisma.question.findMany({
      where: whereClause,
      select: {
        id: true,
        text: true,
        type: true,
        category: true,
        difficultyLevel: true,
        points: true,
        negativePoints: true,
        imageUrl: true,
        options: true,
        answerData: true
      },
      take: 100
    });

    if (questionsPool.length === 0) {
      // If none approved or strictly filtered, fallback to any questions not reserved
      questionsPool = await prisma.question.findMany({
        where: reservedQuestionIds.size > 0 ? { id: { notIn: Array.from(reservedQuestionIds) } } : {},
        select: {
          id: true,
          text: true,
          type: true,
          category: true,
          difficultyLevel: true,
          points: true,
          negativePoints: true,
          imageUrl: true,
          options: true,
          answerData: true
        },
        take: 50
      });
    }

    const formatted = questionsPool.map(q => {
      let parsedOptions: any[] = [];
      let correctAnswer: any = null;
      let explanation: string | null = null;

      try {
        parsedOptions = JSON.parse(q.options);
      } catch {
        parsedOptions = [];
      }

      try {
        const parsedAns = JSON.parse(q.answerData);
        correctAnswer = parsedAns.correctAnswer !== undefined ? parsedAns.correctAnswer : parsedAns.exact;
        explanation = parsedAns.explanation || null;
      } catch {
        correctAnswer = null;
        explanation = null;
      }

      return {
        id: q.id,
        text: q.text,
        type: q.type,
        category: q.category,
        difficultyLevel: q.difficultyLevel,
        points: q.points,
        negativePoints: q.negativePoints,
        imageUrl: q.imageUrl,
        options: parsedOptions,
        correctAnswer,
        explanation
      };
    });

    // Shuffle and pick requested count
    const shuffled = formatted.sort(() => 0.5 - Math.random()).slice(0, count);
    return { success: true, questions: shuffled };
  } catch (error: any) {
    console.error("Practice questions fetch error:", error);
    return { success: false, error: error.message || "Failed to load practice questions" };
  }
}
