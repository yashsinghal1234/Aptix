import React from "react";
import { prisma } from "@/lib/prisma";
import { getCachedQuestionBankData } from "@/lib/dashboard-cache";
import { BankOps } from "@/components/owner/BankOps";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  MCQ_SINGLE: "Single choice",
  MCQ_MULTI: "Multiple correct",
  FILL_BLANK: "Fill blanks",
  NUMERIC: "Numerical",
  TRUE_FALSE: "True / False",
};

const WORKFLOW_LABELS: Record<string, string> = {
  APPROVED: "Approved",
  SUBMITTED: "In review",
  DRAFT: "Draft",
  REJECTED: "Changes requested",
};

export default async function QuestionBankDashboard() {
  const [questions, lockedSessions] = await getCachedQuestionBankData();
  const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, code: true } });

  const liveIds = new Set<string>();
  const doneIds = new Set<string>();
  for (const s of lockedSessions as any[]) {
    for (const q of s.questions) {
      if (s.status === "LIVE") liveIds.add(q.id);
      else doneIds.add(q.id);
    }
  }

  const rows = (questions as any[]).map((q: any) => {
    const locked = liveIds.has(q.id) || doneIds.has(q.id);
    const integrity = locked
      ? `Locked · ${liveIds.has(q.id) ? "LIVE" : "COMPLETED"}`
      : q.status === "SUBMITTED"
        ? "In review"
        : q.status === "REJECTED"
          ? "Review required"
          : "Editable";
    const tone = locked ? ("lime" as const) : q.status === "REJECTED" ? ("peach" as const) : ("neutral" as const);
    let options: string[] = [];
    let optionCorrect: string | undefined = undefined;
    let optionExplanation: string | undefined = undefined;
    try {
      const parsed = JSON.parse(q.options || "[]");
      options = parsed.map((o: any) => {
        if (typeof o === "string") return o;
        if (o.isCorrect && !optionCorrect) optionCorrect = o.text;
        if (o.explanation && !optionExplanation) optionExplanation = o.explanation;
        return o.text;
      });
    } catch {}
    let answerObj: any = {};
    try {
      answerObj = JSON.parse(q.answerData || "{}");
    } catch {}
    const correctAnswer = answerObj.correctAnswer ?? (answerObj.exact !== undefined ? String(answerObj.exact) : optionCorrect);
    const correctAnswers = answerObj.correctAnswers ?? (answerObj.acceptedAnswers ?? undefined);
    const explanation = answerObj.explanation ?? optionExplanation;

    return {
      id: q.id,
      qcode: `Q-${q.id.slice(-4).toUpperCase()}`,
      text: q.text,
      category: q.category || "General",
      type: q.type,
      typeLabel: TYPE_LABELS[q.type] || q.type,
      level: q.difficultyLevel === "MEDIUM" ? "Medium" : q.difficultyLevel === "EASY" ? "Easy" : q.difficultyLevel === "HARD" ? "Hard" : q.difficultyLevel,
      rawLevel: (q.difficultyLevel || "MEDIUM") as "EASY" | "MEDIUM" | "HARD",
      workflow: q.status,
      workflowLabel: WORKFLOW_LABELS[q.status] || q.status,
      integrity,
      integrityTone: tone,
      points: q.points ?? 1,
      negativePoints: q.negativePoints ?? 0,
      options,
      correctAnswer,
      correctAnswers,
      explanation,
      locked,
      createdAt: q.createdAt ? new Date(q.createdAt).toISOString() : undefined,
    };
  });

  const queue = rows
    .filter((r) => r.workflow === "SUBMITTED")
    .map((r) => ({ id: r.id, qcode: r.qcode, text: r.text, category: r.category }));

  const dayAgo = Date.now() - 24 * 3600 * 1000;
  const withDates = (questions as any[])
    .map((q: any) => ({ q, t: new Date(q.createdAt).getTime() }))
    .sort((a, b) => b.t - a.t);
  const latest = {
    count24h: withDates.filter((x) => x.t >= dayAgo).length,
    items: withDates.slice(0, 5).map(({ q }) => ({
      qcode: `Q-${String(q.id).slice(-4).toUpperCase()}`,
      text: q.text,
      createdLabel: new Date(q.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }),
    })),
  };

  const categories = Array.from(new Set(rows.map((r) => r.category))).sort();
  const types = Array.from(new Set(rows.map((r) => r.typeLabel))).sort();
  const levels = Array.from(new Set(rows.map((r) => r.level))).sort();

  // Subject-wise bank tabs: a question belongs to the subject whose name
  // matches its category (case-insensitive); the rest are Unassigned.
  const subjectTabs = subjects.map((s) => ({
    name: s.name,
    code: s.code,
    count: rows.filter((r) => r.category.toLowerCase() === s.name.toLowerCase()).length,
  }));
  const unassignedCount = rows.filter(
    (r) => !subjects.some((s) => s.name.toLowerCase() === r.category.toLowerCase())
  ).length;

  return (
    <div className="max-w-[1440px] mx-auto">
      <BankOps
        rows={rows}
        queue={queue}
        latest={latest}
        categories={categories}
        types={types}
        levels={levels}
        subjectTabs={subjectTabs}
        unassignedCount={unassignedCount}
      />
    </div>
  );
}
