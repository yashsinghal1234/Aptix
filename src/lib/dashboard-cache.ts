import { prisma } from "@/lib/prisma";

async function fetchOwnerDashboardData() {
  return await Promise.all([
    prisma.question.findMany({
      orderBy: { createdAt: "desc" }
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
        exam: true,
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
      orderBy: [
        { attempts: { _count: "desc" } },
        { createdAt: "desc" }
      ],
      take: 5,
      include: {
        exam: true,
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
        exam: { select: { id: true, title: true } },
        sessionStats: true,
        cheatFlags: { select: { type: true } },
        _count: { select: { attempts: true, cheatFlags: true } }
      }
    }),
    prisma.cheatFlag.count({ where: { session: { status: "LIVE" } } })
  ]);
}

export type OwnerDashboardData = Awaited<ReturnType<typeof fetchOwnerDashboardData>>;

let cachedDashboard: {
  timestamp: number;
  data: OwnerDashboardData;
} | null = null;

const DASHBOARD_CACHE_TTL_MS = 15000; // 15 seconds memory cache

export async function getCachedOwnerDashboardData(): Promise<OwnerDashboardData> {
  const now = Date.now();
  if (cachedDashboard && (now - cachedDashboard.timestamp) < DASHBOARD_CACHE_TTL_MS) {
    return cachedDashboard.data;
  }

  let retries = 3;
  let delayMs = 1200;

  while (retries > 0) {
    try {
      const data = await fetchOwnerDashboardData();

      cachedDashboard = {
        timestamp: now,
        data
      };

      return data;
    } catch (err: any) {
      retries--;
      if (retries === 0) {
        if (cachedDashboard) {
          console.warn("[DashboardCache] Transient DB error; serving stale cache.");
          return cachedDashboard.data;
        }
        throw err;
      }
      console.warn(`[DashboardCache] Database connection retry (${3 - retries}/3)... waiting ${delayMs}ms`);
      await new Promise((r) => setTimeout(r, delayMs));
      delayMs *= 1.5;
    }
  }

  throw new Error("Unable to reach database after multiple attempts.");
}

export function invalidateOwnerDashboardCache() {
  cachedDashboard = null;
}
