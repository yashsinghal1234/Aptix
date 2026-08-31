import React from "react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

  // Compute category/skill breakdown for the cohort (matching reference design bottom-center)
  const categoryStats: Record<string, { totalEarned: number; totalPossible: number; count: number }> = {};
  
  sessionQuestions.forEach(q => {
    const cat = q.category || "General";
    if (!categoryStats[cat]) {
      categoryStats[cat] = { totalEarned: 0, totalPossible: 0, count: 0 };
    }
    categoryStats[cat].totalPossible += (q.points * (attemptsWithScores.length || 1));
    categoryStats[cat].count += 1;
  });

  attemptsWithScores.forEach(attempt => {
    attempt.responses.forEach(r => {
      const q = sessionQuestions.find(sq => sq.id === r.questionId);
      const cat = q?.category || "General";
      if (categoryStats[cat]) {
        categoryStats[cat].totalEarned += r.earnedPoints;
      }
    });
  });

  const categoryList = Object.entries(categoryStats).map(([name, data]) => {
    const pct = data.totalPossible > 0 ? Math.round((data.totalEarned / data.totalPossible) * 100) : 0;
    return { name, pct, count: data.count };
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/owner/results" className="text-xs font-bold text-slate-400 hover:text-brand-600 mb-2 inline-flex items-center gap-1">
            &larr; Back to Results Directory
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{session.exam.title}</h1>
          <p className="text-slate-500 text-xs mt-0.5">Cohort Analytics & Item Psychometrics Report</p>
        </div>
        <a 
          href={`/api/export?sessionId=${session.id}`}
          target="_blank"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-brand hover:shadow-lg w-fit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export CSV Report
        </a>
      </div>

      {/* 4 Metric Cards (matching reference design) */}
      {session.sessionStats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-soft flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mean Score</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{session.sessionStats.meanScore.toFixed(1)} <span className="text-xs text-slate-400 font-normal">/ {totalMarks}</span></p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-soft flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Median Score</p>
              <p className="text-2xl font-black text-cyan-600 mt-0.5">{session.sessionStats.medianScore.toFixed(1)}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-soft flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pass Rate</p>
              <p className={`text-2xl font-black mt-0.5 ${session.sessionStats.passRate >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {session.sessionStats.passRate.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-soft flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Score</p>
              <p className="text-2xl font-black text-indigo-600 mt-0.5">{session.sessionStats.highestScore.toFixed(1)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-brand-50/60 text-brand-900 rounded-2xl border border-brand-100 text-xs font-semibold">
          Assessment session metrics are finalizing.
        </div>
      )}

      {/* Category Performance Progress Bars (matching reference bottom-center design) */}
      {categoryList.length > 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-soft">
          <div className="mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Category & Skill Breakdown</h2>
            <p className="text-xs text-slate-400 mt-0.5">Average cohort accuracy across tested knowledge domains</p>
          </div>

          <div className="space-y-4">
            {categoryList.map(cat => (
              <div key={cat.name} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">{cat.name} <span className="text-slate-400 font-normal">({cat.count} Questions)</span></span>
                  <span className="font-extrabold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-100">{cat.pct}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                  <div 
                    className="h-full bg-gradient-to-r from-brand-500 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, cat.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cohort Leaderboard / Candidates */}
      <div className="bg-white rounded-3xl shadow-soft border border-slate-200/80 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Candidate Results & Rankings</h2>
            <p className="text-xs text-slate-400 mt-0.5">Individual candidate submissions and question breakdown</p>
          </div>
          <span className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-100">
            {rankedAttempts.length} Total Submissions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Candidate</th>
                <th className="px-6 py-4">Total Score</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rankedAttempts.map((attempt, idx) => (
                <tr key={attempt.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4 font-black text-slate-400 text-sm">
                    #{idx + 1}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 text-sm">{attempt.user.name}</p>
                    <p className="text-[11px] text-slate-400">{attempt.user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 text-sm">
                      {attempt.score.toFixed(1)} <span className="text-slate-400 font-normal text-xs">/ {totalMarks}</span>
                    </div>
                    <span className="text-[11px] font-bold text-brand-600">
                      {((attempt.score / totalMarks) * 100).toFixed(1)}% Accuracy
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/dashboard/owner/results/${session.id}/candidate/${attempt.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-xl transition-all shadow-brand"
                    >
                      <span>View Results</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item Analysis */}
      <div className="bg-white rounded-3xl shadow-soft border border-slate-200/80 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Item Psychometrics & Discrimination</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Questions with p-value &lt; 0.25 (excessively difficult) or discrimination &lt; 0 (inverse validity) are highlighted.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Question Stem</th>
                <th className="px-6 py-4">Difficulty (p-value)</th>
                <th className="px-6 py-4">Discrimination</th>
                <th className="px-6 py-4">Avg Time Spent</th>
                <th className="px-6 py-4">Distractor Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {session.questionStats.map(stat => {
                const isFlagged = stat.pValue < 0.25 || stat.discrimination <= 0;
                let distractors = {};
                try { distractors = JSON.parse(stat.distractors); } catch(e) {}
                const distractorEntries = Object.entries(distractors).sort((a: any, b: any) => b[1] - a[1]);

                return (
                  <tr key={stat.id} className={isFlagged ? "bg-rose-50/40" : "hover:bg-slate-50/60 transition-colors"}>
                    <td className="px-6 py-4">
                      <div className="max-w-[320px] truncate font-bold text-slate-900 text-xs" title={stat.question.text}>
                        {stat.question.text}
                      </div>
                      {isFlagged && (
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 uppercase tracking-wider">
                          Review Recommended
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-700">
                      {stat.pValue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <span className={`font-bold ${stat.discrimination <= 0 ? "text-rose-600" : "text-emerald-600"}`}>
                        {stat.discrimination.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {stat.avgTimeSpent.toFixed(1)}s
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5 flex-wrap max-w-[220px]">
                        {distractorEntries.map(([opt, count]: any) => (
                          <span key={opt} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium" title={opt}>
                            {opt}: {count}
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
    </div>
  );
}
