import { prisma } from "@/lib/prisma";

// Persistent globalThis cache to survive Next.js module re-evaluations and separate route bundles in dev mode
const GLOBAL_CACHE_KEY = "__aptix_global_dashboard_cache_v2";

export interface AptixGlobalCache {
  dashboard: { timestamp: number; data: any } | null;
  candidates: { timestamp: number; data: any } | null;
  results: { timestamp: number; data: any } | null;
  setters: { timestamp: number; data: any } | null;
  approvedQuestions: { timestamp: number; data: any } | null;
  questionBank: { timestamp: number; data: any } | null;
}

const g = globalThis as unknown as { [GLOBAL_CACHE_KEY]?: AptixGlobalCache };
if (!g[GLOBAL_CACHE_KEY]) {
  g[GLOBAL_CACHE_KEY] = {
    dashboard: null,
    candidates: null,
    results: null,
    setters: null,
    approvedQuestions: null,
    questionBank: null,
  };
}
const globalCache = g[GLOBAL_CACHE_KEY]!;

// In-flight query deduplication to prevent duplicate concurrent queries to remote PostgreSQL
const inFlightPromises: Record<string, Promise<any> | null> = {};

// Cache TTL: 10 minutes (mutations automatically invalidate relevant keys immediately)
const DASHBOARD_CACHE_TTL_MS = 10 * 60 * 1000;

// 1. Owner Dashboard Data
async function fetchOwnerDashboardData() {
  return await Promise.all([
    prisma.question.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        text: true,
        category: true,
        difficultyLevel: true,
        status: true,
        isExtracted: true,
        imageUrl: true,
        options: true,
        points: true,
        createdAt: true,
      }
    }),
    prisma.exam.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { questions: true, rules: true, sessions: true } },
        rules: true,
        questions: {
          select: { id: true, text: true, category: true, points: true, difficultyLevel: true },
          take: 10
        },
        sessions: {
          where: { status: { in: ["SCHEDULED", "LIVE"] } },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            pin: true,
            status: true,
            startTime: true,
            durationMinutes: true,
            allowedEmailDomain: true,
            _count: { select: { attempts: true } }
          }
        }
      }
    }),
    prisma.examSession.findMany({
      where: { status: { in: ["SCHEDULED", "LIVE"] } },
      orderBy: { createdAt: "desc" },
      include: {
        exam: { select: { id: true, title: true, subject: true } },
        _count: { select: { attempts: true } }
      }
    }),
    prisma.user.count(),
    prisma.user.count({ where: { role: "CANDIDATE" } }),
    prisma.candidateAttempt.count({ where: { status: "SUBMITTED" } }),
    prisma.examSession.count({ where: { status: "COMPLETED" } }),
    prisma.cheatFlag.count(),
    prisma.examSession.findMany({
      where: { status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        exam: { select: { id: true, title: true, subject: true } },
        sessionStats: true,
        questions: { select: { points: true } },
        _count: { select: { attempts: true } }
      }
    }),
    prisma.candidateAttempt.count({
      where: {
        status: "IN_PROGRESS",
        session: { status: "LIVE" }
      }
    }),
    prisma.cheatFlag.groupBy({ by: ['type'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    prisma.examSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        exam: { select: { id: true, title: true, subject: true } },
        sessionStats: true,
        cheatFlags: { take: 50, select: { type: true } },
        _count: { select: { attempts: true, cheatFlags: true } }
      }
    }),
    prisma.cheatFlag.count({ where: { session: { status: "LIVE" } } }),
    prisma.question.groupBy({ by: ["category", "status"], _count: { id: true } })
  ]);
}

export type OwnerDashboardData = Awaited<ReturnType<typeof fetchOwnerDashboardData>>;

export async function getCachedOwnerDashboardData(): Promise<OwnerDashboardData> {
  const now = Date.now();
  if (globalCache.dashboard && (now - globalCache.dashboard.timestamp) < DASHBOARD_CACHE_TTL_MS) {
    return globalCache.dashboard.data;
  }

  if (inFlightPromises["dashboard"]) {
    return await inFlightPromises["dashboard"];
  }

  const p = (async () => {
    try {
      const data = await fetchOwnerDashboardData();
      globalCache.dashboard = { timestamp: Date.now(), data };
      return data;
    } catch (err) {
      if (globalCache.dashboard) {
        console.warn("[DashboardCache] Transient DB error; serving stale cache.");
        return globalCache.dashboard.data;
      }
      throw err;
    } finally {
      inFlightPromises["dashboard"] = null;
    }
  })();

  inFlightPromises["dashboard"] = p;
  return await p;
}

