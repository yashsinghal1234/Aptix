import React from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { getCachedResultsData } from "@/lib/dashboard-cache";
import { Flower } from "@/components/owner/OpsPanels";

export const dynamic = "force-dynamic";

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function ResultsDashboard() {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) redirect("/");

  const completedSessions = await getCachedResultsData();

  const totalCandidates = completedSessions.reduce((a, s) => a + (s._count?.attempts ?? 0), 0);
  const withStats = completedSessions.filter((s) => s._count.attempts > 0 && s.sessionStats);
  const avgPass = withStats.length
    ? withStats.reduce((a, s) => a + (s.sessionStats?.passRate ?? 0), 0) / withStats.length
    : 0;

  return (
    <div className="max-w-[1440px] mx-auto space-y-4 pb-8">
      <div className="flex items-start justify-between gap-6 px-1 pt-1">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] text-lime-200/80 mb-3">
            ARCHIVE / ASSESSMENT REPORTS
          </p>
          <h1 className="text-3xl sm:text-[40px] font-black text-white tracking-tight leading-none">
            Assessment history, readable<span className="text-lime-300">.</span>
          </h1>
          <p className="text-[13px] text-neutral-400 mt-2.5">
            Review psychometric analytics, cohort metrics, and item analysis for completed exam sessions.
          </p>
        </div>
        <Flower className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 mt-1" />
      </div>

      <div className="flex flex-wrap gap-1.5 px-1">
        <span className="text-[9px] font-black tracking-[0.12em] text-lime-200 bg-lime-300/[0.08] border border-lime-300/25 rounded-md px-2 py-1">
          {completedSessions.length} ARCHIVED
        </span>
        <span className="text-[9px] font-bold tracking-[0.12em] text-neutral-300 bg-white/[0.05] border border-white/10 rounded-md px-2 py-1">
          {totalCandidates.toLocaleString()} TOTAL CANDIDATES · {avgPass.toFixed(1)}% AVG PASS RATE
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "Completed sessions", v: String(completedSessions.length), s: "locked snapshots · immutable" },
          { l: "Total candidates", v: totalCandidates.toLocaleString(), s: "across archived sessions" },
          { l: "Average pass rate", v: `${avgPass.toFixed(1)}%`, s: `${withStats.length} evaluated sessions`, lime: true },
          { l: "Sessions with attempts", v: String(completedSessions.filter((s) => s._count.attempts > 0).length), s: "ready for item analysis" },
        ].map((c: any) => (
          <div key={c.l} className="rounded-2xl border border-white/10 bg-[#0e0f13] p-4">
            <p className="text-[11px] font-medium text-neutral-400">{c.l}</p>
            <p className={`mt-1.5 text-[26px] leading-none font-black tracking-tight tabular-nums ${c.lime ? "text-lime-300" : "text-white"}`}>{c.v}</p>
            <p className="mt-2 text-[10px] font-medium text-neutral-500">{c.s}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-[15px] font-bold text-white">Completed sessions</h2>
          <span className="text-[9px] font-black tracking-[0.14em] text-lime-200 bg-lime-300/10 border border-lime-300/25 rounded-full px-2.5 py-1 tabular-nums">
            {completedSessions.length} SESSIONS
          </span>
        </div>
        <p className="text-[10px] text-neutral-500 mb-3">
          Pass threshold 40% · mean uses the locked assessment snapshot · every report is audit-trailed.
        </p>

        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="pb-2.5 text-[9px] font-bold tracking-[0.16em] text-neutral-500 uppercase text-left">
                  ASSESSMENT
                </th>
                <th className="pb-2.5 text-[9px] font-bold tracking-[0.16em] text-neutral-500 uppercase text-center w-[130px]">
                  CONDUCTED
                </th>
                <th className="pb-2.5 text-[9px] font-bold tracking-[0.16em] text-neutral-500 uppercase text-center w-[130px]">
                  CANDIDATES
                </th>
                <th className="pb-2.5 text-[9px] font-bold tracking-[0.16em] text-neutral-500 uppercase text-center w-[180px]">
                  PASS RATE
                </th>
                <th className="pb-2.5 text-[9px] font-bold tracking-[0.16em] text-neutral-500 uppercase text-center w-[130px]">
                  MEAN SCORE
                </th>
                <th className="pb-2.5 text-[9px] font-bold tracking-[0.16em] text-neutral-500 uppercase text-right w-[140px]">
                  REPORT
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {completedSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-xs text-neutral-500 py-8 text-center">
                    No completed exam sessions recorded yet.
                  </td>
                </tr>
              ) : (
                completedSessions.map((session) => {
                  const totalMarks =
                    session.questions.reduce((sum, q) => sum + q.points, 0) || session.exam.totalMarks || 1;
                  const attempts = session._count.attempts;
                  const stats = session.sessionStats;
                  const passRate = stats ? stats.passRate : 0;
                  const date = session.startTime ?? session.createdAt;

                  return (
                    <tr key={session.id} className="transition-colors hover:bg-white/[0.02]">
                      <td className="py-3 pr-4 align-middle">
                        <p className="text-xs font-bold text-white truncate capitalize">{session.exam.title}</p>
                        <p className="text-[10px] text-neutral-500 truncate mt-0.5">
                          {session.exam.instructions || "Standard Assessment"}
                        </p>
                      </td>

                      <td className="py-3 px-3 text-[11px] text-neutral-300 font-medium tabular-nums text-center whitespace-nowrap align-middle">
                        {fmtDate(new Date(date))}
                      </td>

                      <td className="py-3 px-3 text-xs font-bold text-white tabular-nums text-center whitespace-nowrap align-middle">
                        {attempts}{" "}
                        <span className="font-medium text-neutral-500">
                          {attempts === 1 ? "candidate" : "candidates"}
                        </span>
                      </td>

                      <td className="py-3 px-3 align-middle">
                        {attempts === 0 ? (
                          <p className="text-[11px] text-neutral-600 text-center">No attempts</p>
                        ) : stats ? (
                          <div className="flex items-center justify-center gap-2.5">
                            <span className="font-bold text-white text-[11px] tabular-nums w-11 shrink-0 text-right">
                              {passRate.toFixed(1)}%
                            </span>
                            <div className="w-24 xl:w-28 h-1.5 bg-white/[0.06] rounded-full overflow-hidden shrink-0">
                              <div
                                className={`h-full rounded-full ${passRate >= 40 ? "bg-lime-300" : passRate > 0 ? "bg-[#f2a488]" : "bg-neutral-800"}`}
                                style={{ width: `${Math.max(passRate, passRate > 0 ? 8 : 0)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-neutral-500 italic text-center">Evaluating</p>
                        )}
                      </td>

                      <td className="py-3 px-3 text-[11px] font-bold text-white tabular-nums text-center whitespace-nowrap align-middle">
                        {attempts === 0 ? (
                          <span className="text-neutral-600 font-medium">—</span>
                        ) : (
                          <>
                            {stats ? stats.meanScore.toFixed(1) : "—"}{" "}
                            <span className="text-neutral-500 font-medium">/ {totalMarks}</span>
                          </>
                        )}
                      </td>

                      <td className="py-3 pl-3 text-right align-middle">
                        <Link
                          href={`/dashboard/owner/results/${session.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-200 bg-white/[0.06] hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
                        >
                          View Report
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-[10px] text-neutral-600">
          <span>Scores use locked snapshots. Percentages rounded to one decimal place; flags never modify marks.</span>
          <span className="shrink-0 ml-3 tabular-nums">{completedSessions.length} archived · {totalCandidates.toLocaleString()} candidates</span>
        </div>
      </div>
    </div>
  );
}
