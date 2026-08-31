import { cookies } from "next/headers";
import { LoginForm } from "@/components/LoginForm";
import { ExamInterface } from "@/components/ExamInterface";
import { NoExamPoller } from "@/components/NoExamPoller";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { startAttemptAction } from "@/app/actions/attempt";

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
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-navy-900 border-b border-navy-800 px-8 py-3.5 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1 shadow-sm shrink-0">
              <img src="/aptix_logo.jpg" alt="Aptix" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Aptix Assessment</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-300 bg-navy-800 px-3 py-1.5 rounded-full border border-slate-700">
              Candidate: <span className="text-white font-bold">{name}</span>
            </span>
            <form action={logoutAction}>
              <button className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 rounded-lg transition-colors border border-slate-700">
                Log Out
              </button>
            </form>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-3xl border border-slate-100 text-center shadow-soft-xl max-w-lg w-full space-y-6">
            <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-brand-100">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">No Active Exam Right Now</h2>
              <p className="text-slate-500 text-xs font-medium leading-relaxed">
                There is currently no live assessment scheduled for your account. This screen is continuously listening and will automatically start when an exam goes live.
              </p>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl text-left space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <span className="text-xs font-extrabold text-slate-900">Want to warm up while you wait?</span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Try out our zero-stakes <strong>Practice Arena</strong> with instant answer feedback and step-by-step explanations.
              </p>
              <a
                href="/practice"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-brand transition-all"
              >
                <span>🚀 Launch Practice Mode</span>
              </a>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-brand-600 bg-brand-50 py-2 px-4 rounded-full w-fit mx-auto border border-brand-100">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
              <span>Listening for scheduled exams...</span>
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
