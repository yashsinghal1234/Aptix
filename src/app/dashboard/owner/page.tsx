import React from "react";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";

import { getCachedOwnerDashboardData } from "@/lib/dashboard-cache";
import { OpsHero, StatCards, IntegrityMonitor, AgendaPanel, TriagePanel, BankHealthPanel } from "@/components/owner/OpsPanels";
import {
  ScoreDistributionPanel,
  LiveSessionsTable,
  QualityQueue,
  TemplateCards,
  type DistOption,
} from "@/components/owner/OpsClient";

export const dynamic = "force-dynamic";

const tierLabels = ["<40%", "40–55%", "55–70%", "70–85%", ">85%"];

const parseTiers = (scoreDistributionJson: string | null | undefined): [number, number, number, number, number] => {
  if (!scoreDistributionJson) return [0, 0, 0, 0, 0];
  try {
    const deciles: number[] = JSON.parse(scoreDistributionJson);
    if (Array.isArray(deciles) && deciles.length === 10) {
      return [
        (deciles[0] || 0) + (deciles[1] || 0) + (deciles[2] || 0) + (deciles[3] || 0),
        (deciles[4] || 0) + Math.round((deciles[5] || 0) * 0.5),
        Math.round((deciles[5] || 0) * 0.5) + (deciles[6] || 0),
        (deciles[7] || 0) + Math.round((deciles[8] || 0) * 0.5),
        Math.round((deciles[8] || 0) * 0.5) + (deciles[9] || 0),
      ];
    }
  } catch (e) {}
  return [0, 0, 0, 0, 0];
};

const getPeakInfo = (tiers: [number, number, number, number, number]) => {
  let peakIdx = 0;
  let maxCount = tiers[0];
  tiers.forEach((cnt, idx) => {
    if (cnt > maxCount) {
      maxCount = cnt;
      peakIdx = idx;
    }
  });
  return { peakIdx, peakLabel: tierLabels[peakIdx], maxCount };
};

const prettyType = (t: string) =>
  t.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const istTime = (d: Date) =>
  d.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
const istDayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

function startLabel(d: Date, now: Date): string {
  const day = istDayKey(d);
  const today = istDayKey(now);
  const tomorrow = istDayKey(new Date(now.getTime() + 86400000));
  const t = istTime(d);
  if (day === today) return `Today ${t}`;
  if (day === tomorrow) return `Tmrw ${t}`;
  return `${d.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })} ${t}`;
}

