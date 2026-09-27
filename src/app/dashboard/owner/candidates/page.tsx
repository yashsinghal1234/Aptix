import React from "react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/owner" className="text-xs font-bold text-neutral-400 hover:text-white transition-colors">
              &larr; Executive Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Candidate Records</h1>
          <p className="text-neutral-400 text-xs mt-1">
            Comprehensive directory of all registered candidates, assessment history, performance analytics, and integrity records.
          </p>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-[#0a0c10] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 shadow-md flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center border border-neutral-800 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Candidates</p>
            <p className="text-2xl font-black text-white mt-0.5">{totalCandidates}</p>
          </div>
        </div>

        <div className="bg-[#0a0c10] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 shadow-md flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-sky-950/40 text-sky-400 flex items-center justify-center border border-sky-800/40 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Total Attempts</p>
            <p className="text-2xl font-black text-sky-400 mt-0.5">{totalAttempts}</p>
          </div>
        </div>

        <div className="bg-[#0a0c10] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 shadow-md flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/40 text-emerald-400 flex items-center justify-center border border-emerald-800/40 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Avg Score</p>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">{avgScore}</p>
          </div>
        </div>

        <div className="bg-[#0a0c10] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 shadow-md flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-rose-950/40 text-rose-400 flex items-center justify-center border border-rose-800/40 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Integrity Flags</p>
            <p className="text-2xl font-black text-rose-400 mt-0.5">{totalFlags}</p>
          </div>
        </div>
      </div>

      {/* Candidate Directory Table */}
      <div className="bg-[#0a0c10] rounded-3xl border border-neutral-800 shadow-md overflow-hidden">
        <div className="p-6 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#07080c]">
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight">Registered Candidates Directory</h2>
            <p className="text-xs text-neutral-400">Showing {candidates.length} student records and attempt history</p>
          </div>
        </div>

        {candidates.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 text-xs">
            No candidates have registered on the platform yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-900/80 border-b border-neutral-800 text-neutral-400 uppercase tracking-wider font-bold">
                  <th className="px-6 py-4">Candidate</th>
                  <th className="px-6 py-4">Registered Date</th>
                  <th className="px-6 py-4">Assessments Attempted</th>
                  <th className="px-6 py-4">Best / Latest Score</th>
                  <th className="px-6 py-4">Integrity Signals</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {candidates.map((c) => {
                  const bestScore = c.attempts.length > 0
                    ? Math.max(...c.attempts.map(a => getAttemptScore(a)))
                    : null;
                  const latestAttempt = c.attempts[0] || null;
                  const candidateFlagsCount = c.cheatFlags.length;

                  return (
                    <tr key={c.id} className="hover:bg-neutral-900/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-700 text-white font-extrabold flex items-center justify-center text-xs shadow-sm">
                            {c.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-white text-sm block">{c.name}</span>
                            <span className="text-[11px] text-neutral-400">{c.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-neutral-400 font-medium">
                        {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-neutral-300 bg-neutral-900 px-2.5 py-1 rounded-full border border-neutral-800 text-xs">
                          {c.attempts.length} {c.attempts.length === 1 ? "Exam" : "Exams"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {latestAttempt ? (
                          <div>
                            <span className="font-extrabold text-white text-sm">{getAttemptScore(latestAttempt)} pts</span>
                            <span className="text-[10px] text-neutral-500 block truncate max-w-[150px]">
                              {latestAttempt.session.exam.title}
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-500 italic text-[11px]">No attempts</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {candidateFlagsCount > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            {candidateFlagsCount} {candidateFlagsCount === 1 ? "flag" : "flags"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
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
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-black bg-white hover:bg-neutral-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                              <span>Audit</span>
                              <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
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
                                    className="text-[11px] px-2 py-1 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 font-bold rounded-lg transition-colors border border-emerald-800/40 shadow-sm flex items-center gap-1 cursor-pointer"
                                  >
                                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                    </svg>
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
                                    className="text-[11px] px-2 py-1 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 font-bold rounded-lg transition-colors border border-amber-800/40 shadow-sm flex items-center gap-1 cursor-pointer"
                                  >
                                    <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <span>Retake</span>
                                  </button>
                                </form>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-500 text-xs font-medium">—</span>
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
