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
      questions: true,
      sessionStats: true,
      _count: { select: { attempts: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Assessment History & Reports</h1>
        <p className="text-slate-500 text-xs mt-1">Review psychometric analytics, cohort metrics, and item analysis for completed exam sessions.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-soft border border-slate-200/80 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Completed Sessions</h2>
          <span className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-100">
            {completedSessions.length} Archived
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Assessment Title</th>
                <th className="px-6 py-4">Conducted Date</th>
                <th className="px-6 py-4">Candidates</th>
                <th className="px-6 py-4">Pass Rate</th>
                <th className="px-6 py-4">Mean Score</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {completedSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No completed exam sessions recorded yet.
                  </td>
                </tr>
              ) : (
                completedSessions.map(session => {
                  const totalMarks = session.questions.reduce((sum, q) => sum + q.points, 0) || session.exam.totalMarks || 1;
                  return (
                    <tr key={session.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-sm">{session.exam.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 max-w-[280px] truncate">{session.exam.instructions || "Standard Assessment"}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {session.startTime ? session.startTime.toLocaleDateString() : session.createdAt.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">
                        {session._count.attempts} users
                      </td>
                      <td className="px-6 py-4">
                        {session.sessionStats ? (
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            session.sessionStats.passRate >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {session.sessionStats.passRate.toFixed(1)}% Pass
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 text-xs">
                        {session.sessionStats ? session.sessionStats.meanScore.toFixed(1) : "—"} <span className="text-slate-400 font-normal">/ {totalMarks}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/dashboard/owner/results/${session.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-xl transition-all shadow-brand"
                        >
                          <span>View Report</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
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
