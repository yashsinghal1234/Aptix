import React from "react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import Link from "next/link";

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
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">History & Results</h1>
        <p className="text-slate-500 mt-2">View analytics and item analysis for completed exam sessions.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-6 py-4 font-medium">Exam Template</th>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">Candidates</th>
              <th className="px-6 py-4 font-medium">Pass Rate</th>
              <th className="px-6 py-4 font-medium">Mean Score</th>
              <th className="px-6 py-4 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {completedSessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  No completed exams found.
                </td>
              </tr>
            ) : (
              completedSessions.map(session => {
                const totalMarks = session.questions.reduce((sum, q) => sum + q.points, 0) || session.exam.totalMarks || 1;
                return (
                <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{session.exam.title}</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-[250px] truncate">{session.exam.instructions || "No instructions"}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {session.startTime ? session.startTime.toLocaleDateString() : session.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {session._count.attempts}
                  </td>
                  <td className="px-6 py-4">
                    {session.sessionStats ? (
                      <span className={`font-semibold ${session.sessionStats.passRate >= 50 ? 'text-green-600' : 'text-amber-600'}`}>
                        {session.sessionStats.passRate.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Pending...</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">
                    {session.sessionStats ? session.sessionStats.meanScore.toFixed(1) : "—"} / {totalMarks}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/dashboard/owner/results/${session.id}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      View Report &rarr;
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
  );
}
