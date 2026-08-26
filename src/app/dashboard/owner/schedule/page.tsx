import { prisma } from "@/lib/prisma";
import { ScheduleExamForm } from "@/components/ScheduleExamForm";

export default async function SchedulePage() {
  const allQuestions = await prisma.question.findMany({
    orderBy: { category: "asc" }
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Schedule Exam</h2>
        <p className="text-slate-500 mt-1">Create a new live exam by selecting questions from the bank.</p>
      </div>

      <ScheduleExamForm allQuestions={allQuestions} />
    </div>
  );
}