// 2. Candidate Records Directory
async function fetchCandidatesData() {
  return await Promise.all([
    prisma.user.findMany({
      where: { role: "CANDIDATE" },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
          select: { attempts: true, cheatFlags: true }
        },
        attempts: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            examSessionId: true,
            status: true,
            session: {
              select: {
                exam: {
                  select: { title: true, totalMarks: true }
                }
              }
            },
            responses: {
              select: { earnedPoints: true }
            }
          }
        }
      }
    }),
    prisma.user.count({ where: { role: "CANDIDATE" } }),
    prisma.candidateAttempt.count(),
    prisma.cheatFlag.count(),
    prisma.candidateResponse.aggregate({
      _avg: { earnedPoints: true }
    }),
    prisma.examSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        pin: true,
        status: true,
        exam: { select: { title: true, totalMarks: true } },
        _count: { select: { attempts: true } }
      }
    })
  ]);
}

export type CandidatesData = Awaited<ReturnType<typeof fetchCandidatesData>>;

export async function getCachedCandidatesData(): Promise<CandidatesData> {
  const now = Date.now();
  if (globalCache.candidates && (now - globalCache.candidates.timestamp) < DASHBOARD_CACHE_TTL_MS) {
    return globalCache.candidates.data;
  }

  if (inFlightPromises["candidates"]) {
    return await inFlightPromises["candidates"];
  }

  const p = (async () => {
    try {
      const data = await fetchCandidatesData();
      globalCache.candidates = { timestamp: Date.now(), data };
      return data;
    } catch (err) {
      if (globalCache.candidates) return globalCache.candidates.data;
      throw err;
    } finally {
      inFlightPromises["candidates"] = null;
    }
  })();

  inFlightPromises["candidates"] = p;
  return await p;
}

// 3. Results / Assessment History
async function fetchResultsData() {
  return await prisma.examSession.findMany({
    where: { status: "COMPLETED" },
    include: {
      exam: true,
      questions: { select: { points: true } },
      sessionStats: true,
      _count: { select: { attempts: true } }
    },
    orderBy: [
      { attempts: { _count: "desc" } },
      { createdAt: "desc" }
    ],
    take: 50
  });
}

export type ResultsData = Awaited<ReturnType<typeof fetchResultsData>>;

export async function getCachedResultsData(): Promise<ResultsData> {
  const now = Date.now();
  if (globalCache.results && (now - globalCache.results.timestamp) < DASHBOARD_CACHE_TTL_MS) {
    return globalCache.results.data;
  }

  if (inFlightPromises["results"]) {
    return await inFlightPromises["results"];
  }

  const p = (async () => {
    try {
      const data = await fetchResultsData();
      globalCache.results = { timestamp: Date.now(), data };
      return data;
    } catch (err) {
      if (globalCache.results) return globalCache.results.data;
      throw err;
    } finally {
      inFlightPromises["results"] = null;
    }
  })();

  inFlightPromises["results"] = p;
  return await p;
}

