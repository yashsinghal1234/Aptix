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
import { CohortPerformanceWidget } from "@/components/CohortPerformanceWidget";

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

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-[#0a0c10] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 shadow-md flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-neutral-300 flex items-center justify-center border border-neutral-800 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Templates</p>
            <p className="text-3xl font-black text-white mt-1">{templates.length}</p>
            <p className="text-xs text-neutral-400 font-medium mt-1">{allQuestions.length} Questions &bull; {templates.length} Blueprints</p>
          </div>
        </div>

        <div className="bg-[#0a0c10] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 shadow-md flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-neutral-300 flex items-center justify-center border border-neutral-800 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Active Sessions</p>
            <p className="text-3xl font-black text-white mt-1">{activeSessions.length}</p>
            <p className="text-xs text-neutral-400 font-medium mt-1">{liveSessionsCount} Live &bull; {activeSessions.length - liveSessionsCount} Scheduled</p>
          </div>
        </div>

        <Link href="/dashboard/owner/results" className="bg-[#0a0c10] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 shadow-md flex items-center gap-4 transition-all cursor-pointer">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-neutral-300 flex items-center justify-center border border-neutral-800 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Exams Conducted</p>
            <p className="text-3xl font-black text-white mt-1">{totalCompletedSessionsCount}</p>
            <p className="text-xs text-neutral-400 font-medium mt-1">{totalCompletedAttemptsCount} Student Submissions &bull; {totalCandidatesCount} Candidates</p>
          </div>
        </Link>

        <a href="#review-queue" className="bg-[#0a0c10] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 shadow-md flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-neutral-300 flex items-center justify-center border border-neutral-800 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Integrity & Review</p>
            <p className="text-3xl font-black text-white mt-1">{pendingQuestions.length} Qs</p>
            <p className="text-xs text-neutral-400 font-medium mt-1">{totalCheatFlagsCount} Security Flags &bull; {approvedQuestionsCount} Approved</p>
          </div>
        </a>
      </div>

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

      {/* Cohort Performance Intelligence Widget */}
      <CohortPerformanceWidget />

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
