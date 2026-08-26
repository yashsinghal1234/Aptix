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

  const activeSession = await prisma.examSession.findFirst({
    where: {
      status: { in: ["SCHEDULED", "LIVE"] }
    },
    include: { exam: true, questions: true },
    orderBy: { createdAt: "desc" }
  });

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
          <div className="bg-white p-10 rounded-2xl border border-slate-100/80 text-center shadow-soft-xl max-w-md w-full">
            <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm border border-brand-100">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2 tracking-tight">No Exams Scheduled</h2>
            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
              There are currently no active assessments assigned to your account. This page will automatically refresh when an exam goes live.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-brand-600 bg-brand-50 py-2 px-4 rounded-full w-fit mx-auto border border-brand-100">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
              <span>Listening for live sessions...</span>
            </div>
            <NoExamPoller />
          </div>
        </div>
      </div>
    );
  }

  // Attempt creation
  let attempt = await prisma.candidateAttempt.findFirst({
    where: { userId, examSessionId: activeSession.id }
  });

  if (!attempt) {
    attempt = await prisma.candidateAttempt.create({
      data: {
        userId,
        examSessionId: activeSession.id,
        shuffleSeed: Math.floor(Math.random() * 1000000),
        status: "IN_PROGRESS"
      }
    });
  }

  // Security: Strip correctAnswer and IRT params before sending to the client component!
  const sanitizedQuestions = activeSession.questions.map(q => {
    let parsedOptions = [];
    try {
      parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
    } catch (e) {
      console.error("Failed to parse options", e);
    }
    
    return {
      id: q.id,
      text: q.text,
      imageUrl: q.imageUrl,
      options: parsedOptions,
      category: q.category,
      type: q.type, // Make sure type is sent so UI renders correctly!
    };
  });

  return (
    <ExamInterface 
      candidateName={name} 
      session={activeSession} 
      attempt={attempt} 
      dbQuestions={sanitizedQuestions} 
    />
  );
}
