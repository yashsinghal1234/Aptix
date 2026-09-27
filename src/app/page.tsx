import { cookies } from "next/headers";
import { LoginForm } from "@/components/LoginForm";
import { ExamInterface } from "@/components/ExamInterface";
import { NoExamPoller } from "@/components/NoExamPoller";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { startAttemptAction } from "@/app/actions/attempt";

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
  const userId = payload.userId as string;
  const examSessionId = payload.examSessionId as string | undefined;

  let activeSession = null;

  // 1. Resolve session specifically bound to this candidate's token
  if (examSessionId) {
    activeSession = await prisma.examSession.findUnique({
      where: { id: examSessionId },
      include: { exam: true, questions: true }
    });
  }

  // 2. Fallback to candidate's most recent active attempt if session ID wasn't in token
  if (!activeSession) {
    const candidateAttempt = await prisma.candidateAttempt.findFirst({
      where: { userId },
      include: { session: { include: { exam: true, questions: true } } },
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
      include: { exam: true, questions: true },
      orderBy: { createdAt: "desc" }
    });
  }

  if (!activeSession) {
    return (
      <div className="min-h-screen bg-[#070c18] text-white flex flex-col font-sans select-none relative overflow-hidden">
        {/* Subtle celestial background ambient glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <header className="bg-[#0b1428]/90 border-b border-sky-400/20 px-6 sm:px-8 py-3.5 flex justify-between items-center shadow-lg backdrop-blur-md relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center p-0.5 shadow-sm border border-neutral-800 shrink-0 overflow-hidden">
              <video
                src="/aptix-logo-anim.mp4"
                poster="/logo-preview-frame.jpg"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover mix-blend-screen scale-125"
              />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight leading-none">Aptix Assessment</h1>
              <span className="text-[10px] text-sky-300 font-semibold tracking-wider uppercase">Candidate Waiting Hall</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-sky-200 bg-[#0e1c38] px-3 py-1.5 rounded-full border border-sky-400/25 flex items-center gap-1.5 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Candidate: <strong className="text-white">{name}</strong></span>
            </span>
            <form action={logoutAction}>
              <button className="text-xs font-semibold text-slate-300 hover:text-white bg-[#111e3b] hover:bg-[#1a2d58] px-3.5 py-1.5 rounded-xl transition-all border border-slate-700/80 shadow-sm cursor-pointer">
                Log Out
              </button>
            </form>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="celestial-glass p-8 sm:p-10 rounded-3xl border border-sky-400/25 text-center shadow-[0_25px_60px_-15px_rgba(2,6,18,0.9)] max-w-lg w-full space-y-6 relative overflow-hidden">
            {/* Top celestial starlight accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400/60 to-transparent" />

            <div className="w-16 h-16 bg-blue-950/80 text-sky-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-sky-400/30">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-sky-950/80 border border-sky-400/30 text-[10px] font-bold tracking-widest text-sky-200 uppercase mb-2">
                <span className="text-amber-300">✦</span>
                <span>Session Waiting Hall</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight mb-2">No Active Exam Right Now</h2>
              <p className="text-sky-200/70 text-xs font-medium leading-relaxed max-w-md mx-auto">
                Your credentials are authenticated. Please remain on this screen — as soon as your invigilator launches the session, your assessment will begin automatically.
              </p>
            </div>

            <div className="p-5 bg-[#0a1428]/80 border border-sky-400/20 rounded-2xl text-left space-y-3 shadow-inner">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-xs font-bold text-white">Want to warm up while you wait?</span>
              </div>
              <p className="text-xs text-sky-200/80 font-normal leading-relaxed">
                Take a self-study drill in our zero-stakes <strong>Practice Arena</strong> with instant answer feedback and step-by-step explanations.
              </p>
              <a
                href="/practice"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-extrabold text-xs rounded-xl shadow-[0_4px_16px_rgba(37,99,235,0.35)] transition-all border border-sky-400/30"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Launch Practice Arena</span>
              </a>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-sky-300 bg-[#09152e]/80 py-2 px-4 rounded-full w-fit mx-auto border border-sky-400/25 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Listening for scheduled exams in real-time...</span>
            </div>
            <NoExamPoller />
          </div>
        </div>
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

  return (
    <ExamInterface 
      candidateName={name} 
      session={activeSession} 
      attempt={attempt} 
      dbQuestions={sanitizedQuestions}
      initialAnswers={initialAnswers}
    />
  );
}
