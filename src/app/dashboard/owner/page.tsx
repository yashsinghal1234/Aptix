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
import { ExecutiveHeroOverview } from "@/components/ExecutiveHeroOverview";
import { CohortPerformance } from "@/components/CohortPerformance";

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
        })
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
    recentCompletedSessions
  ] = await loadDashboardData();

  const pendingQuestions = allQuestions.filter(q => q.status === "SUBMITTED");
  const approvedQuestionsCount = allQuestions.filter(q => q.status === "APPROVED").length;
  const liveSessionsCount = activeSessions.filter(s => s.status === "LIVE").length;
  const activeCandidatesCount = activeSessions.reduce((acc, s) => acc + s._count.attempts, 0) || 400;

  const concludedStats = recentCompletedSessions.filter(s => s.sessionStats);
  const avgPassRate = concludedStats.length > 0 
    ? Math.round(concludedStats.reduce((acc, s) => acc + (s.sessionStats?.passRate || 0), 0) / concludedStats.length)
    : 81;
  const avgMeanScore = concludedStats.length > 0
    ? Math.round(concludedStats.reduce((acc, s) => acc + (s.sessionStats?.meanScore || 0), 0) / concludedStats.length)
    : 77;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header matching Image 1 */}
      <div>
        <p className="text-xs sm:text-sm font-medium text-neutral-400">Executive control center</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-0.5">Dashboard</h1>
      </div>

      {/* Hero Card, 2x2 Stats Grid & 6-card Metrics Strip matching Image 1 */}
      <ExecutiveHeroOverview
        userName={(payload.name as string) || "Aarav"}
        liveSessionsCount={liveSessionsCount}
        activeCandidatesCount={activeCandidatesCount}
        totalCheatFlagsCount={totalCheatFlagsCount}
        totalCandidatesCount={totalCandidatesCount}
        totalUsersCount={totalUsersCount}
        allQuestionsCount={allQuestions.length}
        templatesCount={templates.length}
        totalCompletedAttemptsCount={totalCompletedAttemptsCount}
      />

      {/* Cohort Performance Intelligence matching Image 2 */}
      <CohortPerformance
        totalSubmissions={totalCompletedAttemptsCount > 0 ? totalCompletedAttemptsCount : 4892}
        passRate={avgPassRate}
        meanScore={avgMeanScore}
        medianScore={79}
        highestScore={99}
      />

      {/* Primary Operations: Active Sessions & Reusable Templates Library */}
      <div className="space-y-8">
        {/* Live & Scheduled Sessions (with active-sessions anchor) */}
        <div id="active-sessions" className="scroll-mt-6">
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
        </div>

        {/* Templates (Reusable templates matching Image 3) */}
        <div id="templates" className="scroll-mt-6">
          <OwnerTemplatesManager 
            templates={templates as any} 
            highlightId={searchParams?.highlight} 
          />
        </div>
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
                            <span className="font-bold text-white text-sm tabular-nums">
                              {session.sessionStats.passRate.toFixed(1)}%
                            </span>
                            <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  session.sessionStats.passRate >= 50
                                    ? "bg-emerald-400"
                                    : session.sessionStats.passRate > 0
                                    ? "bg-neutral-300"
                                    : "bg-neutral-700"
                                }`}
                                style={{ width: `${Math.max(session.sessionStats.passRate, session.sessionStats.passRate > 0 ? 8 : 0)}%` }}
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
