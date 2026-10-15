import React from "react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
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
} from "@/components/owner/SessionMonitor";
import { TeacherPodiumLeaderboard } from "@/components/owner/TeacherPodiumLeaderboard";

export const dynamic = "force-dynamic";

const istTime = (d: Date | string) =>
  new Date(d).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });

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
      cheatFlags: { include: { user: true } },
      attempts: { include: { user: true, responses: true } },
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
  const screenNo = session.pin ? session.pin.split("-")[1] || session.pin : "—";
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
      return {
        id: a.id,
        status: a.status,
        extendedUntil: a.extendedUntil ? a.extendedUntil.toISOString() : null,
        createdAt: new Date(a.createdAt).toISOString(),
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
    <div className="max-w-[1440px] mx-auto space-y-4 pb-8">
      {/* Heading */}
      <div className="px-1 pt-1">
        <p className="text-[10px] font-bold tracking-[0.22em] text-lime-200/80 mb-3">LIVE / MONITORING / INVENTORY</p>
        <h1 className="text-3xl sm:text-[40px] font-black text-white tracking-tight leading-none">
          <span className="text-lime-300">SCREEN {screenNo}</span> inventory.
        </h1>
        <p className="text-xs text-neutral-400 mt-2.5">
          {code} · {totalCount} registered · {windowLabel} · Frozen question snapshot v{totalQuestions}
        </p>
      </div>

      {/* Status bar */}
      <div className="rounded-2xl border border-lime-300/20 bg-lime-300/[0.05] px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-bold text-lime-200">
          <span className="w-2 h-2 rounded-full bg-lime-300 animate-pulse" />
          {session.status}
          <span className="text-neutral-400 font-semibold">· Auto-sync every 8 seconds ·</span>
          <RefreshClock />
        </p>
        <p className="text-[11px] font-semibold text-neutral-300 tabular-nums">
          {inProgressCount} in progress · {submittedCount} submitted · {totalCount} total
        </p>
      </div>

      {/* Info cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className={infoCard}>
          <p className={infoLabel}>SESSION TITLE</p>
          <p className="mt-2 text-sm font-black text-white leading-snug">{session.exam.title}</p>
          <p className="mt-1.5 text-[10px] text-neutral-500">{code} · {totalCount} registered · {windowLabel}</p>
          <p className="mt-0.5 text-[10px] text-neutral-500">Frozen snapshot weights v{totalQuestions}</p>
        </div>
        <div className={infoCard}>
          <p className={infoLabel}>ACCESS PIN</p>
          <p className="mt-2 font-mono text-xl font-black text-white tracking-widest">{session.pin || "—"}</p>
          <p className="mt-1.5 text-[10px] text-neutral-500 leading-relaxed">Registered for candidate launch and proctor alert moderation</p>
        </div>
        <div className={infoCard}>
          <p className={infoLabel}>DOMAIN &amp; CHECKS</p>
          <p className="mt-2 text-xl font-black text-lime-300">{domain ? `@${domain.replace(/^@/, "")}` : "Open"}</p>
          <p className="mt-1.5 text-[10px] text-neutral-500 leading-relaxed">Approved sender domains and origin checks are enforced</p>
        </div>
        <div className={infoCard}>
          <p className={infoLabel}>SESSION COUNTDOWN</p>
          <p className="mt-2 text-[26px] leading-none font-black tabular-nums">
            <SessionCountdown
              startTime={start ? start.toISOString() : null}
              durationMinutes={session.durationMinutes}
              extendedUntil={session.extendedUntil ? session.extendedUntil.toISOString() : null}
              status={session.status}
            />
          </p>
          <p className="mt-1.5 text-[10px] text-neutral-500 leading-relaxed">Server-calibrated lease for all active candidates</p>
        </div>
      </div>

      {/* Candidate Result Release & Podium Reveal Control */}
      <ResultReleaseControl
        sessionId={session.id}
        initialReleased={resultsReleased}
        initialPodiumRevealed={podiumRevealed}
        initialGamified={Boolean(snap.isGamified || session.exam.description?.includes("[MODE:GAMIFIED]"))}
        resultVisibility={resultVisibility}
        submittedCount={submittedCount}
      />

      {/* ── TEACHER EXCLUSIVE: Live Podium & Leaderboard ── */}
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
        }))}
        totalMarks={totalMarks}
        passCriteria={session.exam.passCriteria ?? 50}
        isLive={!done}
      />

      {/* Global extension */}
      {!done && (
        <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
          <p className={infoLabel}>GLOBAL TIME EXTENSION</p>
          <div className="mt-3 flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-2 flex-wrap">
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
                  <button className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-bold rounded-xl transition-all cursor-pointer">
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
                <button className="px-5 py-2.5 bg-[#e5484d] hover:brightness-110 text-white text-xs font-black rounded-xl transition-all cursor-pointer">
                  Force End Exam
                </button>
              </form>
            </div>
            <Link
              href={`/dashboard/owner/results/${session.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/[0.06] hover:bg-white/10 border border-white/10 text-xs font-bold text-neutral-100 rounded-xl transition-colors w-fit"
            >
              View Full Cohort Report <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="mt-2.5 flex flex-col sm:flex-row gap-1 sm:gap-10 text-[10px] text-neutral-600">
            <p>Applies to all active candidates and shifted deadlines</p>
            <p>Exports summary of all candidates and integrity signals</p>
          </div>
        </div>
      )}

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

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "REGISTERED", v: String(totalCount), s: "Candidates enrolled for this session" },
          { l: "IN PROGRESS", v: String(inProgressCount), s: "Candidates currently answering" },
          { l: "SUBMITTED", v: String(submittedCount), s: "Candidates who completed the exam" },
          { l: "INTEGRITY FLAGS", v: String(totalFlagsCount), s: "Active flags requiring review" },
        ].map((c) => (
          <div key={c.l} className={statCard}>
            <p className={infoLabel}>{c.l}</p>
            <p className="mt-2 text-[26px] leading-none font-black text-white tabular-nums">{c.v}</p>
            <p className="mt-1.5 text-[10px] text-neutral-500">{c.s}</p>
          </div>
        ))}
      </div>

      {/* Candidate table */}
      <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
        <CandidateTable attempts={attempts} totalQuestions={totalQuestions} totalMarks={totalMarks} sessionId={session.id} />
      </div>

      {/* Integrity feed */}
      <IntegrityFeed flags={flags} />
    </div>
  );
}
