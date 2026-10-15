import { prisma } from "@/lib/prisma";

interface CachedQuestionSet {
  timestamp: number;
  questions: any[];
}

const memoryCache = new Map<string, CachedQuestionSet>();
const CACHE_TTL_MS = 120 * 1000; // 2 minutes

// In-memory grading question cache
const gradingQuestionCache = new Map<string, { data: any; cachedAt: number }>();

// In-memory attempt deadline cache
const attemptDeadlineCache = new Map<string, {
  userId: string;
  effectiveEndMs: number;
  isSubmitted: boolean;
  cachedAt: number;
}>();

/**
 * High-performance cached reader for exam questions to protect DB during the 
 * "Exam Start" thundering herd (500-1000 concurrent students clicking Start).
 */
export async function getCachedSessionQuestions(sessionId: string) {
  const cacheKey = `session_q_${sessionId}`;
  const now = Date.now();
  const cached = memoryCache.get(cacheKey);

  if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    return cached.questions;
  }

  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: {
      exam: true,
      questions: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!session) return [];

  const examMarksPerQ = session.exam?.marksPerQuestion ?? (session.totalMarks > 0 && session.questions.length > 0 ? (session.totalMarks / session.questions.length) : 1);
  const examNegMarks = session.negativeMarkingEnabled ? (session.negativeMarksValue ?? 0) : 0;

  // Pre-seed grading question cache to make subsequent candidate answer checks 0ms
  for (const q of session.questions) {
    gradingQuestionCache.set(q.id, {
      data: {
        id: q.id,
        type: q.type || "MCQ_SINGLE",
        points: examMarksPerQ,
        negativePoints: examNegMarks,
        answerData: q.answerData
      },
      cachedAt: now
    });
  }

  const sanitizedQuestions = session.questions.map(q => {
    let parsedOptions = [];
    try {
      parsedOptions = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
    } catch (e) {
      console.error("Failed to parse options for question", q.id, e);
    }

    return {
      id: q.id,
      text: q.text,
      imageUrl: q.imageUrl,
      options: parsedOptions,
      category: q.category,
      type: q.type || "MCQ_SINGLE",
      points: examMarksPerQ,
      negativePoints: examNegMarks
    };
  });

  memoryCache.set(cacheKey, {
    timestamp: now,
    questions: sanitizedQuestions
  });

  return sanitizedQuestions;
}

export async function getCachedQuestionForGrading(questionId: string) {
  const cached = gradingQuestionCache.get(questionId);
  const now = Date.now();
  if (cached && (now - cached.cachedAt) < CACHE_TTL_MS) {
    return cached.data;
  }

  const q = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      type: true,
      points: true,
      negativePoints: true,
      answerData: true
    }
  });

  if (q) {
    gradingQuestionCache.set(questionId, {
      data: q,
      cachedAt: now
    });
  }
  return q;
}

export function setCachedAttemptStatus(attemptId: string, status: { userId: string; effectiveEndMs: number; isSubmitted: boolean }) {
  attemptDeadlineCache.set(attemptId, {
    ...status,
    cachedAt: Date.now()
  });
}

export function getCachedAttemptStatus(attemptId: string) {
  const cached = attemptDeadlineCache.get(attemptId);
  if (cached && (Date.now() - cached.cachedAt) < 30000) {
    return cached;
  }
  return null;
}

export function markCachedAttemptSubmitted(attemptId: string) {
  const cached = attemptDeadlineCache.get(attemptId);
  if (cached) {
    cached.isSubmitted = true;
    cached.cachedAt = Date.now();
  }
}

export function invalidateSessionQuestionsCache(sessionId: string) {
  memoryCache.delete(`session_q_${sessionId}`);
}

