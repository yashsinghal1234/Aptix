import React from "react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import Link from "next/link";
import { extendSessionTimeAction, extendCandidateTimeAction, endSessionAction } from "@/app/actions/session";
import { OwnerSessionTimer } from "@/components/OwnerSessionTimer";
import { LiveSessionAutoRefresh } from "@/components/LiveSessionAutoRefresh";

export default async function LiveSessionMonitor({ params }: { params: { id: string } }) {
  const token = cookies().get("token")?.value;
  if (!token) redirect("/");
  
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") redirect("/");

  const session = await prisma.examSession.findUnique({
    where: { id: params.id },
    include: {
      exam: true,
      questions: true,
      cheatFlags: {
        include: { user: true }
      },
      attempts: {
        include: {
          user: true,
          responses: true
        }
      }
    }
  });

  if (!session) return <div>Session not found</div>;

  const totalQuestions = session.questions.length;
  const inProgressCount = session.attempts.filter(a => a.status === "IN_PROGRESS").length;
  const submittedCount = session.attempts.filter(a => a.status === "SUBMITTED").length;
  const totalCount = session.attempts.length;
  const totalMarks = session.questions.reduce((sum, q) => sum + q.points, 0) || session.totalMarks || session.exam.totalMarks || 1;
  const totalFlagsCount = session.cheatFlags.length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard/owner" className="text-xs font-bold text-slate-400 hover:text-brand-600 transition-colors flex items-center gap-1">
              &larr; Return to Dashboard
            </Link>
            <span className="text-slate-300">&bull;</span>
            <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full ${
              session.status === 'LIVE' ? 'bg-emerald-100 text-emerald-700' :
              session.status === 'COMPLETED' ? 'bg-slate-200 text-slate-700' :
              'bg-brand-100 text-brand-700'
            }`}>
              {session.status}
            </span>
            <span className="text-slate-300">&bull;</span>
            <LiveSessionAutoRefresh status={session.status} />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              {session.exam.title}
            </h1>
            {session.status !== "COMPLETED" && (
              <div className="bg-navy-900 text-white px-3.5 py-1.5 rounded-full border border-slate-800 flex items-center gap-2 shadow-sm">
                <svg className="w-3.5 h-3.5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Remaining:</span>
                <OwnerSessionTimer 
                  sessionId={session.id}
                  startTime={session.startTime}
                  durationMinutes={session.durationMinutes}
                  extendedUntil={session.extendedUntil}
                  status={session.status}
                />
              </div>
            )}
          </div>
        </div>

        <div>
          {session.status !== "COMPLETED" && (
            <form id="auto-end-session-form" action={async (formData) => {
              "use server";
              await endSessionAction(formData);
            }}>
              <input type="hidden" name="sessionId" value={session.id} />
              <button className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 text-xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path></svg>
                Force End Exam
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Top 4 Stat Widgets (matching reference design) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Candidates</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Progress</p>
            <p className="text-2xl font-black text-cyan-600 mt-0.5">{inProgressCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submitted</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{submittedCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Integrity Signals</p>
            <p className="text-2xl font-black text-rose-600 mt-0.5">{totalFlagsCount}</p>
          </div>
        </div>
      </div>

      {/* Global Time Extension Bar */}
      {session.status !== "COMPLETED" && (
        <div className="bg-brand-50/60 p-5 rounded-2xl border border-brand-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-soft-sm">
          <div>
            <h3 className="text-xs font-bold text-brand-900 uppercase tracking-wider">Global Time Extension</h3>
            <p className="text-xs text-brand-700 mt-0.5">Extend the countdown clock for every active candidate in this session</p>
          </div>
          <div className="flex items-center gap-2">
            {[5, 10, 15].map(mins => (
              <form key={mins} action={async (formData) => {
                "use server";
                await extendSessionTimeAction(formData);
              }}>
                <input type="hidden" name="sessionId" value={session.id} />
                <input type="hidden" name="minutes" value={mins} />
                <button className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-all shadow-brand">
                  +{mins} mins
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      {/* Candidates Progress Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Live Candidate Monitor</h2>
            <p className="text-xs text-slate-400 mt-0.5">Real-time candidate status, answer progress, and integrity flags</p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {session.attempts.length} Candidates
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Candidate</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Progress</th>
                <th className="px-6 py-4">Current Score</th>
                <th className="px-6 py-4">Integrity Flags</th>
                <th className="px-6 py-4 text-right">Individual Extension</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {session.attempts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                    No candidates have joined or started this session yet.
                  </td>
                </tr>
              ) : (
                session.attempts.map(attempt => {
                  const flags = session.cheatFlags.filter(f => f.userId === attempt.userId).length;
                  const progressPct = totalQuestions === 0 ? 0 : Math.round((attempt.responses.length / totalQuestions) * 100);
                  const isSubmitted = attempt.status === "SUBMITTED";

                  return (
                    <tr key={attempt.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-sm">{attempt.user.name}</p>
                        <p className="text-[11px] text-slate-400">{attempt.user.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full ${
                          isSubmitted ? 'bg-emerald-100 text-emerald-700' : 'bg-cyan-100 text-cyan-700'
                        }`}>
                          {isSubmitted ? "SUBMITTED" : "IN PROGRESS"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden w-28">
                            <div className="h-full bg-brand-600 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-700 w-12">{attempt.responses.length}/{totalQuestions}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isSubmitted ? (
                          <div className="font-bold text-slate-900 text-xs">
                            {attempt.responses.reduce((sum, r) => sum + r.earnedPoints, 0).toFixed(1)} <span className="text-slate-400 font-normal">/ {totalMarks}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Live testing...</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {flags > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                            ⚠️ {flags} Flag{flags > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs font-bold">&mdash;</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {session.status !== "COMPLETED" && attempt.status === "IN_PROGRESS" && (
                          <div className="flex justify-end items-center gap-1.5">
                            {[5, 10, 15].map(mins => (
                              <form key={mins} action={async (formData) => {
                                "use server";
                                await extendCandidateTimeAction(formData);
                              }}>
                                <input type="hidden" name="attemptId" value={attempt.id} />
                                <input type="hidden" name="minutes" value={mins} />
                                <button className="text-[10px] px-2 py-1 bg-brand-50 text-brand-700 rounded-lg font-bold hover:bg-brand-100 transition-colors border border-brand-100">
                                  +{mins}m
                                </button>
                              </form>
                            ))}
                            {attempt.extendedUntil && (
                              <span className="text-[10px] text-brand-600 font-bold bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200" title={attempt.extendedUntil.toLocaleTimeString()}>
                                Ext
                              </span>
                            )}
                          </div>
                        )}
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
