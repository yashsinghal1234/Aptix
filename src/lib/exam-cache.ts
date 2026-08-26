import { prisma } from "@/lib/prisma";

interface CachedQuestionSet {
  timestamp: number;
  questions: any[];
}

const memoryCache = new Map<string, CachedQuestionSet>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

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
      questions: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!session) return [];

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
      points: q.points,
      negativePoints: q.negativePoints
    };
  });

  memoryCache.set(cacheKey, {
    timestamp: now,
    questions: sanitizedQuestions
  });

  return sanitizedQuestions;
}

export function invalidateSessionQuestionsCache(sessionId: string) {
  memoryCache.delete(`session_q_${sessionId}`);
}
