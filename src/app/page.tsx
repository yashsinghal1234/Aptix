import { cookies } from "next/headers";
import { LoginForm } from "@/components/LoginForm";
import { CandidateExamFlow } from "@/components/CandidateExamFlow";
import { NoExamPoller } from "@/components/NoExamPoller";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { getCandidateMascot } from "@/app/actions/mascot";
import { logoutAction } from "@/app/actions/auth";
import { startAttemptAction } from "@/app/actions/attempt";
import { CandidateTopbar, CandidateFooter } from "@/components/candidate/CandidateChrome";
import { ReadyChecklist, PreflightDiagnostics, HeartbeatPanel } from "@/components/candidate/HallDiagnostics";
import { Flower } from "@/components/owner/OpsPanels";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;
  
  if (!token) {
    return <LoginForm />;
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return <LoginForm />;
  }

  const role = payload.role as string;
  const name = payload.name as string;
  const email = (payload.email as string) || "";
  const userId = payload.userId as string;
  const examSessionId = payload.examSessionId as string | undefined;
  const roll = `NB-${userId.slice(-4).toUpperCase()}`;
  const domain = email.includes("@") ? email.split("@")[1] : "";

  let activeSession = null;

  // 1. Resolve session specifically bound to this candidate's token
  if (examSessionId) {
    activeSession = await prisma.examSession.findUnique({
      where: { id: examSessionId },
      include: { exam: true }
    });
  }

  // 2. Fallback to candidate's most recent active attempt if session ID wasn't in token
  if (!activeSession) {
    const candidateAttempt = await prisma.candidateAttempt.findFirst({
      where: { userId },
      include: { session: { include: { exam: true } } },
      orderBy: { createdAt: "desc" }
    });
    if (candidateAttempt?.session && ["SCHEDULED", "LIVE"].includes(candidateAttempt.session.status)) {
      activeSession = candidateAttempt.session;
    }
  }

  // 3. Fallback to general active session
  if (!activeSession) {
    activeSession = await prisma.examSession.findFirst({
      where: { status: { in: ["SCHEDULED", "LIVE"] } },
      include: { exam: true },
      orderBy: { createdAt: "desc" }
    });
  }

  if (!activeSession) {
    const preview = await prisma.examSession.findFirst({
      orderBy: { createdAt: "desc" },
      include: { exam: true, _count: { select: { questions: true } } },
    });
    const pq = preview?._count.questions ?? 0;
    return (
      <div className="min-h-screen bg-[#060607] text-neutral-100 flex flex-col font-sans select-none">
        <CandidateTopbar candidateName={name} roll={roll} />
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-4">
          {/* Heading */}
          <div className="flex items-start justify-between gap-6 px-1 pt-1">
            <div>
              <p className="text-[10px] font-bold tracking-[0.22em] text-lime-200/80 mb-3">
                WAITING HALL / {preview?.pin ? preview.pin.replace("APT-", "") : "STANDBY"} · AUTHENTICATED
              </p>
              <h1 className="text-3xl sm:text-[40px] font-black text-white tracking-tight leading-none">
                No Active Exam Right Now<span className="text-lime-300">.</span>
              </h1>
              <p className="text-[13px] text-neutral-400 mt-2.5">Credentials authenticated. Please remain on screen.</p>
            </div>
            <Flower className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 mt-1" />
          </div>

          {/* Lime note */}
          <div className="rounded-2xl border border-lime-300/20 bg-lime-300/[0.05] p-4">
            <p className="text-xs font-bold text-lime-200">You&rsquo;re ready. Waiting for invigilator Go Live.</p>
            <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
              Intended behavior: a silent heartbeat checks launch status every 3 seconds. When the owner opens this assessment, the launch flow opens automatically; fullscreen still requires your browser&rsquo;s permission. No exam time is used while waiting.
            </p>
          </div>

          {/* Pills */}
          <div className="flex flex-wrap gap-1.5">
            {["IDENTITY VERIFIED", preview?.pin ? "PIN VERIFIED" : "AWAITING PIN", domain || "OPEN DOMAIN", "CONNECTED"].map((p) => (
              <span key={p} className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-[0.12em] text-lime-200 bg-lime-300/[0.07] border border-lime-300/20 rounded-md px-2 py-1">
                <span className="w-1 h-1 rounded-full bg-lime-300" />{p}
              </span>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-4 items-start">
            {/* Left column */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
                <h3 className="text-[13px] font-bold text-white">Your next assessment</h3>
                <p className="text-xs font-bold text-neutral-200 mt-2">{preview?.exam.title || "Upcoming assessment"}</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Northbridge University · Engineering cohort 2026 · {preview?.exam.subject || "General"}</p>
                <div className="mt-3 grid grid-cols-3 gap-2.5">
                  {[
                    { l: "Questions", v: String(pq), s: `Attempt 1` },
                    { l: "Duration", v: preview ? `${preview.durationMinutes}m` : "—", s: "Server time" },
                    { l: "Max marks", v: preview ? String(Math.round(preview.totalMarks || preview.exam.totalMarks || 0)) : "—", s: `Pass ${Math.round(preview?.exam.passCriteria ?? 50)}%` },
                  ].map((c) => (
                    <div key={c.l} className="rounded-xl border border-white/10 bg-black/40 p-3 text-center">
                      <p className="text-[9px] font-bold tracking-[0.14em] text-neutral-500">{c.l.toUpperCase()}</p>
                      <p className="mt-1 text-xl font-black text-lime-300 tabular-nums">{c.v}</p>
                      <p className="mt-1 text-[9px] text-neutral-500">{c.s}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[10px] text-neutral-500">
                  {preview?.startTime ? new Date(preview.startTime).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }) + " IST (UTC+05:30)" : "Schedule unlocks at launch"}
                </p>
                <p className="mt-1 text-[10px] text-neutral-600 font-mono">Source PIN: {preview?.pin || "—"} · {email}</p>
              </div>

              <ReadyChecklist />

              <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
                <p className="text-[10px] font-black tracking-[0.14em] text-neutral-300">STATIC ALTERNATIVE · Heartbeat disconnected</p>
                <p className="mt-1.5 text-[10px] text-neutral-500 leading-relaxed">
                  Last contact --IST. Reconnecting. Keep this tab open and check your connection. Automatic launch waits for a fresh server acknowledgement; authentication remains separate from assessment access.
                </p>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <PreflightDiagnostics />
              <HeartbeatPanel />
            </div>
          </div>
        </main>
        <CandidateFooter />
        <NoExamPoller />
      </div>
    );
  }

  // Fetch or create attempt with existing responses for instant crash recovery
  let attempt = await prisma.candidateAttempt.findFirst({
    where: { userId, examSessionId: activeSession.id },
    include: { responses: true }
  });

  if (!attempt) {
    attempt = await prisma.candidateAttempt.create({
      data: {
        userId,
        examSessionId: activeSession.id,
        shuffleSeed: Math.floor(Math.random() * 1000000),
        status: "IN_PROGRESS"
      },
      include: { responses: true }
    });
  }

  // Use High-Performance Cache: Prevents Thundering Herd read spike on 500-1000 concurrent starts
  const { getCachedSessionQuestions } = await import("@/lib/exam-cache");
  const sanitizedQuestions = await getCachedSessionQuestions(activeSession.id);

  // Map saved responses into initial answers dictionary for seamless recovery
  const initialAnswers: Record<string, string> = {};
  if (attempt.responses && attempt.responses.length > 0) {
    for (const r of attempt.responses) {
      initialAnswers[r.questionId] = r.selectedOption;
    }
  }

  // Check if session has gamified mode enabled by teacher
  let isGamified = false;
  if (activeSession.configSnapshot) {
    try {
      const snap = JSON.parse(activeSession.configSnapshot);
      if (snap.isGamified) isGamified = true;
    } catch {}
  }
  if (!isGamified && activeSession.exam?.description?.includes("[MODE:GAMIFIED]")) {
    isGamified = true;
  }

  const initialMascotId = isGamified ? await getCandidateMascot(userId, activeSession.id) : null;

  return (
    <CandidateExamFlow 
      candidateName={name} 
      session={activeSession} 
      attempt={attempt} 
      dbQuestions={sanitizedQuestions}
      initialAnswers={initialAnswers}
      isGamified={isGamified}
      initialMascotId={initialMascotId}
    />
  );
}
