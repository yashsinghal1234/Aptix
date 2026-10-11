import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { getCachedCandidatesData } from "@/lib/dashboard-cache";
import { CandidateRecordsOps } from "@/components/owner/CandidateRecordsOps";
import { Flower } from "@/components/owner/OpsPanels";

export const dynamic = "force-dynamic";

export default async function CandidateRecordsPage() {
  const token = cookies().get("token")?.value;
  if (!token) redirect("/");

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") redirect("/");

  const [candidates, totalCandidates, totalAttempts, totalFlags, responseAvg, sessions] =
    await getCachedCandidatesData();

  const getAttemptScore = (attempt: { responses: { earnedPoints: number }[] }) =>
    attempt.responses.reduce((sum, r) => sum + r.earnedPoints, 0);

  const scoredLatestAttempts = (candidates as any[])
    .map((c) => c.attempts[0])
    .filter((a): a is NonNullable<typeof a> => !!a && a.status === "SUBMITTED");

  const avgScore =
    scoredLatestAttempts.length > 0
      ? Math.round((scoredLatestAttempts.reduce((sum, a) => sum + getAttemptScore(a), 0) / scoredLatestAttempts.length) * 10) / 10
      : (responseAvg as any)._avg.earnedPoints
        ? Math.round((responseAvg as any)._avg.earnedPoints * 10) / 10
        : 0;

  const latestSession = (sessions as any[])[0] || null;
  const scale = latestSession?.exam?.totalMarks || 80;
  const avgPct = scale > 0 ? ((avgScore / scale) * 100).toFixed(1) : "0.0";

  const withAttempts = (candidates as any[]).filter((c) => c._count.attempts > 0).length;
  const flaggedUsers = (candidates as any[]).filter((c) => c._count.cheatFlags > 0).length;

  const rows = (candidates as any[]).map((c: any) => {
    const latest = c.attempts[0] || null;
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      roll: `NB-${String(c.id).slice(-4).toUpperCase()}`,
      totalExams: c._count.attempts,
      latest: latest
        ? {
            attemptId: latest.id,
            sessionId: latest.examSessionId,
            examTitle: latest.session.exam.title,
            totalMarks: latest.session.exam.totalMarks || scale,
            score: getAttemptScore(latest),
            status: latest.status,
          }
        : null,
      flags: c._count.cheatFlags,
    };
  });

  const sessionOpts = (sessions as any[]).map((s: any) => ({
    id: s.id,
    pin: s.pin,
    examTitle: s.exam.title,
  }));

  return (
    <div className="max-w-[1440px] mx-auto space-y-4 pb-8">
      <div className="flex items-start justify-between gap-6 px-1 pt-1">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] text-lime-200/80 mb-3">ROSTER / CANDIDATE DIRECTORY</p>
          <h1 className="text-3xl sm:text-[40px] font-black text-white tracking-tight leading-none">
            Every attempt, accounted for<span className="text-lime-300">.</span>
          </h1>
          <p className="text-[13px] text-neutral-400 mt-2.5">
            Search cohort records, review scores and follow evidence into an individual audit.
          </p>
        </div>
        <Flower className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 mt-1" />
      </div>

      <div className="flex flex-wrap gap-1.5 px-1">
        <span className="text-[9px] font-black tracking-[0.12em] text-lime-200 bg-lime-300/[0.08] border border-lime-300/25 rounded-md px-2 py-1">
          LIVE ROSTER
        </span>
        <span className="text-[9px] font-bold tracking-[0.12em] text-neutral-300 bg-white/[0.05] border border-white/10 rounded-md px-2 py-1">
          Northbridge University · {latestSession ? `${latestSession.exam.title} · ${latestSession.pin || "no pin"}` : "No sessions yet"}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "Registered candidates", v: Number(totalCandidates).toLocaleString(), s: `${withAttempts} submitted · ${Number(totalCandidates) - withAttempts} absent` },
          { l: "Total attempts", v: Number(totalAttempts).toLocaleString(), s: latestSession ? `Latest ${latestSession.exam.title} · ${latestSession._count.attempts} joined` : "No sessions yet" },
          { l: "Cohort average", v: `${avgScore} / ${Math.round(scale)}`, s: `${avgPct}% · submitted attempts`, lime: true },
          { l: "Total flags", v: String(totalFlags), s: `${flaggedUsers} candidates · evidence retained` },
        ].map((c: any) => (
          <div key={c.l} className="rounded-2xl border border-white/10 bg-[#0e0f13] p-4">
            <p className="text-[11px] font-medium text-neutral-400">{c.l}</p>
            <p className={`mt-1.5 text-[26px] leading-none font-black tracking-tight tabular-nums ${c.lime ? "text-lime-300" : "text-white"}`}>{c.v}</p>
            <p className="mt-2 text-[10px] font-medium text-neutral-500">{c.s}</p>
          </div>
        ))}
      </div>

      <CandidateRecordsOps rows={rows} sessions={sessionOpts} />
    </div>
  );
}
