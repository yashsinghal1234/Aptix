import React from "react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ReviewQuestions } from "@/components/ReviewQuestions";
import { verifyToken } from "@/lib/auth";
import Link from "next/link";
import { createSessionAction, setSessionStatusAction } from "@/app/actions/session";
import { deleteTemplateAction, duplicateTemplateAction } from "@/app/actions/template";
import { ActiveSessionsList } from "@/components/ActiveSessionsList";
import { OwnerTemplatesManager } from "@/components/OwnerTemplatesManager";
import { DashboardInsightCards } from "@/components/DashboardInsightCards";

export const dynamic = "force-dynamic";

async function loadDashboardData() {
  let retries = 3;
  let delayMs = 1500;

  while (retries > 0) {
    try {
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
    } catch (err: any) {
      retries--;
      if (retries === 0) throw err;
      console.warn(`[OwnerDashboard] Database connection retry (${3 - retries}/3)... waiting ${delayMs}ms`);
      await new Promise((r) => setTimeout(r, delayMs));
      delayMs *= 1.5;
    }
  }

  throw new Error("Unable to reach database after multiple attempts.");
}

export default async function OwnerDashboard({
  searchParams,
}: {
  searchParams?: { highlight?: string };
}) {
  const token = cookies().get("token")?.value;
  if (!token) redirect("/");
  
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") redirect("/");

  // Fetch all dashboard data with automatic cold-start retry
  const [
    allQuestions,
    templates,
    activeSessions,
    totalUsersCount,
    totalCandidatesCount,
    totalCompletedAttemptsCount,
    totalCompletedSessionsCount,
    totalCheatFlagsCount,
    recentCompletedSessions,
    inProgressAttemptsCount,
    cheatFlagsByType,
    allExamSessions,
    liveCheatFlagsCount
  ] = await loadDashboardData();

  const pendingQuestions = allQuestions.filter(q => q.status === "SUBMITTED");
  const approvedQuestionsCount = allQuestions.filter(q => q.status === "APPROVED").length;
  const liveSessionsCount = activeSessions.filter(s => s.status === "LIVE").length;

  // 1. Calculate Live Score & Cutoff Distribution across individual exams & aggregated
  const tierLabels = ["<40%", "40–55%", "55–70%", "70–85%", ">85%"];

  const parseTiers = (scoreDistributionJson: string | null | undefined): [number, number, number, number, number] => {
    if (!scoreDistributionJson) return [0, 0, 0, 0, 0];
    try {
      const deciles: number[] = JSON.parse(scoreDistributionJson);
      if (Array.isArray(deciles) && deciles.length === 10) {
        return [
          (deciles[0] || 0) + (deciles[1] || 0) + (deciles[2] || 0) + (deciles[3] || 0),
          (deciles[4] || 0) + Math.round((deciles[5] || 0) * 0.5),
          Math.round((deciles[5] || 0) * 0.5) + (deciles[6] || 0),
          (deciles[7] || 0) + Math.round((deciles[8] || 0) * 0.5),
          Math.round((deciles[8] || 0) * 0.5) + (deciles[9] || 0),
        ];
      }
    } catch (e) {}
    return [0, 0, 0, 0, 0];
  };

  const getPeakInfo = (tiers: [number, number, number, number, number]) => {
    let peakIdx = 0;
    let maxCount = tiers[0];
    tiers.forEach((cnt, idx) => {
      if (cnt > maxCount) {
        maxCount = cnt;
        peakIdx = idx;
      }
    });
    return { peakIdx, peakLabel: tierLabels[peakIdx], maxCount };
  };

  // Build individual exam session options with both distribution and proctoring stats
  const individualExamOptions = allExamSessions.map((session: any) => {
    const tiers = parseTiers(session.sessionStats?.scoreDistribution);
    const { peakLabel } = getPeakInfo(tiers);
    const attempts = session._count?.attempts ?? 0;
    const cheatFlagsCount = session._count?.cheatFlags ?? 0;
    const passRate = session.sessionStats ? Number(session.sessionStats.passRate.toFixed(1)) : 0;
    const avgScore = session.sessionStats ? Math.round(session.sessionStats.meanScore) : 0;

    // Analyze top infraction type in this session
    const flagTypeCounts: Record<string, number> = {};
    session.cheatFlags?.forEach((f: any) => {
      flagTypeCounts[f.type] = (flagTypeCounts[f.type] || 0) + 1;
    });
    let topFlag = "Window Blur";
    let maxFlagCount = 0;
    Object.entries(flagTypeCounts).forEach(([t, count]) => {
      if (count > maxFlagCount) {
        maxFlagCount = count;
        topFlag = t;
      }
    });

    const sessionCleanRate = attempts > 0
      ? Math.max(70, Math.min(100, 100 - (cheatFlagsCount / Math.max(attempts, 1)) * 3.5)).toFixed(1)
      : "100.0";

    return {
      id: session.id,
      label: `${session.exam?.title || "Assessment"}${session.pin ? ` (${session.pin})` : ""}`,
      examTitle: session.exam?.title || "Assessment",
      pin: session.pin,
      dateStr: new Date(session.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      attemptsCount: attempts,
      passRate,
      avgScore,
      tierCounts: tiers,
      peakTierLabel: attempts > 0 ? `Cutoff: 50% • Peak: ${peakLabel}` : "No Submissions Yet",
      isLatest: false,
      cheatFlagsCount,
      cleanRate: sessionCleanRate,
      topFlagName: topFlag,
      status: session.status,
    };
  });

  // Determine latest exam: first session with submissions, or first session overall
  const latestIndex = individualExamOptions.findIndex((e: any) => e.attemptsCount > 0);
  if (latestIndex !== -1) {
    individualExamOptions[latestIndex].isLatest = true;
  } else if (individualExamOptions.length > 0) {
    individualExamOptions[0].isLatest = true;
  }

  // Aggregated cohort across all sessions
  const aggregateTiers: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let sumPassRate = 0;
  let sumMeanScore = 0;
  let validStatsCount = 0;

  for (const session of allExamSessions) {
    if (session.sessionStats) {
      const t = parseTiers(session.sessionStats.scoreDistribution);
      t.forEach((count, i) => { aggregateTiers[i] += count; });
      if (typeof session.sessionStats.passRate === "number") {
        sumPassRate += session.sessionStats.passRate;
        sumMeanScore += (session.sessionStats.meanScore || session.sessionStats.passRate);
        validStatsCount++;
      }
    }
  }

  const { peakLabel: aggPeakLabel } = getPeakInfo(aggregateTiers);
  const aggPassRate = validStatsCount > 0 ? Number((sumPassRate / validStatsCount).toFixed(1)) : 20.3;
  const aggScore = validStatsCount > 0 ? Math.round(sumMeanScore / validStatsCount) : 2;

  const allExamsOption = {
    id: "all",
    label: "All Assessments (Cohort Overview)",
    examTitle: "All Assessments",
    pin: null,
    dateStr: "All Time",
    attemptsCount: totalCompletedAttemptsCount,
    passRate: aggPassRate,
    avgScore: aggScore,
    tierCounts: aggregateTiers,
    peakTierLabel: `Cutoff: 50% • Peak: ${aggPeakLabel}`,
    isLatest: false,
    cheatFlagsCount: totalCheatFlagsCount,
    cleanRate: (totalCompletedAttemptsCount > 0
      ? Math.max(85, Math.min(100, 100 - (totalCheatFlagsCount / Math.max(totalCompletedAttemptsCount, 1)) * 3.5)).toFixed(1)
      : "97.5"),
    topFlagName: cheatFlagsByType && cheatFlagsByType.length > 0 ? cheatFlagsByType[0].type : "Window Blur",
    status: liveSessionsCount > 0 ? "LIVE" : "COMPLETED",
  };

  const examDistributionOptions = [
    ...individualExamOptions,
    allExamsOption
  ];

  const defaultOption = individualExamOptions.find((e: any) => e.isLatest) || allExamsOption;
  const scoreDistributionData = {
    tierCounts: defaultOption.tierCounts,
    avgScore: defaultOption.avgScore,
    avgPassRate: defaultOption.passRate,
    peakTierLabel: defaultOption.peakTierLabel,
    totalEvaluated: defaultOption.attemptsCount,
  };

  // 2. Question Bank Real Categories from Prisma
  const categoryMap: Record<string, number> = {};
  for (const q of allQuestions) {
    const name = q.category?.trim() || "General Aptitude";
    categoryMap[name] = (categoryMap[name] || 0) + 1;
  }
  const topCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({
      name,
      count,
      pct: allQuestions.length > 0 ? Math.round((count / allQuestions.length) * 100) : 0,
    }));

  // 3. Real Cheat Flags Breakdown
  const flagsSummary = cheatFlagsByType.map(f => ({
    type: f.type.replace(/_/g, " "),
    count: f._count.id,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header & Quick Action Launchbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-neutral-400 text-sm sm:text-base mt-1.5">Manage assessment templates, live proctored sessions, and setter roles.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link 
            href="/dashboard/owner/candidates"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-sm sm:text-base font-bold rounded-xl border border-neutral-800 transition-all cursor-pointer shadow-xs whitespace-nowrap"
          >
            <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <span>Candidate Records</span>
          </Link>
          <Link 
            href="/dashboard/owner/template/new"
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-white hover:bg-neutral-200 text-black text-sm sm:text-base font-bold rounded-xl shadow-md border border-white transition-all whitespace-nowrap cursor-pointer"
          >
            <svg className="w-4 h-4 text-black shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span>Schedule Exam</span>
          </Link>
        </div>
      </div>

      {/* Top Metric & Insight Cards - Styled with Rich Mesh Gradient & Glassmorphism */}
      <DashboardInsightCards 
        templatesCount={templates.length}
        allQuestionsCount={allQuestions.length}
        activeSessionsCount={activeSessions.length}
        liveSessionsCount={liveSessionsCount}
        completedSessionsCount={totalCompletedSessionsCount}
        completedAttemptsCount={totalCompletedAttemptsCount}
        candidatesCount={totalCandidatesCount}
        cheatFlagsCount={totalCheatFlagsCount}
        approvedQuestionsCount={approvedQuestionsCount}
        pendingQuestionsCount={pendingQuestions.length}
        inProgressAttemptsCount={inProgressAttemptsCount}
        liveCheatFlagsCount={liveCheatFlagsCount}
        topCategories={topCategories}
        cheatFlagsByType={flagsSummary}
        scoreDistributionData={scoreDistributionData}
        examOptions={examDistributionOptions}
      />

      {/* Primary Operations: Active Sessions (Conditionally Shown) & Exam Templates (Full Width Table) */}
      <div className="space-y-8">
        {/* Live & Scheduled Sessions (Only displayed when there is at least one active or scheduled exam) */}
        {activeSessions.length > 0 && (
          <div className="bg-[#0a0c10] p-6 sm:p-7 rounded-3xl border border-neutral-800 shadow-md">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">Active Sessions</h2>
                  {liveSessionsCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {liveSessionsCount} Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                      {activeSessions.length} Scheduled
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-400 mt-0.5">Scheduled and live assessments requiring proctoring</p>
              </div>
            </div>
            <ActiveSessionsList initialSessions={activeSessions} />
          </div>
        )}

        {/* Templates (Full Width Table with Interactive Slide-Over Sidebar Drawer) */}
        <OwnerTemplatesManager 
          templates={templates as any} 
          highlightId={searchParams?.highlight} 
        />
      </div>

      {/* Concluded Assessments Performance Snapshot */}
      <div className="bg-[#0a0c10] rounded-3xl border border-neutral-800 shadow-md overflow-hidden">
        <div className="p-6 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#07080c]">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Recently Concluded Assessments</h2>
            <p className="text-sm text-neutral-400 mt-0.5">Cohort pass rates, score distribution, and psychometric summaries</p>
          </div>
          <Link 
            href="/dashboard/owner/results"
            className="text-xs sm:text-sm font-bold text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <span>View All Historical Reports</span>
            <span>&rarr;</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900/80 text-neutral-400 uppercase tracking-wider font-bold text-xs">
              <tr>
                <th className="px-6 py-4">Assessment Title</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Candidates</th>
                <th className="px-6 py-4">Cohort Pass Rate</th>
                <th className="px-6 py-4">Mean Score</th>
                <th className="px-6 py-4 text-right">Analytics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {recentCompletedSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-neutral-500 font-medium">
                    No concluded assessments yet. Completed exams and psychometrics will appear here automatically.
                  </td>
                </tr>
              ) : (
                recentCompletedSessions.map((session) => {
                  const totalMarks = session.questions.reduce((sum, q) => sum + q.points, 0) || session.exam.totalMarks || 1;
                  return (
                    <tr key={session.id} className="hover:bg-neutral-900/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-white text-sm capitalize">{session.exam.title}</p>
                        <p className="text-xs text-neutral-500 mt-0.5 max-w-[260px] truncate">{session.exam.instructions || "Standard Assessment"}</p>
                      </td>
                      <td className="px-6 py-4 text-neutral-400 font-medium text-xs">
                        {session.startTime ? session.startTime.toLocaleDateString() : session.createdAt.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-neutral-200 text-sm">
                        {session._count.attempts} candidates
                      </td>
                      <td className="px-6 py-4">
                        {session._count.attempts === 0 ? (
                          <span className="text-neutral-500 text-xs font-medium">No Attempts</span>
                        ) : session.sessionStats ? (
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-white text-sm tabular-nums w-14 shrink-0">
                              {session.sessionStats.passRate.toFixed(1)}%
                            </span>
                            <div className="w-28 sm:w-32 h-2.5 sm:h-3 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/80 shrink-0">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  session.sessionStats.passRate >= 40
                                    ? "bg-striped-emerald"
                                    : session.sessionStats.passRate > 0
                                    ? "bg-striped-amber"
                                    : "bg-neutral-800"
                                }`}
                                style={{
                                  width: `${Math.max(session.sessionStats.passRate, session.sessionStats.passRate > 0 ? 8 : 0)}%`,
                                  background: session.sessionStats.passRate >= 40
                                    ? "repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0px, rgba(255,255,255,0.35) 4px, transparent 4px, transparent 8px), #10b981"
                                    : session.sessionStats.passRate > 0
                                    ? "repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0px, rgba(255,255,255,0.35) 4px, transparent 4px, transparent 8px), #f59e0b"
                                    : undefined,
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-500 text-xs italic">Evaluating</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-white text-sm">
                        {session._count.attempts === 0 ? (
                          <span className="text-neutral-500 font-normal text-xs">—</span>
                        ) : (
                          <>
                            {session.sessionStats ? session.sessionStats.meanScore.toFixed(1) : "—"}{" "}
                            <span className="text-neutral-500 font-normal text-xs">/ {totalMarks}</span>
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/dashboard/owner/results/${session.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-black bg-white hover:bg-neutral-200 px-3.5 py-2 rounded-xl transition-all shadow-md cursor-pointer"
                        >
                          <span>Full Report</span>
                          <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Question Review Quality Queue */}
      <div id="review-queue" className="grid grid-cols-1 gap-8">
        <ReviewQuestions questions={allQuestions} />
      </div>
    </div>
  );
}
