import React from "react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ResultsDashboard() {
  const token = cookies().get("token")?.value;
  if (!token) redirect("/");
  
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") redirect("/");

  const completedSessions = await prisma.examSession.findMany({
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
    ]
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="border-b border-neutral-800 pb-4">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Assessment History & Reports</h1>
        <p className="text-neutral-400 text-xs mt-1">Review psychometric analytics, cohort metrics, and item analysis for completed exam sessions.</p>
      </div>

      <div className="bg-[#0a0c10] rounded-3xl border border-neutral-800 shadow-md overflow-hidden">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-[#07080c]">
          <h2 className="text-base font-bold text-white tracking-tight">Completed Sessions</h2>
          <span className="text-xs font-bold text-neutral-300 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
            {completedSessions.length} Archived
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-900/80 text-neutral-400 uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Assessment Title</th>
                <th className="px-6 py-4">Conducted Date</th>
                <th className="px-6 py-4">Candidates</th>
                <th className="px-6 py-4">Pass Rate</th>
                <th className="px-6 py-4">Mean Score</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {completedSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 font-medium">
                    No completed exam sessions recorded yet.
                  </td>
                </tr>
              ) : (
                completedSessions.map(session => {
                  const totalMarks = session.questions.reduce((sum, q) => sum + q.points, 0) || session.exam.totalMarks || 1;
                  return (
                    <tr key={session.id} className="hover:bg-neutral-900/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-white text-sm capitalize">{session.exam.title}</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5 max-w-[280px] truncate">{session.exam.instructions || "Standard Assessment"}</p>
                      </td>
                      <td className="px-6 py-4 text-neutral-400 font-medium">
                        {session.startTime ? session.startTime.toLocaleDateString() : session.createdAt.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-neutral-200">
                        {session._count.attempts} users
                      </td>
                      <td className="px-6 py-4">
                        {session._count.attempts === 0 ? (
                          <span className="text-neutral-500 text-xs font-medium">No Attempts</span>
                        ) : session.sessionStats ? (
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-white text-xs tabular-nums w-14 shrink-0">
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
                      <td className="px-6 py-4 font-bold text-white text-xs">
                        {session._count.attempts === 0 ? (
                          <span className="text-neutral-500 font-normal">—</span>
                        ) : (
                          <>
                            {session.sessionStats ? session.sessionStats.meanScore.toFixed(1) : "—"}{" "}
                            <span className="text-neutral-500 font-normal">/ {totalMarks}</span>
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/dashboard/owner/results/${session.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-black bg-white hover:bg-neutral-200 px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer"
                        >
                          <span>View Report</span>
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
    </div>
  );
}
