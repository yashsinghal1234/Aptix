import React from "react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CandidateReportPage({ params }: { params: { sessionId: string, attemptId: string } }) {
  const token = cookies().get("token")?.value;
  if (!token) redirect("/");
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") redirect("/");

  const attempt = await prisma.candidateAttempt.findUnique({
    where: { id: params.attemptId },
    include: {
      user: true,
      session: {
        include: { exam: true }
      },
      responses: {
        include: { question: true }
      }
    }
  });

  if (!attempt) return <div>Attempt not found</div>;

  const totalScore = attempt.responses.reduce((sum, r) => sum + r.earnedPoints, 0);
  
  const sessionQuestions = await prisma.question.findMany({
    where: { examSessions: { some: { id: params.sessionId } } }
  });
  const totalMarks = sessionQuestions.reduce((sum, q) => sum + q.points, 0) || attempt.session.exam.totalMarks || 1;
  const percentage = (totalScore / totalMarks) * 100;
  const timeTakenTotal = attempt.responses.reduce((sum, r) => sum + r.timeTakenSeconds, 0);

  // Fetch cheat flags for this candidate in this session
  const cheatFlags = await prisma.cheatFlag.findMany({
    where: {
      userId: attempt.userId,
      examSessionId: params.sessionId
    }
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href={`/dashboard/owner/results/${params.sessionId}`} className="text-xs font-bold text-slate-400 hover:text-brand-600 mb-2 inline-flex items-center gap-1">
            &larr; Back to Cohort Analytics
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{attempt.user.name}'s Report</h1>
          <p className="text-slate-500 text-xs mt-0.5">{attempt.session.exam.title} &bull; Individual Audit</p>
        </div>
      </div>

      {/* 4 Stat Cards for Candidate (matching reference design bottom-center) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Score</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {totalScore.toFixed(1)} <span className="text-xs text-slate-400 font-normal">/ {totalMarks}</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Accuracy</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{percentage.toFixed(1)}%</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time Taken</p>
            <p className="text-2xl font-black text-cyan-600 mt-0.5">
              {Math.floor(timeTakenTotal / 60)}m {timeTakenTotal % 60}s
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Integrity Flags</p>
            <p className={`text-2xl font-black mt-0.5 ${cheatFlags.length > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
              {cheatFlags.length}
            </p>
          </div>
        </div>
      </div>

      {cheatFlags.length > 0 && (
        <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-6 shadow-soft-sm">
          <h3 className="text-rose-900 font-extrabold text-sm mb-3 flex items-center gap-2">
            ⚠️ Security & Integrity Alerts Recorded ({cheatFlags.length})
          </h3>
          <ul className="space-y-2">
            {cheatFlags.map(flag => (
              <li key={flag.id} className="text-xs text-rose-800 flex justify-between items-center bg-white/80 p-3 rounded-xl border border-rose-100">
                <span><strong>{flag.type}:</strong> {flag.description}</span>
                <span className="text-[11px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">{flag.timestamp.toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Question breakdown table */}
      <div className="bg-white rounded-3xl shadow-soft border border-slate-200/80 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Question-by-Question Evaluation</h2>
            <p className="text-xs text-slate-400 mt-0.5">Exact options selected, time spent per item, and marks allocated</p>
          </div>
          <span className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-100">
            {attempt.responses.length} Answered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4 w-1/3">Question</th>
                <th className="px-6 py-4">Selected Response</th>
                <th className="px-6 py-4">Correct Key</th>
                <th className="px-6 py-4">Points</th>
                <th className="px-6 py-4">Time Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attempt.responses.map((response, idx) => {
                const isCorrect = response.isCorrect;
                return (
                  <tr key={response.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-xs mb-1.5 leading-relaxed">
                        Q{idx + 1}. {response.question.text}
                      </p>
                      {response.question.imageUrl && (
                        <img src={response.question.imageUrl} alt="Question figure" className="max-h-20 rounded-xl border border-slate-200 mt-2" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-bold ${
                        isCorrect 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {response.selectedOption}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {response.question.answerData}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold">
                      <span className={response.earnedPoints > 0 ? "text-emerald-600 font-bold" : (response.earnedPoints < 0 ? "text-rose-600 font-bold" : "text-slate-400")}>
                        {response.earnedPoints > 0 ? '+' : ''}{response.earnedPoints.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {response.timeTakenSeconds}s
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
