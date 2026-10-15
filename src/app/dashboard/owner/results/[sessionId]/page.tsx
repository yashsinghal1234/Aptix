import React from "react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import Link from "next/link";
import { getSessionMascotsMap } from "@/app/actions/mascot";
import { getMascotById } from "@/lib/mascots";
import { Flower } from "@/components/owner/OpsPanels";
import { ResultReleaseControl } from "@/components/owner/SessionMonitor";
import { TeacherPodiumLeaderboard } from "@/components/owner/TeacherPodiumLeaderboard";

export const dynamic = "force-dynamic";

const istDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const istTime = (d: Date | string) =>
  new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });

function verdict(p: number, d: number): { label: string; cls: string } {
  if (d < 0 || p < 0.25) return { label: "Review wording", cls: "text-[#f2a488] bg-[#f2a488]/10 border-[#f2a488]/30" };
  if (p >= 0.75) return { label: "Easy Pass", cls: "text-neutral-300 bg-white/[0.05] border-white/10" };
  if (d >= 0.2) return { label: "Good separation", cls: "text-lime-200 bg-lime-300/10 border-lime-300/30" };
  return { label: "Fair", cls: "text-neutral-300 bg-white/[0.05] border-white/10" };
}

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
      const timeTakenSeconds = a.submittedAt && a.createdAt
        ? Math.max(0, Math.round((new Date(a.submittedAt).getTime() - new Date(a.createdAt).getTime()) / 1000))
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
    const timeTakenSeconds = a.submittedAt && a.createdAt
      ? Math.max(0, Math.round((new Date(a.submittedAt).getTime() - new Date(a.createdAt).getTime()) / 1000))
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

  // Category mastery
  const categoryStats: Record<string, { totalEarned: number; totalPossible: number; count: number }> = {};
  sessionQuestions.forEach((q) => {
    const cat = q.category || "General";
    if (!categoryStats[cat]) categoryStats[cat] = { totalEarned: 0, totalPossible: 0, count: 0 };
    categoryStats[cat].totalPossible += q.points * (attemptsWithScores.length || 1);
    categoryStats[cat].count += 1;
  });
  attemptsWithScores.forEach((a) => {
    a.responses.forEach((r) => {
      const q = sessionQuestions.find((sq) => sq.id === r.questionId);
      const cat = q?.category || "General";
      if (categoryStats[cat]) categoryStats[cat].totalEarned += r.earnedPoints;
    });
  });
  const categoryList = Object.entries(categoryStats)
    .map(([name, d]) => ({
      name,
      pct: d.totalPossible > 0 ? Math.round((d.totalEarned / d.totalPossible) * 100) : 0,
      count: d.count,
    }))
    .sort((a, b) => b.pct - a.pct);

  // Deciles
  let deciles: number[] = [];
  try {
    const parsed = JSON.parse(session.sessionStats?.scoreDistribution || "[]");
    if (Array.isArray(parsed) && parsed.length === 10) deciles = parsed;
  } catch {}
  const decMax = Math.max(...deciles, 1);
  const peakBucket = deciles.indexOf(Math.max(...deciles, 0));
  const bucketLabel = (i: number) => `${i * 10}–${(i + 1) * 10}`;

  const stats = session.sessionStats;
  const finalized = stats ? istDate(stats.computedAt) : istDate(session.createdAt);
  const finalizedTime = stats ? istTime(stats.computedAt) : "";

  return (
    <div className="max-w-[1440px] mx-auto space-y-4 pb-8">
      {/* Heading */}
      <div className="flex items-start justify-between gap-6 px-1 pt-1">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] text-lime-200/80 mb-3">ANALYTICS / COMPLETED ASSESSMENT</p>
          <h1 className="text-3xl sm:text-[40px] font-black text-white tracking-tight leading-none">
            Beyond the score<span className="text-lime-300">.</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-2.5">
            {session.exam.title} · Q4 · {session.exam.subject || "ENG-26"} · {finalized}
            {finalizedTime ? ` · Finalized at ${finalizedTime} IST` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0">
          <Flower className="w-14 h-14 sm:w-16 sm:h-16" />
          <a
            href={`/api/export?sessionId=${session.id}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 bg-lime-300 hover:brightness-110 text-black rounded-xl text-xs font-black transition-all whitespace-nowrap"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export report
          </a>
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

      {/* Scope pills */}
      <div className="flex flex-wrap gap-1.5 px-1">
        {[session.exam.subject || "ENG-26", "All categories", `ALL SUBMISSIONS / ${ranked.length} VALIDATED`, "LIVE COHORT DATA"].map((p) => (
          <span key={p} className="text-[9px] font-black tracking-[0.12em] text-neutral-300 bg-white/[0.05] border border-white/10 rounded-md px-2 py-1">
            {p}
          </span>
        ))}
      </div>

      {/* Cohort analytics + export */}
      <div className="grid lg:grid-cols-[1fr_280px] gap-4 items-stretch">
        <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
          <p className="text-[10px] font-bold tracking-[0.18em] text-neutral-500">COHORT ANALYTICS</p>
          <p className="mt-2 text-sm font-black text-white">
            {session.exam.title} · Q4 · {session.exam.subject || "ENG-26"}
          </p>
          <p className="text-[10px] text-neutral-500 mt-0.5">Finalized {finalized}{finalizedTime ? ` at ${finalizedTime} IST` : ""}</p>
          {stats ? (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { l: "Mean", v: stats.meanScore.toFixed(1), s: ` / ${Math.round(totalMarks)}` },
                { l: "Median", v: stats.medianScore.toFixed(1), s: " midpoint of submitted" },
                { l: "Pass Rate", v: `${stats.passRate.toFixed(1)}%`, s: ` cutoff ${passPct}%`, lime: true },
                { l: "Highest", v: stats.highestScore.toFixed(1), s: " top score in the cohort" },
                { l: "Lowest", v: stats.lowestScore.toFixed(1), s: " minimum score in the cohort" },
              ].map((c) => (
                <div key={c.l} className="rounded-xl border border-white/10 bg-black/40 p-3">
                  <p className="text-[9px] font-bold tracking-[0.14em] text-neutral-500">{c.l.toUpperCase()}</p>
                  <p className={`mt-1 text-xl font-black tabular-nums ${c.lime ? "text-lime-300" : "text-white"}`}>
                    {c.v}
                    <span className="text-[9px] font-medium text-neutral-500">{c.s}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-neutral-500">Metrics are finalizing for this session.</p>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5 flex flex-col">
          <p className="text-[10px] font-bold tracking-[0.18em] text-neutral-500">READ-ONLY REPORT</p>
          <a
            href={`/api/export?sessionId=${session.id}`}
            target="_blank"
            className="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/[0.06] hover:bg-white/10 border border-white/10 text-xs font-bold text-white rounded-xl transition-colors"
          >
            Export CSV Report
          </a>
          <p className="mt-2.5 text-[10px] text-neutral-500 leading-relaxed">
            Snapshot of means, pass rate, item flags and the ranked roll. Re-export any time; numbers always reflect finalized scoring.
          </p>
        </div>
      </div>

      {/* Decile distribution */}
      <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-bold text-white">Decile distribution 0–100%</h2>
          <span className="text-[9px] font-black tracking-[0.14em] text-neutral-400 tabular-nums">DECILES n={ranked.length}</span>
        </div>
        {deciles.length === 10 ? (
          <>
            <div className="grid grid-cols-10 gap-1.5 items-end">
              {deciles.map((c, i) => {
                const peak = i === peakBucket && c > 0;
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span className="text-[9px] font-bold text-neutral-400 tabular-nums">{c}</span>
                    <div
                      className="w-full rounded-md"
                      style={{ height: `${Math.max(10, Math.round((c / decMax) * 110))}px`, background: peak ? "#bef264" : "#8b7bc7" }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-10 gap-1.5 mt-1.5">
              {deciles.map((_, i) => (
                <p key={i} className="text-center text-[8px] font-semibold text-neutral-600">{i * 10}</p>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-neutral-500">
              Peak at {bucketLabel(peakBucket)} · {passed} passing at {passPct}% cutoff · {ranked.length} validated submissions.
            </p>
          </>
        ) : (
          <p className="text-xs text-neutral-500">Distribution finalizes with the cohort metrics.</p>
        )}
      </div>

      {/* Psychometric item table */}
      <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
        <h2 className="text-[15px] font-bold text-white">Psychometric item table</h2>
        <p className="text-[10px] text-neutral-500 mt-1 mb-4">
          Diff(p) = share correct · Disc(D) = top-vs-bottom spread · Any D below 0 flags rewording · All D categories use (A/B/C/D) percentages.
        </p>
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="grid grid-cols-[1.4fr_repeat(5,auto)] gap-x-5 gap-y-1 items-center min-w-[760px]">
            {(["Q", "DIFF (P)", "DISC (D)", "VERDICT", "ATTEMPTS", "CHOICE SPLIT"] as const).map((h, i) => (
              <p key={h} className={`text-[9px] font-bold tracking-[0.16em] text-neutral-600 pb-2 ${i > 0 ? "text-center" : ""}`}>{h}</p>
            ))}
            {session.questionStats.length === 0 && (
              <p className="col-span-6 text-xs text-neutral-500 py-4">Item statistics compute after evaluation.</p>
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
                <React.Fragment key={st.id}>
                  <p className="py-2.5 border-t border-white/[0.06] text-[11px] text-neutral-200 truncate pr-2">
                    Q{String(qi + 1).padStart(2, "0")} · {st.question.text.slice(0, 42)}{st.question.text.length > 42 ? "…" : ""}
                  </p>
                  <p className="py-2.5 border-t border-white/[0.06] text-[11px] font-mono text-neutral-300 tabular-nums text-center">{st.pValue.toFixed(2)}</p>
                  <p className={`py-2.5 border-t border-white/[0.06] text-[11px] font-mono font-bold tabular-nums text-center ${st.discrimination < 0 ? "text-[#f2a488]" : "text-neutral-200"}`}>
                    {st.discrimination.toFixed(2)}
                  </p>
                  <p className="py-2.5 border-t border-white/[0.06] text-center">
                    <span className={`text-[9px] font-black border rounded px-1.5 py-0.5 whitespace-nowrap ${v.cls}`}>{v.label}</span>
                  </p>
                  <p className="py-2.5 border-t border-white/[0.06] text-[11px] text-neutral-300 tabular-nums text-center">
                    {(attemptsByQ[st.question.id] ?? ranked.length).toLocaleString()}
                  </p>
                  <p className="py-2.5 border-t border-white/[0.06] text-[10px] font-mono text-neutral-400 tabular-nums text-center whitespace-nowrap">
                    {dist.length > 0
                      ? dist.slice(0, 4).map(([, n], di) => `${letters[di] || "?"} ${Math.round((Number(n) / distTotal) * 100)}%`).join(" / ")
                      : "—"}
                  </p>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── TEACHER EXCLUSIVE: Historical Cohort Podium & Leaderboard ── */}
      <TeacherPodiumLeaderboard
        sessionId={session.id}
        candidates={teacherCandidates}
        totalMarks={totalMarks}
        passCriteria={passPct}
        isLive={false}
      />

      {/* Topic mastery */}
      <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-bold text-white">Topic mastery</h2>
          <span className="text-[9px] font-bold tracking-[0.14em] text-neutral-500">COHORT ACCURACY</span>
        </div>
        {categoryList.length === 0 ? (
          <p className="text-xs text-neutral-500">Mastery computes with the cohort metrics.</p>
        ) : (
          <div className="space-y-2.5">
            {categoryList.map((c) => (
              <div key={c.name} className="grid grid-cols-[130px_1fr_auto] gap-3 items-center">
                <p className="text-[11px] text-neutral-300 truncate">{c.name}</p>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-lime-300" style={{ width: `${Math.max(2, Math.min(100, c.pct))}%` }} />
                </div>
                <p className="text-[11px] font-bold text-neutral-200 tabular-nums w-10 text-right">{c.pct}%</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Supporting context */}
      <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
        <h2 className="text-[13px] font-bold text-white mb-2">Supporting context</h2>
        <p className="text-[11px] text-neutral-400 leading-relaxed">
          Tied scores share a rank. Pass standing uses a {passPct}% cutoff on {Math.round(totalMarks)} marks.
          Attempts counts reflect recorded responses per question; auto-picked variants may differ across candidates.
          Distractor splits are response shares per option. Export the CSV for audit-grade records.
        </p>
      </div>
    </div>
  );
}