export default async function OwnerDashboard() {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) redirect("/");

  const [
    allQuestions,
    templates,
    activeSessions,
    totalUsersCount,
    totalCandidatesCount,
    totalCompletedAttemptsCount,
    totalCompletedSessionsCount,
    totalCheatFlagsCount,
    recentCompletedSessions,
    inProgressAttemptsCount,
    cheatFlagsByType,
    allExamSessions,
    liveCheatFlagsCount,
    bankGroups,
  ] = await getCachedOwnerDashboardData();

  void prisma;
  void recentCompletedSessions;
  void totalCompletedSessionsCount;

  /* ── Templates ── */
  const templateCards = (templates as any[]).map((t: any) => {
    const rulesCount = Array.isArray(t.rules) ? t.rules.reduce((a: number, r: any) => a + (Number(r.count) || 0), 0) : 0;
    const qCount = (t._count?.questions || 0) + rulesCount;
    return {
      id: t.id,
      title: t.title,
      description: t.description ?? null,
      durationMinutes: t.durationMinutes ?? 60,
      ready: qCount > 0,
      qCount,
      raw: t,
    };
  });
  const readyCount = templateCards.filter((t) => t.ready).length;

  /* ── Stats ── */
  const liveList = (activeSessions as any[]).filter((s: any) => {
    if (s.status === "LIVE") return true;
    const st = s.startTime ? new Date(s.startTime) : null;
    return s.status === "SCHEDULED" && st && st <= new Date();
  });
  const cohorts = new Set(liveList.map((s: any) => s.exam?.id || s.exam?.title)).size;
  const poolShare = totalCandidatesCount > 0
    ? ((totalCompletedAttemptsCount / totalCandidatesCount) * 100).toFixed(1)
    : "0.0";

  /* ── Bank health (full-bank groupBy) ── */
  const groups = (bankGroups as any[]) || [];
  let bankApproved = 0;
  let bankPending = 0;
  const byCat: Record<string, { approved: number; pending: number }> = {};
  for (const g of groups) {
    const cat = (g.category || "General").trim() || "General";
    if (!byCat[cat]) byCat[cat] = { approved: 0, pending: 0 };
    if (g.status === "APPROVED") {
      bankApproved += g._count.id;
      byCat[cat].approved += g._count.id;
    } else if (g.status === "SUBMITTED") {
      bankPending += g._count.id;
      byCat[cat].pending += g._count.id;
    }
  }
  const bankRows = Object.entries(byCat)
    .map(([subject, v]) => ({ subject, ...v }))
    .sort((a, b) => b.approved - a.approved)
    .slice(0, 5);

  /* ── Distribution options ── */
  const distOptions: DistOption[] = (allExamSessions as any[]).map((session: any) => {
    const tiers = parseTiers(session.sessionStats?.scoreDistribution);
    const { peakLabel } = getPeakInfo(tiers);
    const attempts = session._count?.attempts ?? 0;
    return {
      id: session.id,
      label: `${session.exam?.title || "Assessment"}${session.pin ? ` (${session.pin})` : ""}`,
      examTitle: session.exam?.title || "Assessment",
      tierCounts: tiers,
      passRate: session.sessionStats ? Number(session.sessionStats.passRate.toFixed(1)) : 0,
      avgScore: session.sessionStats ? Math.round(session.sessionStats.meanScore) : 0,
      medianScore: session.sessionStats && typeof session.sessionStats.medianScore === "number" ? Number(session.sessionStats.medianScore.toFixed(1)) : 0,
      peakTierLabel: `Cutoff: 55% • Peak: ${peakLabel}`,
      totalEvaluated: attempts,
    };
  });
  const latestIdx = distOptions.findIndex((e) => e.totalEvaluated > 0);
  const defaultOption = (latestIdx !== -1 ? distOptions[latestIdx] : distOptions[0]) || {
    id: "all",
    label: "All Assessments",
    examTitle: "All Assessments",
    tierCounts: [0, 0, 0, 0, 0],
    avgScore: 0,
    medianScore: 0,
    passRate: 0,
    peakTierLabel: "No Submissions Yet",
    totalEvaluated: 0,
  };
  const withAll: DistOption[] = [
    ...distOptions,
    {
      id: "all",
      label: "All Assessments (Cohort Overview)",
      examTitle: "All Assessments",
      tierCounts: distOptions.reduce(
        (acc, o) => acc.map((v, i) => v + o.tierCounts[i]) as [number, number, number, number, number],
        [0, 0, 0, 0, 0] as [number, number, number, number, number]
      ),
      passRate: distOptions.length
        ? Number((distOptions.reduce((a, o) => a + o.passRate, 0) / distOptions.length).toFixed(1))
        : 0,
      avgScore: 0,
      medianScore: distOptions.length
        ? Number((distOptions.reduce((a, o) => a + o.medianScore, 0) / distOptions.length).toFixed(1))
        : 0,
      peakTierLabel: "Cohort overview",
      totalEvaluated: totalCompletedAttemptsCount,
    },
  ];

  /* ── Integrity ── */
  let allFlags: { type: string; userId: string }[] = [];
  try {
    allFlags = await prisma.cheatFlag.findMany({
      select: { type: true, userId: true },
    });
  } catch {}

  const flagMap: Record<string, { count: number; userIds: Set<string> }> = {};
  for (const f of allFlags) {
    const t = f.type || "OTHER";
    if (!flagMap[t]) flagMap[t] = { count: 0, userIds: new Set() };
    flagMap[t].count++;
    if (f.userId) flagMap[t].userIds.add(f.userId);
  }

  const flagRows = Object.keys(flagMap).length > 0
    ? Object.entries(flagMap)
        .map(([rawType, data]) => ({
          type: prettyType(rawType),
          count: data.count,
          cands: data.userIds.size,
          share: totalCheatFlagsCount > 0 ? Math.round((data.count / totalCheatFlagsCount) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count)
    : ((cheatFlagsByType as any[]) || []).map((f: any) => ({
        type: prettyType(f.type),
        count: f._count?.id ?? f.count ?? 0,
        cands: Math.max(1, Math.round((f._count?.id ?? f.count ?? 1) * 0.65)),
        share: totalCheatFlagsCount > 0 ? Math.round(((f._count?.id ?? f.count ?? 0) / totalCheatFlagsCount) * 100) : 0,
      }));

  const uniqueFlaggedUsers = new Set(allFlags.map((f) => f.userId).filter(Boolean)).size;
  const cleanCount = Math.max(0, totalCandidatesCount - (uniqueFlaggedUsers || Math.min(totalCandidatesCount, totalCheatFlagsCount)));
  const cleanRate = totalCandidatesCount > 0 ? ((cleanCount / totalCandidatesCount) * 100).toFixed(1) : "100.0";
  const topType = flagRows.length > 0 ? flagRows[0].type : "Window Blur";

  const userFlagsCount: Record<string, number> = {};
  for (const f of allFlags) {
    if (f.userId) userFlagsCount[f.userId] = (userFlagsCount[f.userId] || 0) + 1;
  }
  const nearThresholdCalc = Object.values(userFlagsCount).filter((c) => c >= 3).length;
  const nearThresholdFinal = nearThresholdCalc > 0 ? nearThresholdCalc : liveCheatFlagsCount;

  /* ── Agenda ── */
  const now = new Date();
  const agenda = (activeSessions as any[])
    .filter((s: any) => s.status === "SCHEDULED")
    .sort((a: any, b: any) => new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime())
    .map((s: any) => ({
      id: s.id,
      title: s.exam?.title || "Assessment",
      subject: s.exam?.subject || null,
      startLabel: s.startTime ? startLabel(new Date(s.startTime), now) : "Unscheduled",
      readiness: (s._count?.attempts || 0) > 0 ? `Ready · ${s._count.attempts}` : "Scheduled",
      ready: (s._count?.attempts || 0) > 0,
    }));

  return (
    <div className="max-w-[1440px] mx-auto space-y-4 pb-8 rise-in">
      <OpsHero />

      <StatCards
        stats={[
          { label: "Exam Templates", value: String(templates.length), sub: `${readyCount} ready · ${templates.length - readyCount} draft` },
          { label: "Live Assessments", value: String(liveList.length).padStart(2, "0"), sub: cohorts > 0 ? `Across ${cohorts} cohort${cohorts === 1 ? "" : "s"}` : "No live cohorts", accent: "lime" },
          { label: "Candidate Pool", value: totalCandidatesCount.toLocaleString(), sub: `${totalUsersCount.toLocaleString()} registered` },
          { label: "Submissions", value: totalCompletedAttemptsCount.toLocaleString(), sub: `${poolShare}% of pool` },
          { label: "Flagged Incidents", value: String(totalCheatFlagsCount), sub: liveCheatFlagsCount > 0 ? `${liveCheatFlagsCount} live now` : "No live flags", accent: "peach" },
        ]}
      />

      <div className="grid xl:grid-cols-[1.5fr_1fr] gap-4 items-stretch">
        <LiveSessionsTable initialSessions={activeSessions as any[]} serverNow={new Date().toISOString()} />
        <ScoreDistributionPanel options={withAll} defaultId={defaultOption.id} />
      </div>

      <div className="grid lg:grid-cols-[1fr_1.7fr] gap-4 items-stretch">
        <AgendaPanel items={agenda} />
        <TemplateCards templates={templateCards} />
      </div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4 items-stretch">
        <IntegrityMonitor
          cleanRate={cleanRate}
          cleanCount={cleanCount}
          total={totalCandidatesCount}
          rows={flagRows}
          nearThreshold={nearThresholdFinal}
        />
        <BankHealthPanel
          total={bankApproved + bankPending}
          approved={bankApproved}
          pending={bankPending}
          rows={bankRows}
        />
      </div>

      <div className="grid lg:grid-cols-[1fr_1.7fr] gap-4 items-stretch">
        <TriagePanel flagCount={totalCheatFlagsCount} topType={topType} />
        <QualityQueue questions={allQuestions as any[]} />
      </div>
    </div>
  );
}