// 4. Setters Management Data
async function fetchSettersData() {
  return await Promise.all([
    prisma.user.findMany({
      where: { role: "SETTER" },
      select: { id: true, name: true, email: true, createdAt: true, mustChangePassword: true, assignedSubject: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.question.groupBy({
      by: ["authorId"],
      _count: { id: true }
    }),
    prisma.question.count(),
    prisma.question.findMany({
      select: { category: true },
      distinct: ["category"]
    })
  ]);
}

export type SettersData = Awaited<ReturnType<typeof fetchSettersData>>;

export async function getCachedSettersData(): Promise<SettersData> {
  const now = Date.now();
  if (globalCache.setters && (now - globalCache.setters.timestamp) < DASHBOARD_CACHE_TTL_MS) {
    return globalCache.setters.data;
  }

  if (inFlightPromises["setters"]) {
    return await inFlightPromises["setters"];
  }

  const p = (async () => {
    try {
      const data = await fetchSettersData();
      globalCache.setters = { timestamp: Date.now(), data };
      return data;
    } catch (err) {
      if (globalCache.setters) return globalCache.setters.data;
      throw err;
    } finally {
      inFlightPromises["setters"] = null;
    }
  })();

  inFlightPromises["setters"] = p;
  return await p;
}

// 5. Approved Questions (Template Creator)
async function fetchApprovedQuestions() {
  return await prisma.question.findMany({
    where: { status: "APPROVED" },
    select: {
      id: true,
      text: true,
      category: true,
      difficultyLevel: true,
      points: true,
      type: true,
      options: true,
      answerData: true,
      imageUrl: true
    },
    orderBy: { createdAt: "desc" }
  });
}

export type ApprovedQuestionsData = Awaited<ReturnType<typeof fetchApprovedQuestions>>;

export async function getCachedApprovedQuestions(): Promise<ApprovedQuestionsData> {
  const now = Date.now();
  if (globalCache.approvedQuestions && (now - globalCache.approvedQuestions.timestamp) < DASHBOARD_CACHE_TTL_MS) {
    return globalCache.approvedQuestions.data;
  }

  if (inFlightPromises["approvedQuestions"]) {
    return await inFlightPromises["approvedQuestions"];
  }

  const p = (async () => {
    try {
      const data = await fetchApprovedQuestions();
      globalCache.approvedQuestions = { timestamp: Date.now(), data };
      return data;
    } catch (err) {
      if (globalCache.approvedQuestions) return globalCache.approvedQuestions.data;
      throw err;
    } finally {
      inFlightPromises["approvedQuestions"] = null;
    }
  })();

  inFlightPromises["approvedQuestions"] = p;
  return await p;
}

// 6. Question Bank Data
async function fetchQuestionBankData() {
  return await Promise.all([
    prisma.question.findMany({
      orderBy: { category: "asc" },
      select: {
        id: true,
        text: true,
        imageUrl: true,
        category: true,
        difficultyLevel: true,
        type: true,
        points: true,
        negativePoints: true,
        options: true,
        answerData: true,
        status: true,
        createdAt: true
      }
    }),
    prisma.examSession.findMany({
      where: { status: { in: ["LIVE", "COMPLETED"] } },
      select: { status: true, questions: { select: { id: true } } }
    })
  ]);
}

export type QuestionBankData = Awaited<ReturnType<typeof fetchQuestionBankData>>;

export async function getCachedQuestionBankData(): Promise<QuestionBankData> {
  const now = Date.now();
  if (globalCache.questionBank && (now - globalCache.questionBank.timestamp) < DASHBOARD_CACHE_TTL_MS) {
    return globalCache.questionBank.data;
  }

  if (inFlightPromises["questionBank"]) {
    return await inFlightPromises["questionBank"];
  }

  const p = (async () => {
    try {
      const data = await fetchQuestionBankData();
      globalCache.questionBank = { timestamp: Date.now(), data };
      return data;
    } catch (err) {
      if (globalCache.questionBank) return globalCache.questionBank.data;
      throw err;
    } finally {
      inFlightPromises["questionBank"] = null;
    }
  })();

  inFlightPromises["questionBank"] = p;
  return await p;
}

// Proactive background pre-warmer: fills RAM on server boot / first access so section clicks take 0ms
export function prewarmAllDashboardCaches() {
  Promise.allSettled([
    getCachedSettersData(),
    getCachedCandidatesData(),
    getCachedResultsData(),
    getCachedApprovedQuestions(),
    getCachedQuestionBankData(),
  ]).catch(() => {});
}

// Targeted cache invalidation functions
export function invalidateOwnerDashboardCache() {
  globalCache.dashboard = null;
}

export function invalidateSettersCache() {
  globalCache.setters = null;
}

export function invalidateCandidatesCache() {
  globalCache.candidates = null;
}

export function invalidateResultsCache() {
  globalCache.results = null;
}

export function invalidateQuestionBankCache() {
  globalCache.questionBank = null;
  globalCache.approvedQuestions = null;
}

export function invalidateAllDashboardCaches() {
  globalCache.dashboard = null;
  globalCache.candidates = null;
  globalCache.results = null;
  globalCache.setters = null;
  globalCache.approvedQuestions = null;
  globalCache.questionBank = null;
}
