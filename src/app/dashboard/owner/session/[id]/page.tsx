import React from "react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import Link from "next/link";
import { extendSessionTimeAction, extendCandidateTimeAction, endSessionAction } from "@/app/actions/session";
import { OwnerSessionTimer } from "@/components/OwnerSessionTimer";

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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link href="/dashboard/owner" className="text-slate-500 hover:text-indigo-600 transition-colors">
              &larr; Back to Dashboard
            </Link>
            <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${
              session.status === 'LIVE' ? 'bg-green-100 text-green-700' :
              session.status === 'COMPLETED' ? 'bg-slate-200 text-slate-700' :
              'bg-indigo-100 text-indigo-700'
            }`}>
              {session.status}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-slate-800">{session.exam.title} - Live Monitor</h1>
            {session.status !== "COMPLETED" && (
              <div className="bg-indigo-50 px-3 py-1.5 rounded-md border border-indigo-100 flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Time Left</span>
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
            <form id="auto-end-session-form" action={endSessionAction}>
              <input type="hidden" name="sessionId" value={session.id} />
              <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition-all flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path></svg>
                End Exam
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm border-l-4 border-l-slate-400">
          <p className="text-sm font-medium text-slate-500 mb-1">Total Candidates</p>
          <p className="text-3xl font-bold text-slate-800">{totalCount}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm border-l-4 border-l-blue-500">
          <p className="text-sm font-medium text-slate-500 mb-1">In Progress</p>
          <p className="text-3xl font-bold text-blue-600">{inProgressCount}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm border-l-4 border-l-green-500">
          <p className="text-sm font-medium text-slate-500 mb-1">Submitted</p>
          <p className="text-3xl font-bold text-green-600">{submittedCount}</p>
        </div>
        
        {/* Global Extension */}
        {session.status !== "COMPLETED" && (
          <div className="bg-indigo-50 p-6 rounded-xl border shadow-sm flex flex-col justify-center">
            <p className="text-sm font-semibold text-indigo-800 mb-3">Global Time Extension</p>
            <div className="flex gap-2">
              {[5, 10, 15].map(mins => (
                <form key={mins} action={extendSessionTimeAction} className="flex-1">
                  <input type="hidden" name="sessionId" value={session.id} />
                  <input type="hidden" name="minutes" value={mins} />
                  <button className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded transition-colors">
                    +{mins}m
                  </button>
                </form>
              ))}
            </div>
            {session.extendedUntil && (
              <p className="text-xs text-indigo-600 mt-2 font-medium">
                Extended until: {session.extendedUntil.toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-slate-800">Candidate Progress</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Candidate</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Progress</th>
                <th className="px-6 py-4 font-medium">Score</th>
                <th className="px-6 py-4 font-medium">Integrity Flags</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {session.attempts.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No candidates have started yet.</td></tr>
              ) : (
                session.attempts.map(attempt => {
                  const flags = session.cheatFlags.filter(f => f.userId === attempt.userId).length;
                  const progressPct = totalQuestions === 0 ? 0 : Math.round((attempt.responses.length / totalQuestions) * 100);

                  return (
                    <tr key={attempt.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">{attempt.user.name}</p>
                        <p className="text-xs text-slate-500">{attempt.user.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${attempt.status === 'SUBMITTED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {attempt.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden w-24">
                            <div className="h-full bg-indigo-500" style={{ width: `${progressPct}%` }} />
                          </div>
                          <span className="text-xs font-medium text-slate-600 w-12">{attempt.responses.length} / {totalQuestions}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {attempt.status === "SUBMITTED" ? (
                          <div className="font-semibold text-slate-800">
                            {attempt.responses.reduce((sum, r) => sum + r.earnedPoints, 0)} / {session.totalMarks || session.exam.totalMarks || 0}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">In progress...</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {flags > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            ⚠️ {flags} Flag{flags > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {session.status !== "COMPLETED" && attempt.status === "IN_PROGRESS" && (
                          <div className="flex justify-end items-center gap-2">
                            <div className="flex gap-1">
                              {[5, 10, 15].map(mins => (
                                <form key={mins} action={extendCandidateTimeAction}>
                                  <input type="hidden" name="attemptId" value={attempt.id} />
                                  <input type="hidden" name="minutes" value={mins} />
                                  <button className="text-[10px] px-2 py-1 bg-indigo-50 text-indigo-700 rounded font-medium hover:bg-indigo-100 transition-colors border border-indigo-100">
                                    +{mins}m
                                  </button>
                                </form>
                              ))}
                            </div>
                            {attempt.extendedUntil && (
                              <span className="text-xs text-indigo-600 font-medium" title={attempt.extendedUntil.toLocaleTimeString()}>
                                (Extended)
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
