import React from "react";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import {
  extendSessionTimeAction,
  endSessionAction,
} from "@/app/actions/session";
import { getSessionMascotsMap } from "@/app/actions/mascot";
import { getMascotById } from "@/lib/mascots";
import {
  RefreshClock,
  SessionCountdown,
  CandidateTable,
  IntegrityFeed,
  ResultReleaseControl,
  AutoRefresher,
} from "@/components/owner/SessionMonitor";
import { TeacherPodiumLeaderboard } from "@/components/owner/TeacherPodiumLeaderboard";
import RosterManager from "@/components/owner/RosterManager";
import AttendanceRegister from "@/components/owner/AttendanceRegister";
import { FileTabs } from "@/components/owner/FileTabs";
import { Breadcrumb, HeroPill, StackStatCard } from "@/components/owner/Stacklane";

export const dynamic = "force-dynamic";

const istTime = (d: Date | string) =>
  new Date(d).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });

export default async function LiveSessionMonitor({ params }: { params: { id: string } }) {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) redirect("/");

  const session = await prisma.examSession.findUnique({
    where: { id: params.id },
    include: {
      exam: true,
      questions: true,
      cheatFlags: { include: { user: true } },
      attempts: { include: { user: true, responses: true } },
      rosters: { orderBy: { email: "asc" }, take: 5000 },
      blocked: { orderBy: { email: "asc" }, take: 5000 },
    },
  });

  if (!session) return <div className="text-white p-8">Session not found</div>;

  const totalQuestions = session.questions.length;
  const inProgressCount = session.attempts.filter((a) => a.status === "IN_PROGRESS").length;
  const submittedCount = session.attempts.filter((a) => a.status === "SUBMITTED").length;
  const totalCount = session.attempts.length;
  const totalMarks = session.questions.reduce((sum, q) => sum + q.points, 0) || session.totalMarks || session.exam.totalMarks || 1;
  const totalFlagsCount = session.cheatFlags.length;
  const sessionMascots = await getSessionMascotsMap(session.id);
  const live = session.status === "LIVE";
  const done = session.status === "COMPLETED";

  const start = session.startTime ? new Date(session.startTime) : null;
  const end = start ? new Date(start.getTime() + session.durationMinutes * 60000) : null;
  const windowLabel = start ? `${istTime(start)}–${end ? istTime(end) : ""} IST` : "Unscheduled";
  const code = session.exam.subject || session.exam.title;
  const domain = session.allowedEmailDomain || session.exam.allowedEmailDomain;

  let snap: any = {};
  if (session.configSnapshot) {
    try {
      snap = JSON.parse(session.configSnapshot);
    } catch {}
  }
  const resultVisibility = (snap.resultVisibility || session.exam.resultVisibility || "IMMEDIATE") as string;
  const resultsReleased = Boolean(snap.resultsReleased);
  const podiumRevealed = Boolean(snap.podiumRevealed);

  const attempts = session.attempts
    .map((a) => {
      const aFlags = session.cheatFlags.filter((f) => f.userId === a.userId);
      const earned = a.responses.reduce((s, r) => s + (r.earnedPoints || 0), 0);
      const mId = (sessionMascots as Record<string, string>)[a.userId];
      const m = mId ? getMascotById(mId) : null;
      const times = a.responses
        .map((r: any) => new Date(r.answeredAt || r.createdAt || r.updatedAt || a.createdAt).getTime())
        .filter((t: number) => !isNaN(t));
      const timeTakenSeconds = a.submittedAt && a.createdAt
        ? Math.max(0, Math.round((new Date(a.submittedAt).getTime() - new Date(a.createdAt).getTime()) / 1000))
        : null;
      return {
        id: a.id,
        status: a.status,
        extendedUntil: a.extendedUntil ? a.extendedUntil.toISOString() : null,
        createdAt: new Date(a.createdAt).toISOString(),
        submittedAt: a.submittedAt ? new Date(a.submittedAt).toISOString() : null,
        timeTakenSeconds,
        lastActivity: times.length > 0 ? Math.max(...times) : new Date(a.createdAt).getTime(),
        userId: a.userId,
        userName: a.user.name,
        userEmail: a.user.email,
        emoji: m ? m.emoji : null,
        gifUrl: m ? m.gifUrl : null,
        answered: a.responses.length,
        earned,
        flags: aFlags.length,
        flagDetails: aFlags.map((f) => ({
          type: f.type,
          desc: f.description ?? "Flag raised by the proctoring shield",
          time: new Date(f.timestamp).toISOString(),
        })),
      };
    })
    .sort((x, y) => y.lastActivity - x.lastActivity);

  const flags = session.cheatFlags.map((f) => ({
    id: f.id,
    type: f.type,
    description: f.description ?? "Flag raised by the proctoring shield",
    timestamp: new Date(f.timestamp).toISOString(),
    userName: f.user.name,
  }));

  const infoCard = "rounded-2xl border border-white/10 bg-[#0e0f13] p-5";
  const infoLabel = "text-[10px] font-bold tracking-[0.18em] text-neutral-500";
  const statCard = "rounded-2xl border border-white/10 bg-[#0e0f13] p-5";

  return (
    <div className="max-w-[1440px] mx-auto space-y-4 pb-8 rise-in">
      {/* Hero card */}
      <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs font-bold text-lime-200">
            <span className="w-2 h-2 rounded-full bg-lime-300 animate-pulse" />
            <RefreshClock />
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <AutoRefresher active={live} />
            <HeroPill>APT-{session.pin ? session.pin.replace("APT-", "") : "——"}</HeroPill>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 mt-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-neutral-400 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                <rect x="3" y="4" width="18" height="13" rx="2" />
                <path strokeLinecap="round" d="M8 21h8M12 17v4" />
              </svg>
              Assessment
            </p>
            <h1 className="mt-1.5 text-2xl sm:text-[28px] font-black text-white tracking-tight leading-none truncate">
              {session.exam.title}
            </h1>
          </div>
        </div>
      </div>
      {/* Metric row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <StackStatCard
          label="Registered"
          value={String(totalCount)}
          icon={<svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden><circle cx="9" cy="8" r="3.5" /><path strokeLinecap="round" d="M2.5 19a6.5 6.5 0 0113 0M16 11a3 3 0 10-2-5.2M21.5 19a6.5 6.5 0 00-5.5-6.4" /></svg>}
        />
        <StackStatCard
          label="In progress"
          value={String(inProgressCount)}
          icon={<svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7v5l3 2" /></svg>}
        />
        <StackStatCard
          lime
          label="Submitted"
          value={String(submittedCount)}
          icon={<svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M8.5 12.5l2.5 2.5 4.5-5" /></svg>}
        />
        <StackStatCard
          label="Proctor flags"
          value={String(totalFlagsCount)}
          icon={<svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M6 21V5m0 0h11l-2 3 2 3H6" /></svg>}
        />
        <StackStatCard
          label="Session countdown"
          value={
            <SessionCountdown
              startTime={start ? start.toISOString() : null}
              durationMinutes={session.durationMinutes}
              extendedUntil={session.extendedUntil ? session.extendedUntil.toISOString() : null}
              status={session.status}
            />
          }
          icon={<svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7v5l3 2" /></svg>}
        />
      </div>

      {/* Candidate Result Release, Podium Reveal, Gamified Mode + Global Time Extension (single line) */}
      <ResultReleaseControl
        sessionId={session.id}
        initialReleased={resultsReleased}
        initialPodiumRevealed={podiumRevealed}
        initialGamified={Boolean(snap.isGamified || session.exam.description?.includes("[MODE:GAMIFIED]"))}
        resultVisibility={resultVisibility}
        submittedCount={submittedCount}
      >
        <div className="rounded-xl border border-white/10 bg-[#0e0f13] px-3 py-1.5 flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase whitespace-nowrap">Global time extension</span>
          {[5, 10, 15].map((mins) => (
            <form
              key={mins}
              action={async (formData) => {
                "use server";
                await extendSessionTimeAction(formData);
              }}
            >
              <input type="hidden" name="sessionId" value={session.id} />
              <input type="hidden" name="minutes" value={mins} />
              <button className="px-3 py-1.5 bg-white hover:bg-neutral-200 text-black text-xs font-bold rounded-lg transition-all cursor-pointer">
                +{mins}m
              </button>
            </form>
          ))}
          <form
            id="auto-end-session-form"
            action={async (formData) => {
              "use server";
              await endSessionAction(formData);
            }}
          >
            <input type="hidden" name="sessionId" value={session.id} />
            <button className="px-3 py-1.5 bg-[#e5484d] hover:brightness-110 text-white text-xs font-black rounded-lg transition-all cursor-pointer">
              Force End Exam
            </button>
          </form>
        </div>
      </ResultReleaseControl>

      <RosterManager
        sessionId={session.id}
        initialRosters={(session.rosters || []).map((r) => ({ email: r.email, name: r.name }))}
      />

      {/* ── Live monitoring tabs: Leaderboard / Podium / Attendance (same structure as the results page) ── */}
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
                candidates={attempts.map((a) => ({
                  id: a.id,
                  userId: a.userId,
                  userName: a.userName,
                  userEmail: a.userEmail,
                  status: a.status,
                  score: a.earned,
                  totalMarks: totalMarks,
                  answeredCount: a.answered,
                  totalQuestions: totalQuestions,
                  mascotId: (sessionMascots as Record<string, string>)[a.userId] || null,
                  emoji: a.emoji,
                  gifUrl: a.gifUrl,
                  flagsCount: a.flags,
                  lastActivity: a.lastActivity,
                  passCriteria: session.exam.passCriteria ?? 50,
                  createdAt: a.createdAt,
                  submittedAt: a.submittedAt,
                  timeTakenSeconds: a.timeTakenSeconds,
                }))}
                totalMarks={totalMarks}
                passCriteria={session.exam.passCriteria ?? 50}
                isLive={!done}
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
                candidates={attempts.map((a) => ({
                  id: a.id,
                  userId: a.userId,
                  userName: a.userName,
                  userEmail: a.userEmail,
                  status: a.status,
                  score: a.earned,
                  totalMarks: totalMarks,
                  answeredCount: a.answered,
                  totalQuestions: totalQuestions,
                  mascotId: (sessionMascots as Record<string, string>)[a.userId] || null,
                  emoji: a.emoji,
                  gifUrl: a.gifUrl,
                  flagsCount: a.flags,
                  lastActivity: a.lastActivity,
                  passCriteria: session.exam.passCriteria ?? 50,
                  createdAt: a.createdAt,
                  submittedAt: a.submittedAt,
                  timeTakenSeconds: a.timeTakenSeconds,
                }))}
                totalMarks={totalMarks}
                passCriteria={session.exam.passCriteria ?? 50}
                isLive={!done}
                view="podium"
              />
            ),
          },
          {
            key: "candidates",
            label: "Candidates",
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM4.5 20.1a8.25 8.25 0 0115 0" />
              </svg>
            ),
            content: (
              <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
                <CandidateTable
                  attempts={attempts}
                  totalQuestions={totalQuestions}
                  totalMarks={totalMarks}
                  sessionId={session.id}
                  blockedEmails={(session.blocked || []).map((b) => b.email)}
                />
              </div>
            ),
          },
          {
            key: "attendance",
            label: "Attendance",
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7M7 6v12" />
              </svg>
            ),
            content: (
              <AttendanceRegister
                sessionId={session.id}
                examTitle={session.exam.title}
                roster={(session.rosters || []).map((r) => ({ email: r.email, name: r.name }))}
                attempts={session.attempts.map((a) => ({ email: a.user.email, status: a.status }))}
              />
            ),
          },
          {
            key: "integrity",
            label: "Integrity",
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" />
              </svg>
            ),
            content: <IntegrityFeed flags={flags} />,
          },
        ]}
      />

      {done && (
        <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm font-bold text-white">This assessment session has concluded.</p>
          <Link
            href={`/dashboard/owner/results/${session.id}`}
            className="text-xs font-bold text-black bg-lime-300 hover:brightness-110 px-4 py-2.5 rounded-xl transition-all w-fit"
          >
            Cohort Results &amp; Analytics →
          </Link>
        </div>
      )}
    </div>
  );
}
