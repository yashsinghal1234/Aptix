import React from "react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import Link from "next/link";

export default async function CandidateRecordsPage() {
  const token = cookies().get("token")?.value;
  if (!token) redirect("/");

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") redirect("/");

  const candidates = await prisma.user.findMany({
    where: { role: "CANDIDATE" },
    orderBy: { createdAt: "desc" },
    include: {
      attempts: {
        include: {
          session: {
            include: { exam: true }
          },
          responses: true
        },
        orderBy: { createdAt: "desc" }
      },
      cheatFlags: {
        include: { session: true }
      }
    }
  });

  const totalCandidates = candidates.length;
  const totalAttempts = candidates.reduce((sum, c) => sum + c.attempts.length, 0);
  const totalFlags = candidates.reduce((sum, c) => sum + c.cheatFlags.length, 0);

  const getAttemptScore = (attempt: { responses: { earnedPoints: number }[] }) =>
    attempt.responses.reduce((sum, r) => sum + r.earnedPoints, 0);

  const completedAttempts = candidates.flatMap(c => c.attempts.filter(a => a.status === "SUBMITTED"));
  const avgScore = completedAttempts.length > 0
    ? Math.round((completedAttempts.reduce((sum, a) => sum + getAttemptScore(a), 0) / completedAttempts.length) * 10) / 10
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/owner" className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors">
              &larr; Executive Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Candidate Records</h1>
          <p className="text-slate-500 text-xs mt-1">
            Comprehensive directory of all registered candidates, assessment history, performance analytics, and integrity records.
          </p>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Candidates</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalCandidates}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Attempts</p>
            <p className="text-2xl font-black text-cyan-600 mt-0.5">{totalAttempts}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Score</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{avgScore}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Integrity Flags</p>
            <p className="text-2xl font-black text-rose-600 mt-0.5">{totalFlags}</p>
          </div>
        </div>
      </div>

      {/* Candidate Directory Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Registered Candidates Directory</h2>
            <p className="text-xs text-slate-400">Showing {candidates.length} student records and attempt history</p>
          </div>
        </div>

        {candidates.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No candidates have registered on the platform yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-400 uppercase tracking-wider font-bold">
                  <th className="px-6 py-4">Candidate</th>
                  <th className="px-6 py-4">Registered Date</th>
                  <th className="px-6 py-4">Assessments Attempted</th>
                  <th className="px-6 py-4">Best / Latest Score</th>
                  <th className="px-6 py-4">Integrity Signals</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map((c) => {
                  const bestScore = c.attempts.length > 0
                    ? Math.max(...c.attempts.map(a => getAttemptScore(a)))
                    : null;
                  const latestAttempt = c.attempts[0] || null;
                  const candidateFlagsCount = c.cheatFlags.length;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-xs shadow-soft-sm">
                            {c.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-sm block">{c.name}</span>
                            <span className="text-[11px] text-slate-400">{c.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 text-xs">
                          {c.attempts.length} {c.attempts.length === 1 ? "Exam" : "Exams"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {latestAttempt ? (
                          <div>
                            <span className="font-extrabold text-indigo-600 text-sm">{getAttemptScore(latestAttempt)} pts</span>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                              {latestAttempt.session.exam.title}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No attempts</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {candidateFlagsCount > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            {candidateFlagsCount} {candidateFlagsCount === 1 ? "flag" : "flags"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                            Clean
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {latestAttempt ? (
                          <div className="flex justify-end items-center gap-1.5 flex-wrap">
                            <Link
                              href={`/dashboard/owner/results/${latestAttempt.examSessionId}/candidate/${latestAttempt.id}`}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-100 transition-colors"
                            >
                              <span>Audit</span>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                            </Link>

                            {latestAttempt.status === "SUBMITTED" && (
                              <>
                                <form action={async (formData) => {
                                  "use server";
                                  const { reopenCandidateAttemptAction } = await import("@/app/actions/session");
                                  await reopenCandidateAttemptAction(formData);
                                }}>
                                  <input type="hidden" name="attemptId" value={latestAttempt.id} />
                                  <input type="hidden" name="minutes" value="10" />
                                  <button 
                                    type="submit" 
                                    title="Reopen: Keeps previous answers and grants 10 minutes"
                                    className="text-[11px] px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg transition-colors border border-emerald-200 shadow-sm flex items-center gap-1"
                                  >
                                    <span>🔓</span>
                                    <span>Reopen (+10m)</span>
                                  </button>
                                </form>

                                <form action={async (formData) => {
                                  "use server";
                                  const { resetCandidateAttemptAction } = await import("@/app/actions/session");
                                  await resetCandidateAttemptAction(formData);
                                }}>
                                  <input type="hidden" name="attemptId" value={latestAttempt.id} />
                                  <button 
                                    type="submit" 
                                    title="Full Reset: Clears answers and grants a fresh retake"
                                    className="text-[11px] px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg transition-colors border border-amber-200 shadow-sm flex items-center gap-1"
                                  >
                                    <span>🔄</span>
                                    <span>Retake</span>
                                  </button>
                                </form>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs font-medium">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
