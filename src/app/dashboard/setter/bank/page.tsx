import React from "react";
import Link from "next/link";
import { getCachedQuestionBankData } from "@/lib/dashboard-cache";
import { BankOps } from "@/components/owner/BankOps";
import { Flower } from "@/components/owner/OpsPanels";

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
    try {
      const parsed = JSON.parse(q.options || "[]");
      options = parsed.map((o: any) => (typeof o === "string" ? o : o.text));
    } catch {}
    return {
      id: q.id,
      qcode: `Q-${q.id.slice(-4).toUpperCase()}`,
      text: q.text,
      category: q.category || "General",
      typeLabel: TYPE_LABELS[q.type] || q.type,
      level: q.difficultyLevel === "MEDIUM" ? "Medium" : q.difficultyLevel === "EASY" ? "Easy" : q.difficultyLevel === "HARD" ? "Hard" : q.difficultyLevel,
      workflow: q.status,
      workflowLabel: WORKFLOW_LABELS[q.status] || q.status,
      integrity,
      integrityTone: tone,
      points: q.points ?? 1,
      options,
      locked,
    };
  });

  const approved = rows.filter((r) => r.workflow === "APPROVED").length;
  const drafts = rows.filter((r) => r.workflow === "DRAFT").length;
  const pending = rows.filter((r) => r.workflow === "SUBMITTED").length;

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

  return (
    <div className="max-w-[1440px] mx-auto space-y-4 pb-8">
      <div className="flex items-start justify-between gap-6 px-1 pt-1">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] text-lime-200/80 mb-3">CONTENT LIBRARY / FACULTY &amp; SETTERS</p>
          <h1 className="text-3xl sm:text-[40px] font-black text-white tracking-tight leading-none">
            Total questions<span className="text-lime-300">.</span>
          </h1>
          <p className="text-[13px] text-neutral-400 mt-2.5">
            Add questions, review protected items, and manage quality states without exposing master permissions to faculty.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0">
          <Flower className="w-14 h-14 sm:w-16 sm:h-16" />
          <Link
            href="/dashboard/setter"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-lime-300 hover:brightness-110 text-black rounded-xl text-xs font-black transition-all whitespace-nowrap"
          >
            <span className="text-sm leading-none font-black">+</span> Add questions
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 px-1">
        {[
          `Question bank · ${rows.length}`,
          `Quality queue · ${pending}`,
          `Locked · ${liveIds.size + doneIds.size}`,
        ].map((p) => (
          <span key={p} className="text-[9px] font-black tracking-[0.12em] text-neutral-300 bg-white/[0.05] border border-white/10 rounded-md px-2 py-1 tabular-nums">
            {p}
          </span>
        ))}
        <span className="ml-auto flex gap-2">
          <span className="text-[9px] font-black tracking-[0.12em] text-neutral-400 bg-white/[0.04] border border-white/10 rounded-md px-2 py-1">CSV IMPORT</span>
          <span className="text-[9px] font-black tracking-[0.12em] text-neutral-400 bg-white/[0.04] border border-white/10 rounded-md px-2 py-1">PASTE &amp; PARSE</span>
        </span>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0e0f13] px-5 py-3.5 flex gap-3 items-start">
        <span className="text-lime-300 text-sm mt-0.5">🛡</span>
        <div>
          <p className="text-[11px] font-black text-white">Locked means protected</p>
          <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
            Questions linked to LIVE or COMPLETED assessments cannot be edited or deleted. Their cached snapshots and response history stay intact. Duplicate a blueprint instead.
          </p>
        </div>
      </div>

      <BankOps
        rows={rows}
        queue={queue}
        latest={latest}
        categories={categories}
        types={types}
        levels={levels}
      />

      <p className="px-1 text-[10px] text-neutral-600">
        {approved} approved · {drafts} drafts · {pending} in review · {liveIds.size + doneIds.size} locked by live or completed sessions.
      </p>
    </div>
  );
}
