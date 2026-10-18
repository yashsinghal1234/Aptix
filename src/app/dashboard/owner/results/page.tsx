import React from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { getCachedResultsData } from "@/lib/dashboard-cache";
import { FilterChip } from "@/components/owner/FilterChip";

export const dynamic = "force-dynamic";

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** Solid Notion/Stacklane-style status pill. */
function StatusPill({ tone, label }: { tone: "green" | "amber" | "gray"; label: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-[3px] rounded-md text-[10.5px] font-bold whitespace-nowrap ${
        tone === "green" ? "bg-lime-300 text-black" : tone === "amber" ? "bg-amber-400 text-black" : "bg-zinc-600 text-zinc-100"
      }`}
    >
      {label}
    </span>
  );
}

export default async function ResultsDashboard({
  searchParams,
}: {
  searchParams: { filter?: string; sort?: string };
}) {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) redirect("/");

  const completedSessions = await getCachedResultsData();
  const filter = searchParams.filter || "";
  const sort = searchParams.sort || "";

  const totalCandidates = completedSessions.reduce((a, s) => a + (s._count?.attempts ?? 0), 0);
  const withStats = completedSessions.filter((s) => s._count.attempts > 0 && s.sessionStats);
  const avgPass = withStats.length
    ? withStats.reduce((a, s) => a + (s.sessionStats?.passRate ?? 0), 0) / withStats.length
    : 0;

  // Build result hrefs preserving the other param
  const href = (over: { filter?: string; sort?: string }) => {
    const params = new URLSearchParams();
    if (filter) params.set("filter", filter);
    if (sort) params.set("sort", sort);
    for (const [k, v] of Object.entries(over)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    const qs = params.toString();
    return `/dashboard/owner/results${qs ? `?${qs}` : ""}`;
  };

  // Filter + sort the rows server-side
  let sessions = [...completedSessions];
  if (filter === "attempts") sessions = sessions.filter((s) => s._count.attempts > 0);
  else if (filter === "evaluating") sessions = sessions.filter((s) => s._count.attempts > 0 && !s.sessionStats);
  else if (filter === "empty") sessions = sessions.filter((s) => s._count.attempts === 0);

  const ts = (s: any) => (s.startTime ?? s.createdAt).getTime();
  if (sort === "oldest") sessions.sort((a, b) => ts(a) - ts(b));
  else if (sort === "pass") sessions.sort((a, b) => (b.sessionStats?.passRate ?? -1) - (a.sessionStats?.passRate ?? -1));
  else if (sort === "candidates") sessions.sort((a, b) => b._count.attempts - a._count.attempts);
  else sessions.sort((a, b) => ts(b) - ts(a));

  const CELL = "border-l border-white/[0.06]";

  return (
    <div className="max-w-[1440px] mx-auto space-y-4 pb-8 rise-in">
      <div className="flex items-center justify-between gap-6 px-1 pt-1">
        <h1 className="text-3xl sm:text-[40px] font-black text-white tracking-tight leading-none">
          Assessment history, readable<span className="text-lime-300">.</span>
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <FilterChip
            label={filter === "attempts" ? "With attempts" : filter === "evaluating" ? "Evaluating" : filter === "empty" ? "No attempts" : "All sessions"}
            options={[
              { href: href({ filter: "" }), label: "All sessions", active: filter === "" },
              { href: href({ filter: "attempts" }), label: "With attempts", active: filter === "attempts" },
              { href: href({ filter: "evaluating" }), label: "Evaluating", active: filter === "evaluating" },
              { href: href({ filter: "empty" }), label: "No attempts", active: filter === "empty" },
            ]}
          />
          <FilterChip
            label={sort === "oldest" ? "Oldest first" : sort === "pass" ? "Highest pass rate" : sort === "candidates" ? "Most candidates" : "Newest first"}
            options={[
              { href: href({ sort: "" }), label: "Newest first", active: sort === "" },
              { href: href({ sort: "oldest" }), label: "Oldest first", active: sort === "oldest" },
              { href: href({ sort: "pass" }), label: "Highest pass rate", active: sort === "pass" },
              { href: href({ sort: "candidates" }), label: "Most candidates", active: sort === "candidates" },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "Completed sessions", v: String(completedSessions.length) },
          { l: "Total candidates", v: totalCandidates.toLocaleString() },
          { l: "Average pass rate", v: `${avgPass.toFixed(1)}%`, lime: true },
          { l: "Sessions with attempts", v: String(completedSessions.filter((s) => s._count.attempts > 0).length) },
        ].map((c: any) => (
          <div key={c.l} className="rounded-2xl border border-white/10 bg-[#0e0f13] p-4 flex flex-col justify-center">
            <p className="text-[11px] font-medium text-neutral-400">{c.l}</p>
            <p className={`mt-1.5 text-[26px] leading-none font-black tracking-tight tabular-nums ${c.lime ? "text-lime-300" : "text-white"}`}>{c.v}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-4 sm:p-5 overflow-hidden">
        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full min-w-[1000px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="px-3 py-3 text-[11px] font-medium text-neutral-400 text-center">Assessment</th>
                <th className={`px-3 py-3 text-[11px] font-medium text-neutral-400 text-center w-[120px] ${CELL}`}>Status</th>
                <th className={`px-3 py-3 text-[11px] font-medium text-neutral-400 text-center w-[150px] ${CELL}`}>Conducted</th>
                <th className={`px-3 py-3 text-[11px] font-medium text-neutral-400 text-center w-[140px] ${CELL}`}>Candidates</th>
                <th className={`px-3 py-3 text-[11px] font-medium text-neutral-400 text-center w-[180px] ${CELL}`}>Pass rate</th>
                <th className={`px-3 py-3 text-[11px] font-medium text-neutral-400 text-center w-[140px] ${CELL}`}>Mean score</th>
                <th className={`px-3 py-3 text-[11px] font-medium text-neutral-400 text-center w-[150px] ${CELL}`}>Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-xs text-neutral-500 py-8 text-center">
                    {filter === "empty" && completedSessions.length > 0
                      ? "No sessions without attempts."
                      : "No completed exam sessions recorded yet."}
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  const totalMarks =
                    session.questions.reduce((sum: number, q: any) => sum + q.points, 0) || session.exam.totalMarks || 1;
                  const attempts = session._count.attempts;
                  const stats = session.sessionStats;
                  const passRate = stats ? stats.passRate : 0;
                  const date = session.startTime ?? session.createdAt;

                  const status =
                    attempts === 0
                      ? { tone: "gray" as const, label: "No attempts" }
                      : stats
                        ? { tone: "green" as const, label: "Evaluated" }
                        : { tone: "amber" as const, label: "Evaluating" };

                  return (
                    <tr key={session.id} className="transition-colors hover:bg-white/[0.03]">
                      <td className="py-3 px-3 align-middle max-w-[420px]">
                        <Link
                          href={`/dashboard/owner/results/${session.id}`}
                          className="block text-[13px] font-bold text-white underline decoration-white/20 underline-offset-[3px] hover:decoration-lime-300/80 truncate capitalize"
                        >
                          {session.exam.title}
                        </Link>
                      </td>

                      <td className={`py-3 px-3 text-center whitespace-nowrap align-middle ${CELL}`}>
                        <StatusPill tone={status.tone} label={status.label} />
                      </td>

                      <td className={`py-3 px-3 text-[11px] text-neutral-300 font-medium tabular-nums text-center whitespace-nowrap align-middle ${CELL}`}>
                        {fmtDate(new Date(date))}
                      </td>

                      <td className={`py-3 px-3 text-xs font-bold text-white tabular-nums text-center whitespace-nowrap align-middle ${CELL}`}>
                        {attempts}{" "}
                        <span className="font-medium text-neutral-500">
                          {attempts === 1 ? "candidate" : "candidates"}
                        </span>
                      </td>

                      <td className={`py-3 px-3 align-middle text-center ${CELL}`}>
                        {attempts === 0 || !stats ? (
                          <span className="text-[11px] text-neutral-600">—</span>
                        ) : (
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
                        )}
                      </td>

                      <td className={`py-3 px-3 text-[11px] font-bold text-white tabular-nums text-center whitespace-nowrap align-middle ${CELL}`}>
                        {attempts === 0 ? (
                          <span className="text-neutral-600 font-medium">—</span>
                        ) : (
                          <>
                            {stats ? stats.meanScore.toFixed(1) : "—"}{" "}
                            <span className="text-neutral-500 font-medium">/ {totalMarks}</span>
                          </>
                        )}
                      </td>

                      <td className={`py-3 px-3 text-center whitespace-nowrap align-middle ${CELL}`}>
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
      </div>
    </div>
  );
}
