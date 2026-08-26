import React from "react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import Link from "next/link";
import { setQuestionStatusAction } from "@/app/actions/exam";

export default async function SessionAnalyticsPage({ params }: { params: { sessionId: string } }) {
  const token = cookies().get("token")?.value;
  if (!token) redirect("/");
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") redirect("/");

  const session = await prisma.examSession.findUnique({
    where: { id: params.sessionId },
    include: {
      exam: true,
      sessionStats: true,
      questionStats: {
        include: { question: true },
        orderBy: { discrimination: "asc" } // Worst performing questions first
      },
      attempts: {
        include: { user: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!session) return <div>Session not found</div>;

  // Re-calculate basic candidate scores for display
  const attemptsWithScores = await prisma.candidateAttempt.findMany({
    where: { examSessionId: params.sessionId },
    include: { user: true, responses: true },
  });

  const rankedAttempts = attemptsWithScores.map(attempt => ({
    ...attempt,
    score: attempt.responses.reduce((sum, r) => sum + r.earnedPoints, 0)
  })).sort((a, b) => b.score - a.score);

  // Compute totalMarks dynamically
  const sessionQuestions = await prisma.question.findMany({
    where: { examSessions: { some: { id: params.sessionId } } }
  });
  const totalMarks = sessionQuestions.reduce((sum, q) => sum + q.points, 0) || session.exam.totalMarks || 1;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/owner/results" className="text-sm font-medium text-slate-500 hover:text-indigo-600 mb-2 inline-block">
            &larr; Back to Results
          </Link>
          <h1 className="text-3xl font-bold text-slate-800">{session.exam.title}</h1>
          <p className="text-slate-500 mt-1">Detailed Analytics Report</p>
        </div>
        <a 
          href={`/api/export?sessionId=${session.id}`}
          target="_blank"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
        >
          Download CSV Report
        </a>
      </div>

      {session.sessionStats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <p className="text-sm font-medium text-slate-500">Mean Score</p>
            <p className="text-3xl font-bold text-slate-800">{session.sessionStats.meanScore.toFixed(1)} / {totalMarks}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <p className="text-sm font-medium text-slate-500">Median Score</p>
            <p className="text-3xl font-bold text-slate-800">{session.sessionStats.medianScore.toFixed(1)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <p className="text-sm font-medium text-slate-500">Pass Rate</p>
            <p className={`text-3xl font-bold ${session.sessionStats.passRate >= 50 ? 'text-green-600' : 'text-amber-600'}`}>
              {session.sessionStats.passRate.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <p className="text-sm font-medium text-slate-500">Highest Score</p>
            <p className="text-3xl font-bold text-slate-800">{session.sessionStats.highestScore.toFixed(1)}</p>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
          Analytics have not been computed yet. Ensure the session is marked as COMPLETED.
        </div>
      )}

      {/* Item Analysis */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-slate-800">Item Analysis (Question Performance)</h2>
          <p className="text-sm text-slate-500 mt-1">
            Questions with p-value {"<"} 0.25 (too hard) or discrimination {"<"} 0 (flawed) are flagged.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Question</th>
                <th className="px-6 py-4 font-medium">p-value (Difficulty)</th>
                <th className="px-6 py-4 font-medium">Discrimination Index</th>
                <th className="px-6 py-4 font-medium">Avg Time (s)</th>
                <th className="px-6 py-4 font-medium">Distractor Spread</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {session.questionStats.map(stat => {
                const isFlagged = stat.pValue < 0.25 || stat.discrimination <= 0;
                let distractors = {};
                try { distractors = JSON.parse(stat.distractors); } catch(e) {}
                const distractorEntries = Object.entries(distractors).sort((a: any, b: any) => b[1] - a[1]);

                return (
                  <tr key={stat.id} className={isFlagged ? "bg-red-50/50" : "hover:bg-slate-50"}>
                    <td className="px-6 py-4">
                      <div className="max-w-[300px] truncate font-medium text-slate-800" title={stat.question.text}>
                        {stat.question.text}
                      </div>
                      {isFlagged && (
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider">
                          Review Recommended
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {stat.pValue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <span className={stat.discrimination <= 0 ? "text-red-600 font-bold" : "text-green-600"}>
                        {stat.discrimination.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {stat.avgTimeSpent.toFixed(1)}s
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 flex-wrap max-w-[200px]">
                        {distractorEntries.map(([opt, count]: any) => (
                          <span key={opt} className="text-xs bg-slate-100 px-2 py-1 rounded" title={opt}>
                            {count}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cohort Leaderboard / Candidates */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-slate-800">Candidate Results</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Rank</th>
                <th className="px-6 py-4 font-medium">Candidate</th>
                <th className="px-6 py-4 font-medium">Score</th>
                <th className="px-6 py-4 font-medium text-right">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rankedAttempts.map((attempt, idx) => (
                <tr key={attempt.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-400">
                    #{idx + 1}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{attempt.user.name}</p>
                    <p className="text-xs text-slate-500">{attempt.user.email}</p>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700">
                    {attempt.score.toFixed(1)} / {totalMarks}
                    <span className="text-xs font-normal text-slate-500 ml-2">
                      ({((attempt.score / totalMarks) * 100).toFixed(1)}%)
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/dashboard/owner/results/${session.id}/candidate/${attempt.id}`}
                      className="text-sm font-medium text-indigo-600 hover:underline"
                    >
                      Detailed Report &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
