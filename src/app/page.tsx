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
        <header className="bg-white border-b px-8 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">A</div>
            <h1 className="text-xl font-bold text-slate-800">Aptix</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-600">Welcome, {name}</span>
            <form action={logoutAction}>
              <button className="text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-md transition-colors">
                Log Out
              </button>
            </form>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl border text-center shadow-sm max-w-sm w-full">
            <h2 className="text-xl font-bold text-slate-800 mb-2">No Exams Available</h2>
            <p className="text-slate-500">There are currently no active or scheduled exams.</p>
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
