import React from "react";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import { getSessionMascotsMap } from "@/app/actions/mascot";
import { getMascotById } from "@/lib/mascots";
import { ResultReleaseControl, AutoRefresher } from "@/components/owner/SessionMonitor";
import { TeacherPodiumLeaderboard } from "@/components/owner/TeacherPodiumLeaderboard";
import { FileTabs } from "@/components/owner/FileTabs";
import { StackStatCard, TickStrip } from "@/components/owner/Stacklane";

export const dynamic = "force-dynamic";

function verdict(p: number, d: number): { label: string; cls: string } {
  if (d < 0 || p < 0.25) return { label: "Review wording", cls: "text-[#f2a488] bg-[#f2a488]/10 border-[#f2a488]/30" };
  if (p >= 0.75) return { label: "Easy Pass", cls: "text-neutral-300 bg-white/[0.05] border-white/10" };
  if (d >= 0.2) return { label: "Good separation", cls: "text-lime-200 bg-lime-300/10 border-lime-300/30" };
  return { label: "Fair", cls: "text-neutral-300 bg-white/[0.05] border-white/10" };
}

export default async function SessionAnalyticsPage({ params }: { params: { sessionId: string } }) {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) redirect("/");

  const session = await prisma.examSession.findUnique({
    where: { id: params.sessionId },
    include: {
      exam: true,
      sessionStats: true,
      questionStats: { include: { question: true }, orderBy: { discrimination: "asc" } },
      attempts: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!session) return <div className="text-white p-8">Session not found</div>;

  const attemptsWithScores = await prisma.candidateAttempt.findMany({
    where: { examSessionId: params.sessionId },
    include: { user: true, responses: true },
  });

  const sessionMascots = await getSessionMascotsMap(params.sessionId);

  const sessionQuestions = await prisma.question.findMany({
    where: { examSessions: { some: { id: params.sessionId } } },
  });
  const totalMarks = sessionQuestions.reduce((sum, q) => sum + q.points, 0) || session.exam.totalMarks || 1;

  const responseCounts = await prisma.candidateResponse.groupBy({
    by: ["questionId"],
    _count: { id: true },
    where: { attempt: { examSessionId: params.sessionId } },
  });
  const attemptsByQ: Record<string, number> = {};
  for (const r of responseCounts) attemptsByQ[r.questionId] = r._count.id;

  const ranked = attemptsWithScores
    .map((a) => {
      const timeTakenSeconds = a.submittedAt && (a.startedAt || a.createdAt)
        ? Math.max(0, Math.round((new Date(a.submittedAt).getTime() - new Date(a.startedAt || a.createdAt).getTime()) / 1000))
        : null;
      return {
        ...a,
        score: a.responses.reduce((s, r) => s + r.earnedPoints, 0),
        timeTakenSeconds,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.status === "SUBMITTED" && b.status !== "SUBMITTED") return -1;
      if (b.status === "SUBMITTED" && a.status !== "SUBMITTED") return 1;
      const aTime = a.timeTakenSeconds ?? (a.submittedAt ? new Date(a.submittedAt).getTime() : Infinity);
      const bTime = b.timeTakenSeconds ?? (b.submittedAt ? new Date(b.submittedAt).getTime() : Infinity);
      if (aTime !== bTime) return aTime - bTime;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  // Ranks with speed tie-breaker (exact ties only when score, status, and duration match)
  let currentRank = 0;
  const rankedDense = ranked.map((a, index) => {
    const prev = index > 0 ? ranked[index - 1] : null;
    const isExactTie = prev && prev.score === a.score && prev.status === a.status && prev.timeTakenSeconds === a.timeTakenSeconds;
    if (!isExactTie) {
      currentRank = index + 1;
    }
    return { ...a, rank: currentRank };
  });

  const passPct = session.exam.passCriteria ?? 50;
  const passed = ranked.filter((a) => (a.score / totalMarks) * 100 >= passPct).length;

  const cheatFlags = await prisma.cheatFlag.findMany({
    where: { examSessionId: params.sessionId },
    select: { userId: true },
  });
  const flagCountByUser: Record<string, number> = {};
  for (const f of cheatFlags) {
    flagCountByUser[f.userId] = (flagCountByUser[f.userId] || 0) + 1;
  }

  const teacherCandidates = attemptsWithScores.map((a) => {
    const score = a.responses.reduce((s, r) => s + r.earnedPoints, 0);
    const mId = sessionMascots[a.userId];
    const m = mId ? getMascotById(mId) : null;
    const timeTakenSeconds = a.submittedAt && (a.startedAt || a.createdAt)
      ? Math.max(0, Math.round((new Date(a.submittedAt).getTime() - new Date(a.startedAt || a.createdAt).getTime()) / 1000))
      : null;
    return {
      id: a.id,
      userId: a.userId,
      userName: a.user.name,
      userEmail: a.user.email,
      status: a.status,
      score,
      totalMarks,
      answeredCount: a.responses.length,
      totalQuestions: sessionQuestions.length,
      mascotId: mId || null,
      emoji: m ? m.emoji : null,
      gifUrl: m ? m.gifUrl : null,
      mascotName: m ? m.name : null,
      flagsCount: flagCountByUser[a.userId] || 0,
      passCriteria: passPct,
      createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : null,
      submittedAt: a.submittedAt ? new Date(a.submittedAt).toISOString() : null,
      timeTakenSeconds,
    };
  });

  let snap: any = {};
  if (session.configSnapshot) {
    try {
      snap = JSON.parse(session.configSnapshot);
    } catch {}
  }
  const resultVisibility = (snap.resultVisibility || session.exam.resultVisibility || "IMMEDIATE") as string;
  const resultsReleased = Boolean(snap.resultsReleased);
  const podiumRevealed = Boolean(snap.podiumRevealed);

  const stats = session.sessionStats;

  return (
    <div className="max-w-[1440px] mx-auto space-y-4 pb-8 rise-in">
      {/* Hero card */}
      <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl sm:text-[28px] font-black text-white tracking-tight leading-none truncate">
            {session.exam.title}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <AutoRefresher active intervalMs={8000} showButton={false} />
            <a
              href={`/api/export?sessionId=${session.id}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-lime-300 hover:brightness-110 text-black rounded-xl text-xs font-black transition-all whitespace-nowrap shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export report
            </a>
          </div>
        </div>
        <TickStrip
          threshold={passPct / 100}
          data={ranked.map((a) => ({ fill: totalMarks > 0 ? a.score / totalMarks : 0 }))}
        />

        {/* Metric row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mt-5">
          <StackStatCard
            label="Candidates"
            value={String(ranked.length)}
            sub=" validated submissions"
            icon={<svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden><circle cx="9" cy="8" r="3.5" /><path strokeLinecap="round" d="M2.5 19a6.5 6.5 0 0113 0M16 11a3 3 0 10-2-5.2M21.5 19a6.5 6.5 0 00-5.5-6.4" /></svg>}
          />
          <StackStatCard
            label="Mean score"
            value={stats ? stats.meanScore.toFixed(1) : "—"}
            sub={` / ${Math.round(totalMarks)}`}
                        icon={<svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" d="M4 18l4-6 4 3 5-8 3 4" /></svg>}
          />
          <StackStatCard
            label="Pass rate"
            lime
            value={stats ? `${stats.passRate.toFixed(1)}%` : "—"}
            sub={` cutoff ${passPct}%`}
            icon={<svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M8.5 12.5l2.5 2.5 4.5-5" /></svg>}
          />
          <StackStatCard
            label="High / Low"
            value={stats ? `${stats.highestScore.toFixed(1)} / ${stats.lowestScore.toFixed(1)}` : "—"}
                        icon={<svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M8 4h9l3 4-6 5v7l-4 1v-8L4 8l4-4z" /></svg>}
          />
        </div>
      </div>

      {/* Candidate Result Release & Podium Reveal Control */}
      <ResultReleaseControl
        sessionId={session.id}
        initialReleased={resultsReleased}
        initialPodiumRevealed={podiumRevealed}
        resultVisibility={resultVisibility}
        submittedCount={ranked.length}
      />

      {/* Tab sections: leaderboard (default), podium, psychometric table */}
      <FileTabs
        items={[
          {
            key: "leaderboard",
            label: "Leaderboard",
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7" />
              </svg>
            ),
            content: (
              <TeacherPodiumLeaderboard
                sessionId={session.id}
                candidates={teacherCandidates}
                totalMarks={totalMarks}
                passCriteria={passPct}
                isLive={false}
                view="leaderboard"
              />
            ),
          },
          {
            key: "podium",
            label: "Podium",
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M12 17v4M5 4h14l-1.5 6a5.5 5.5 0 01-11 0L5 4zM4 6H2.5c0 3 1.2 4.5 2.7 4.9M20 6h1.5c0 3-1.2 4.5-2.7 4.9" />
              </svg>
            ),
            content: (
              <TeacherPodiumLeaderboard
                sessionId={session.id}
                candidates={teacherCandidates}
                totalMarks={totalMarks}
                passCriteria={passPct}
                isLive={false}
                view="podium"
              />
            ),
          },
          {
            key: "psychometrics",
            label: "Psychometric table",
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path strokeLinecap="round" d="M3 10h18M10 10v10" />
              </svg>
            ),
            content: (
      <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
        <p className="text-[10px] text-neutral-500 mb-4">
          Diff(p) = share correct · Disc(D) = top-vs-bottom spread · Any D below 0 flags rewording · All D categories use (A/B/C/D) percentages.
        </p>
        {/* Table (Switchlane style) */}
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#101116]">
          <table className="w-full text-left border-collapse text-[13px] min-w-[760px]">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-semibold tracking-[0.14em] text-neutral-500 uppercase">
                <th className="py-3 px-4">Question</th>
                <th className="py-3 px-4 text-center">Diff (p)</th>
                <th className="py-3 px-4 text-center">Disc (d)</th>
                <th className="py-3 px-4 text-center">Verdict</th>
                <th className="py-3 px-4 text-center">Attempts</th>
                <th className="py-3 px-4 text-center">Choice split</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {session.questionStats.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500 text-xs">
                    Item statistics compute after evaluation.
                  </td>
                </tr>
              )}
              {session.questionStats.map((st, qi) => {
                const v = verdict(st.pValue, st.discrimination);
                let dist: [string, number][] = [];
                try {
                  dist = Object.entries(JSON.parse(st.distractors || "{}")) as [string, number][];
                } catch {}
                const distTotal = dist.reduce((a, [, n]) => a + (Number(n) || 0), 0) || 1;
                const letters = ["A", "B", "C", "D"];
                return (
                  <tr key={st.id} className="transition-colors hover:bg-white/[0.04]">
                    <td className="py-3 px-4 text-[12px] text-neutral-200 truncate max-w-[340px]">
                      <span className="text-neutral-500 font-mono">Q{String(qi + 1).padStart(2, "0")}</span> · {st.question.text.slice(0, 42)}{st.question.text.length > 42 ? "…" : ""}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[12px] font-bold text-neutral-200 tabular-nums">{st.pValue.toFixed(2)}</td>
                    <td className={`py-3 px-4 text-center font-mono text-[12px] font-bold tabular-nums ${st.discrimination < 0 ? "text-[#f2a488]" : "text-neutral-200"}`}>
                      {st.discrimination.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[9px] font-black border rounded px-1.5 py-0.5 whitespace-nowrap ${v.cls}`}>{v.label}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[12px] text-neutral-300 tabular-nums">
                      {(attemptsByQ[st.question.id] ?? ranked.length).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[11px] text-neutral-400 tabular-nums whitespace-nowrap">
                      {dist.length > 0
                        ? dist.slice(0, 4).map(([, n], di) => `${letters[di] || "?"} ${Math.round((Number(n) / distTotal) * 100)}%`).join(" / ")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
            ),
          },
        ]}
      />

    </div>
  );
}
