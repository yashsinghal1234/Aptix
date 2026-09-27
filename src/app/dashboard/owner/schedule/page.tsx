import { prisma } from "@/lib/prisma";
import { ScheduleExamForm } from "@/components/ScheduleExamForm";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const allQuestions = await prisma.question.findMany({
    orderBy: { category: "asc" }
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="border-b border-neutral-800 pb-4">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Schedule Exam</h2>
        <p className="text-neutral-400 text-xs mt-1">Create a new live exam by selecting questions from the bank.</p>
      </div>

      <ScheduleExamForm allQuestions={allQuestions} />
    </div>
  );
}
