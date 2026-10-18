"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeleteQuestionButton } from "@/components/DeleteQuestionButton";
import { FilterChip } from "@/components/owner/FilterChip";
import { reviewQuestionAction, approveAllQuestionsAction } from "@/app/actions/schedule";
import { updateQuestionAction, deleteQuestionAction } from "@/app/actions/setter";

export interface BankRow {
  id: string;
  qcode: string;
  text: string;
  category: string;
  type?: string;
  typeLabel: string;
  level: string;
  rawLevel?: "EASY" | "MEDIUM" | "HARD";
  workflow: string;
  workflowLabel: string;
  integrity: string;
  integrityTone: "lime" | "peach" | "neutral";
  points: number;
  negativePoints?: number;
  options: string[];
  correctAnswer?: string;
  correctAnswers?: string[];
  explanation?: string;
  locked: boolean;
  createdAt?: string;
}

export interface QueueItem {
  id: string;
  qcode: string;
  text: string;
  category: string;
}

const selectCls =
  "text-[11px] bg-[#18181c] border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-xl px-3 py-2.5 outline-none font-semibold text-zinc-200 cursor-pointer w-full transition-colors shadow-xs";

/** Two-segment stadium capsule (crisp zinc label body + colored code cap). */
function Capsule({ body, code, codeClass }: { body: string; code: React.ReactNode; codeClass: string }) {
  return (
    <span className="inline-flex items-stretch rounded-full overflow-hidden shrink-0 border border-zinc-700/60 shadow-xs">
      <span className="bg-zinc-100 text-zinc-900 text-xs font-extrabold px-3.5 h-7 flex items-center max-w-[260px] truncate">
        {body}
      </span>
      <span className={`text-xs font-black px-3 h-7 flex items-center justify-center ${codeClass}`}>{code}</span>
    </span>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-3.5 h-3.5"} fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function BulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.516 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}

const TYPE_CODES: Record<string, string> = {
  MCQ_SINGLE: "SC",
  MCQ_MULTI: "MU",
  TRUE_FALSE: "TF",
  FILL_BLANK: "FB",
  NUMERIC: "NM",
};

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-3.5 h-3.5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-3.5 h-3.5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
    </svg>
  );
}

function GaugeIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-3.5 h-3.5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 20h18M5 20v-5m4 5v-9m4 9V9m4 11v-7" />
    </svg>
  );
}

function PulseIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-3.5 h-3.5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-3 h-3"} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.862 4.487z" />
    </svg>
  );
}

function ChevLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function ChevsLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevsRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5l7.5 7.5-7.5 7.5m6-15l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

/** Status-style pill: colored dot + label inside a hairline box. */
function DotPill({ dot, label, text = "text-zinc-300" }: { dot: string; label: string; text?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-zinc-800 bg-[#18181c]/70 text-[11.5px] font-bold whitespace-nowrap shadow-xs ${text}`}>
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

export interface SubjectTab {
  name: string;
  code: string | null;
  count: number;
}

export function BankOps({
  rows,
  queue,
  latest,
  categories,
  types,
  levels,
  subjectTabs = [],
  unassignedCount = 0,
}: {
  rows: BankRow[];
  queue: QueueItem[];
  latest: { count24h: number; items: { qcode: string; text: string; createdLabel: string }[] };
  categories: string[];
  types: string[];
  levels: string[];
  subjectTabs?: SubjectTab[];
  unassignedCount?: number;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [subject, setSubject] = useState("");
  const [type, setType] = useState("");
  const [level, setLevel] = useState("");
  const [page, setPage] = useState(0);
  const [per, setPer] = useState(8);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const [queueMsg, setQueueMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Drawer Edit Form States
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMsg, setEditMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [editStem, setEditStem] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editLevel, setEditLevel] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [editPoints, setEditPoints] = useState<number>(1);
  const [editNegativePoints, setEditNegativePoints] = useState<number>(0);
  const [editOptions, setEditOptions] = useState<string[]>([]);
  const [editCorrectAnswer, setEditCorrectAnswer] = useState<string>("");
  const [editExplanation, setEditExplanation] = useState<string>("");

  const pickSubject = (name: string) => {
    setSubject(name);
    setCat("");
    setPage(0);
  };

  const filtered = rows.filter((r) => {
    if (q && !`${r.text} ${r.qcode} ${r.id}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (subject === "__UNASSIGNED__") {
      if (subjectTabs.some((s) => s.name.toLowerCase() === r.category.toLowerCase())) return false;
    } else if (subject) {
      if (r.category.toLowerCase() !== subject.toLowerCase()) return false;
    } else if (cat && r.category !== cat) return false;
    if (type && r.typeLabel !== type) return false;
    if (level && r.level !== level) return false;
    return true;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / per));
  const shown = filtered.slice(page * per, page * per + per);

  // Numbered pagination window: first + surrounding current + last, "…" between gaps.
  const pageNumbers = useMemo(() => {
    const idxs = Array.from(new Set([0, page - 1, page, page + 1, pages - 1].filter((n) => n >= 0 && n < pages))).sort((a, b) => a - b);
    const out: Array<number | "gap"> = [];
    let prev = -2;
    for (const n of idxs) {
      if (n - prev > 1) out.push("gap");
      out.push(n);
      prev = n;
    }
    return out;
  }, [page, pages]);
  const selected = rows.find((r) => r.id === selectedId) || null;

  // Sync edit form state when selected question changes
  useEffect(() => {
    if (!selectedId) return;
    const r = rows.find((row) => row.id === selectedId);
    if (r) {
      setEditStem(r.text);
      setEditCategory(r.category);
      setEditLevel(r.rawLevel || (r.level.toUpperCase() as any) || "MEDIUM");
      setEditPoints(r.points ?? 1);
      setEditNegativePoints(r.negativePoints ?? 0);
      setEditOptions(r.options.length > 0 ? [...r.options] : ["", ""]);
      setEditCorrectAnswer(r.correctAnswer || (r.options[0] ?? ""));
      setEditExplanation(r.explanation || "");
    }
  }, [selectedId, rows]);

  // Close drawer on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedId) {
        closeDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId]);

  const openQuestion = (id: string) => {
    setSelectedId(id);
    setIsEditing(false);
    setEditMsg(null);
  };

  const closeDrawer = () => {
    setSelectedId(null);
    setIsEditing(false);
    setEditMsg(null);
  };

  const handleAddOption = () => {
    if (editOptions.length >= 8) return;
    setEditOptions((prev) => [...prev, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (editOptions.length <= 2) return;
    const removed = editOptions[index];
    const next = editOptions.filter((_, i) => i !== index);
    setEditOptions(next);
    if (editCorrectAnswer === removed) {
      setEditCorrectAnswer(next[0] || "");
    }
  };

  const handleOptionChange = (index: number, val: string) => {
    const prevVal = editOptions[index];
    const next = [...editOptions];
    next[index] = val;
    setEditOptions(next);
    if (editCorrectAnswer === prevVal) {
      setEditCorrectAnswer(val);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    setConfirmDeleteId(null);
    setDeletingId(id);
    const res = await deleteQuestionAction(id);
    setDeletingId(null);
    if (res?.error) {
      setQueueMsg(res.error);
      return;
    }
    if (selectedId === id) {
      closeDrawer();
    }
    router.refresh();
  };

  const confirmTarget = confirmDeleteId ? rows.find((r) => r.id === confirmDeleteId) : null;

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (!selected.locked && (!editStem.trim() || editStem.trim().length < 5)) {
      setEditMsg({ type: "error", text: "Question stem must be at least 5 characters long." });
      return;
    }
    if (!editCategory.trim() || editCategory.trim().length < 2) {
      setEditMsg({ type: "error", text: "Category must be at least 2 characters long." });
      return;
    }

    setSaving(true);
    setEditMsg(null);

    const cleanOpts = editOptions.map((o) => o.trim()).filter(Boolean);
    const res = await updateQuestionAction({
      id: selected.id,
      text: editStem.trim(),
      category: editCategory.trim(),
      difficultyLevel: editLevel,
      points: Number(editPoints) || 1,
      negativePoints: Number(editNegativePoints) || 0,
      options: cleanOpts.length > 0 ? cleanOpts : undefined,
      correctAnswer: editCorrectAnswer.trim() || undefined,
      explanation: editExplanation.trim() || undefined,
    });

    setSaving(false);

    if (res?.error) {
      setEditMsg({ type: "error", text: res.error });
      return;
    }

    setEditMsg({ type: "success", text: "Question updated successfully!" });
    setIsEditing(false);
    router.refresh();
  };

  const approve = async (id: string) => {
    setApproving(id);
    setQueueMsg(null);
    const res = await reviewQuestionAction(id, "APPROVE");
    setApproving(null);
    if ((res as any)?.error) {
      setQueueMsg((res as any).error);
      return;
    }
    router.refresh();
  };
  const reject = async (id: string) => {
    setRejecting(id);
    setQueueMsg(null);
    const res = await reviewQuestionAction(id, "REJECT");
    setRejecting(null);
    if ((res as any)?.error) {
      setQueueMsg((res as any).error);
      return;
    }
    router.refresh();
  };
  const approveAll = async () => {
    if (!confirm(`Approve all ${queue.length} pending questions?`)) return;
    setApprovingAll(true);
    setQueueMsg(null);
    const res = await approveAllQuestionsAction();
    setApprovingAll(false);
    if ((res as any)?.error) {
      setQueueMsg((res as any).error);
      return;
    }
    setQueueMsg(`Approved all ${queue.length} pending questions.`);
    router.refresh();
  };

  const exportCsv = () => {
    const head = "QCode,Question,Category,Type,Level,Points,Workflow\n";
    const body = filtered
      .map((r) =>
        [
          r.qcode,
          `"${(r.text || "").replace(/"/g, '""')}"`,
          `"${(r.category || "").replace(/"/g, '""')}"`,
          r.typeLabel,
          r.level,
          r.points,
          r.workflowLabel,
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([head + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `questions-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tone = (t: BankRow["integrityTone"]) =>
    t === "lime" ? "text-lime-200" : t === "peach" ? "text-[#f2a488]" : "text-neutral-400";

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 pt-1">
        <h1 className="text-3xl sm:text-[40px] font-black text-white tracking-tight leading-none">
          Total questions<span className="text-lime-300">.</span>
        </h1>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#18181c] hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-xs active:scale-95"
          >
            <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export questions
          </button>
          <Link
            href="/dashboard/setter"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-lime-300 hover:brightness-110 text-black rounded-xl text-xs font-black transition-all whitespace-nowrap shadow-sm active:scale-95"
          >
            <span className="text-sm leading-none font-black">+</span> Add questions
          </Link>
        </div>
      </div>

      {/* Search + filter chips (shared FilterChip dropdowns) */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <div className="relative flex-1 min-w-[240px]">
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="Search stem, tag or question ID..."
            className="w-full h-9 pl-9 pr-8 text-xs bg-[#18181c] border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg outline-none font-medium text-zinc-100 placeholder-zinc-500 transition-colors shadow-xs"
          />
          <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
          </svg>
          {q && (
            <button
              type="button"
              onClick={() => { setQ(""); setPage(0); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
        <FilterChip
          label={cat || "All categories"}
          minWidth="min-w-[220px]"
          options={[
            { label: "All categories", active: cat === "", onSelect: () => { setCat(""); setPage(0); } },
            ...categories.map((o) => ({ label: o, active: cat === o, onSelect: () => { setCat(o); setPage(0); } })),
          ]}
        />
        <FilterChip
          label={type || "All types"}
          options={[
            { label: "All types", active: type === "", onSelect: () => { setType(""); setPage(0); } },
            ...types.map((o) => ({ label: o, active: type === o, onSelect: () => { setType(o); setPage(0); } })),
          ]}
        />
        <FilterChip
          label={level || "All levels"}
          options={[
            { label: "All levels", active: level === "", onSelect: () => { setLevel(""); setPage(0); } },
            ...levels.map((o) => ({ label: o, active: level === o, onSelect: () => { setLevel(o); setPage(0); } })),
          ]}
        />
      </div>

      {/* Review feedback banner */}
      {queueMsg && (
        <div className="rounded-2xl border border-rose-800/50 bg-rose-950/40 px-4 py-3 flex items-start justify-between gap-3">
          <p className="text-xs font-bold text-rose-300 leading-relaxed">{queueMsg}</p>
          <button type="button" onClick={() => setQueueMsg(null)} className="text-rose-300/70 hover:text-white text-xs font-bold shrink-0">✕</button>
        </div>
      )}

      {/* Table without Integrity column */}
      <div className="rounded-2xl border border-zinc-800/80 bg-[#121215] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-zinc-100">Approved &amp; draft questions</h2>
          <span className="text-[10px] font-bold text-zinc-500 tabular-nums">
            SHOWING {shown.length} OF {filtered.length}
          </span>
        </div>
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="pb-3 text-xs font-semibold text-left">
                  <span className="inline-flex items-center gap-2"><DocIcon className="w-4 h-4 text-zinc-500" /> Question</span>
                </th>
                <th className="pb-3 text-xs font-semibold text-center w-[170px]">
                  <span className="inline-flex items-center gap-2 justify-center"><LayersIcon className="w-4 h-4 text-zinc-500" /> Type</span>
                </th>
                <th className="pb-3 text-xs font-semibold text-center w-[130px]">
                  <span className="inline-flex items-center gap-2 justify-center"><GaugeIcon className="w-4 h-4 text-zinc-500" /> Level</span>
                </th>
                <th className="pb-3 text-xs font-semibold text-center w-[180px]">
                  <span className="inline-flex items-center gap-2 justify-center"><PulseIcon className="w-4 h-4 text-zinc-500" /> Workflow</span>
                </th>
                <th className="pb-3 text-xs font-semibold text-center w-[190px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-xs text-zinc-500 py-8 text-center">
                    No questions match these filters.
                  </td>
                </tr>
              ) : (
                shown.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => openQuestion(r.id)}
                    className={`group cursor-pointer transition-colors hover:bg-zinc-800/40 ${
                      selectedId === r.id ? "bg-lime-300/[0.04]" : ""
                    }`}
                  >
                    <td className="py-3 pr-4 align-middle max-w-[280px] sm:max-w-[360px] md:max-w-[460px] lg:max-w-[560px]">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="text-xs font-mono font-bold text-lime-300/80 shrink-0">{r.qcode}</span>
                        <p className={`text-[13px] font-bold truncate min-w-0 transition-colors ${selectedId === r.id ? "text-lime-200" : "text-zinc-100 group-hover:text-lime-200"}`}>
                          {r.text}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap align-middle">
                      <DotPill dot="bg-zinc-500" label={r.typeLabel} />
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap align-middle">
                      <DotPill
                        dot={r.level === "Easy" ? "bg-emerald-400" : r.level === "Hard" ? "bg-rose-400" : "bg-amber-400"}
                        label={r.level}
                      />
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap align-middle">
                      <DotPill
                        dot={
                          r.workflow === "APPROVED" ? "bg-lime-400"
                            : r.workflow === "SUBMITTED" ? "bg-amber-400"
                              : r.workflow === "REJECTED" ? "bg-rose-400"
                                : "bg-zinc-500"
                        }
                        label={r.workflowLabel}
                        text={r.workflow === "APPROVED" ? "text-zinc-200" : r.workflow === "REJECTED" ? "text-rose-300" : "text-zinc-300"}
                      />
                    </td>
                    <td className="py-3 px-3 text-center align-middle whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openQuestion(r.id)}
                          className="inline-flex items-center gap-1.5 border border-zinc-800 bg-[#18181c] hover:bg-zinc-800 rounded-md px-2.5 py-1.5 text-[11.5px] font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer shadow-xs"
                          title="View & edit question"
                        >
                          <PencilIcon className="w-3.5 h-3.5 text-zinc-400" /> View
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === r.id}
                          onClick={() => setConfirmDeleteId(r.id)}
                          className="inline-flex items-center gap-1.5 border border-zinc-800 bg-[#18181c] rounded-md px-2.5 py-1.5 text-[11.5px] font-bold text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/30 transition-colors cursor-pointer disabled:opacity-40 shadow-xs"
                          title="Delete question"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between gap-3 text-[11px] text-zinc-400">
          <div className="flex items-center gap-2.5">
            <span>Rows per page</span>
            <FilterChip
              label={String(per)}
              options={[5, 8, 12, 20, 40].map((n) => ({
                label: String(n),
                active: per === n,
                onSelect: () => { setPer(n); setPage(0); },
              }))}
            />
            <span className="tabular-nums">
              {filtered.length === 0 ? "0 rows" : `${page * per + 1}–${Math.min(filtered.length, (page + 1) * per)} of ${filtered.length} rows`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {[
              { key: "first", icon: <ChevsLeftIcon />, target: 0, disabled: page === 0, title: "First page" },
              { key: "prev", icon: <ChevLeftIcon />, target: page - 1, disabled: page === 0, title: "Previous page" },
            ].map((b) => (
              <button
                key={b.key}
                disabled={b.disabled}
                onClick={() => setPage(b.target)}
                className="h-9 min-w-9 grid place-items-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title={b.title}
              >
                {b.icon}
              </button>
            ))}
            {pageNumbers.map((n, i) =>
              n === "gap" ? (
                <span key={`gap-${i}`} className="px-1 text-zinc-600 tabular-nums">…</span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`h-9 min-w-9 rounded-md text-xs font-bold tabular-nums transition-colors cursor-pointer ${
                    n === page ? "bg-zinc-100 text-zinc-950 font-black shadow-xs" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {n + 1}
                </button>
              )
            )}
            {[
              { key: "next", icon: <ChevRightIcon />, target: page + 1, disabled: page + 1 >= pages, title: "Next page" },
              { key: "last", icon: <ChevsRightIcon />, target: pages - 1, disabled: page + 1 >= pages, title: "Last page" },
            ].map((b) => (
              <button
                key={b.key}
                disabled={b.disabled}
                onClick={() => setPage(b.target)}
                className="h-9 min-w-9 grid place-items-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title={b.title}
              >
                {b.icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Slide-over Drawer for Question Details & Edit
          IMPORTANT: inline marginTop:0 — the parent root uses space-y-4, which would
          otherwise add margin-top to this (last-child) fixed wrapper and push the
          slide-over down, leaving a gap above the drawer. */}
      {selected && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end" style={{ marginTop: 0 }}>
          {/* Backdrop */}
          <div
            onClick={closeDrawer}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity cursor-pointer animate-fadeIn"
          />

          {/* Drawer Panel */}
          <div className="relative w-full sm:max-w-2xl md:max-w-3xl lg:max-w-[820px] bg-[#121215] border-l border-zinc-800 shadow-2xl h-full flex flex-col z-10 overflow-hidden">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-zinc-800 bg-[#0e0e11] shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center flex-wrap gap-2 mb-2.5">
                    <Capsule body={selected.category} code={selected.qcode.replace(/^Q-/, "")} codeClass="bg-lime-300 text-black" />
                    <Capsule body={selected.typeLabel} code={TYPE_CODES[selected.type || ""] || "?"} codeClass="bg-zinc-700 text-white" />
                    <Capsule
                      body={selected.level}
                      code={selected.level.charAt(0).toUpperCase()}
                      codeClass={
                        selected.level === "Easy"
                          ? "bg-emerald-500 text-black"
                          : selected.level === "Hard"
                            ? "bg-rose-500 text-white"
                            : "bg-amber-400 text-black"
                      }
                    />
                    {selected.locked && (
                      <Capsule body="Locked" code={<LockIcon className="w-3.5 h-3.5" />} codeClass="bg-amber-500 text-black" />
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-zinc-100 tracking-tight">
                    {isEditing ? "Edit Question" : "Question Specifications"}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={closeDrawer}
                    title="Close drawer (Esc)"
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Notification messages */}
            {editMsg && (
              <div
                className={`p-4 border-b text-xs font-bold flex items-center justify-between shrink-0 ${
                  editMsg.type === "success"
                    ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                    : "bg-rose-950/40 border-rose-800/60 text-rose-300"
                }`}
              >
                <span>{editMsg.text}</span>
                <button
                  type="button"
                  onClick={() => setEditMsg(null)}
                  className="font-bold text-sm ml-2 cursor-pointer opacity-70 hover:opacity-100"
                >
                  &times;
                </button>
              </div>
            )}

            {/* Short concise notice banner for locked questions */}
            {selected.locked && (
              <div className="bg-zinc-800/40 border-b border-zinc-700/40 px-5 py-2.5 shrink-0 flex items-center gap-2">
                <LockIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <p className="text-[11px] text-zinc-300 font-medium">
                  <span className="font-bold text-amber-300">Past exam item:</span> Question &amp; options are locked. Explanation and settings can be edited.
                </p>
              </div>
            )}

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              {isEditing ? (
                /* EDIT FORM */
                <form onSubmit={handleSaveQuestion} className="space-y-5">
                  {/* Question Stem */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-bold tracking-[0.14em] text-zinc-400 uppercase">
                        Question Stem {selected.locked ? <span className="text-amber-400/90 ml-1.5 font-bold text-[9px] tracking-normal lowercase">(locked · used in past exam)</span> : <span className="text-rose-400">*</span>}
                      </label>
                    </div>
                    <textarea
                      rows={4}
                      required={!selected.locked}
                      disabled={selected.locked}
                      value={editStem}
                      onChange={(e) => setEditStem(e.target.value)}
                      placeholder="Type the full question stem here..."
                      className={`w-full text-xs sm:text-sm p-3.5 rounded-xl border transition-colors leading-relaxed ${
                        selected.locked
                          ? "bg-[#18181c]/50 border-zinc-800 text-zinc-400 cursor-not-allowed select-text"
                          : "bg-[#18181c] border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                      }`}
                    />
                  </div>

                  {/* Category & Difficulty */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.14em] text-zinc-400 mb-1.5">
                        Category / Subject <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        placeholder="e.g. Machine Learning, Physics..."
                        className="w-full text-xs h-[42px] px-3.5 bg-[#18181c] border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.14em] text-zinc-400 mb-1.5">
                        Difficulty Level
                      </label>
                      <select
                        value={editLevel}
                        onChange={(e) => setEditLevel(e.target.value as any)}
                        className="w-full h-[42px] px-3 bg-[#18181c] border border-zinc-800 rounded-xl text-zinc-200 cursor-pointer focus:border-zinc-500 focus:outline-none transition-colors"
                      >
                        <option value="EASY" className="bg-[#18181c] text-zinc-100">Easy</option>
                        <option value="MEDIUM" className="bg-[#18181c] text-zinc-100">Medium</option>
                        <option value="HARD" className="bg-[#18181c] text-zinc-100">Hard</option>
                      </select>
                    </div>
                  </div>

                  {/* Points & Negative Points */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.14em] text-zinc-400 mb-1.5">
                        Points Awarded
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={editPoints}
                        onChange={(e) => setEditPoints(parseFloat(e.target.value) || 1)}
                        className="w-full text-xs h-[42px] px-3.5 bg-[#18181c] border border-zinc-800 rounded-xl text-zinc-100 focus:border-zinc-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.14em] text-zinc-400 mb-1.5">
                        Negative Points
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        value={editNegativePoints}
                        onChange={(e) => setEditNegativePoints(parseFloat(e.target.value) || 0)}
                        className="w-full text-xs h-[42px] px-3.5 bg-[#18181c] border border-zinc-800 rounded-xl text-zinc-100 focus:border-zinc-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Options Editor */}
                  {editOptions.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-bold tracking-[0.14em] text-zinc-400 uppercase">
                          Options &amp; Correct Answer {selected.locked && <span className="text-amber-400/90 ml-1.5 font-bold text-[9px] tracking-normal lowercase">(locked · used in past exam)</span>}
                        </label>
                        {!selected.locked && (
                          <span className="text-[10px] text-zinc-500">
                            Select the radio button for the correct answer
                          </span>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        {editOptions.map((opt, idx) => {
                          const letter = String.fromCharCode(65 + idx);
                          const isChecked = editCorrectAnswer === opt && opt.length > 0;
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <label className={`flex items-center shrink-0 ${selected.locked ? "cursor-not-allowed" : "cursor-pointer"}`}>
                                <input
                                  type="radio"
                                  name="correctOptionRadio"
                                  disabled={selected.locked}
                                  checked={isChecked}
                                  onChange={() => setEditCorrectAnswer(opt)}
                                  className="accent-lime-300 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                                />
                                <span className="w-6 text-center text-xs font-mono font-bold text-zinc-400 ml-1">
                                  {letter}.
                                </span>
                              </label>
                              <input
                                type="text"
                                required={!selected.locked}
                                disabled={selected.locked}
                                value={opt}
                                onChange={(e) => handleOptionChange(idx, e.target.value)}
                                placeholder={`Option ${letter}`}
                                className={`flex-1 text-xs h-[40px] px-3 border rounded-xl transition-colors ${
                                  selected.locked
                                    ? "bg-[#18181c]/50 border-zinc-800 text-zinc-400 cursor-not-allowed"
                                    : isChecked
                                      ? "border-lime-300/60 bg-lime-400/[0.04] text-zinc-100"
                                      : "border-zinc-800 bg-[#18181c] text-zinc-100 focus:border-zinc-500 focus:outline-none"
                                }`}
                              />
                              {!selected.locked && editOptions.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(idx)}
                                  title="Remove option"
                                  className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {!selected.locked && editOptions.length < 8 && (
                        <button
                          type="button"
                          onClick={handleAddOption}
                          className="text-[11px] font-bold text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl px-3 py-1.5 transition-colors cursor-pointer"
                        >
                          + Add Option
                        </button>
                      )}
                    </div>
                  )}

                  {/* Explanation */}
                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.14em] text-zinc-400 uppercase mb-1.5">
                      Explanation / Solution Notes
                    </label>
                    <textarea
                      rows={4}
                      value={editExplanation}
                      onChange={(e) => setEditExplanation(e.target.value)}
                      placeholder="Provide the rationale, formula, or step-by-step solution shown during candidate review..."
                      className="w-full text-xs p-3.5 bg-[#18181c] border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none transition-colors leading-relaxed"
                    />
                  </div>

                  {/* Form Buttons */}
                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditMsg(null);
                      }}
                      disabled={saving}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black bg-lime-300 hover:brightness-110 text-black transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? (
                        <>
                          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save Changes</span>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* VIEW DETAILS MODE */
                <div className="space-y-5">
                  {/* Stem */}
                  <div className="rounded-2xl border border-zinc-800/80 bg-[#18181c]/70 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold tracking-[0.14em] text-zinc-400 uppercase">Question Stem</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selected.text);
                          setEditMsg({ type: "success", text: "Question stem copied to clipboard!" });
                        }}
                        className="text-[10px] font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg px-2.5 py-1 transition-colors cursor-pointer"
                      >
                        Copy stem
                      </button>
                    </div>
                    <p className="text-sm sm:text-base font-bold text-zinc-100 leading-relaxed select-text">
                      {selected.text}
                    </p>
                  </div>

                  {/* Options & Answers */}
                  <div className="rounded-2xl border border-zinc-800/80 bg-[#18181c]/70 p-4 sm:p-5">
                    <span className="block text-[10px] font-bold tracking-[0.14em] text-zinc-400 uppercase mb-3">
                      Options &amp; Correct Answer
                    </span>
                    {selected.options.length > 0 ? (
                      <div className="space-y-2.5">
                        {selected.options.map((opt, i) => {
                          const letter = String.fromCharCode(65 + i);
                          const isCorrect =
                            (selected.correctAnswer && opt.trim().toLowerCase() === selected.correctAnswer.trim().toLowerCase()) ||
                            (selected.correctAnswers && selected.correctAnswers.some((a) => a.trim().toLowerCase() === opt.trim().toLowerCase()));

                          return (
                            <div
                              key={i}
                              className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                                isCorrect
                                  ? "bg-lime-400/[0.08] border-lime-400/40 text-white"
                                  : "bg-[#131316] border-zinc-800 text-zinc-300"
                              }`}
                            >
                              <span
                                className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 ${
                                  isCorrect
                                    ? "bg-lime-300 text-black font-black"
                                    : "bg-zinc-800 text-zinc-400 font-semibold"
                                }`}
                              >
                                {letter}
                              </span>
                              <p className="flex-1 text-xs leading-relaxed pt-0.5 break-words select-text font-medium">
                                {opt}
                              </p>
                              {isCorrect && (
                                <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black tracking-wide text-lime-300 bg-lime-400/20 border border-lime-400/30 px-2 py-0.5 rounded-full">
                                  ✓ Correct Answer
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : selected.correctAnswer ? (
                      <div className="p-3.5 rounded-xl border border-lime-400/30 bg-lime-400/[0.08]">
                        <span className="text-[10px] font-bold text-lime-300 uppercase tracking-wider block mb-1">Accepted Target Answer</span>
                        <p className="text-sm font-mono font-bold text-white select-text">{selected.correctAnswer}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 italic">No structured options attached.</p>
                    )}
                  </div>

                  {/* Explanation */}
                  <div className="rounded-2xl border border-zinc-800/80 bg-[#18181c]/70 p-4 sm:p-5">
                    <span className="block text-[10px] font-bold tracking-[0.14em] text-zinc-400 uppercase mb-2">
                      Explanation &amp; Solution Notes
                    </span>
                    {selected.explanation ? (
                      <div className="p-3.5 rounded-xl border border-zinc-800 bg-[#131316] text-xs sm:text-[13px] text-zinc-200 leading-relaxed select-text flex gap-2.5">
                        <BulbIcon className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                        <span>{selected.explanation}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 italic">
                        No explanation or hints set for this question. Use &quot;Edit Question&quot; below to add one.
                      </p>
                    )}
                  </div>

                  {/* Metadata grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-zinc-800 bg-[#131316] p-3">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Category</span>
                      <p className="text-xs font-bold text-zinc-200 mt-1 truncate">{selected.category}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-[#131316] p-3">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Difficulty</span>
                      <p className="text-xs font-bold text-zinc-200 mt-1">{selected.level}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-[#131316] p-3">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Marking</span>
                      <p className="text-xs font-bold text-zinc-200 mt-1">+{selected.points} / -{selected.negativePoints || 0}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-[#131316] p-3">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Workflow</span>
                      <p className="text-xs font-bold text-zinc-200 mt-1">{selected.workflowLabel}</p>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={deletingId === selected.id}
                      onClick={() => setConfirmDeleteId(selected.id)}
                      className="px-4 py-2 bg-rose-500 hover:brightness-110 text-white text-xs font-black rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {deletingId === selected.id ? "Deleting..." : "Delete Question"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(!isEditing);
                        setEditMsg(null);
                      }}
                      className="px-4 py-2 bg-lime-300 hover:brightness-110 text-black text-xs font-black rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      {isEditing ? "View Details" : "Edit Question"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmTarget && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4" style={{ marginTop: 0 }} onClick={() => setConfirmDeleteId(null)}>
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-[#121215] border border-zinc-800 shadow-2xl p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-black text-zinc-100">Delete Question</h3>
                <p className="mt-2.5 text-xs text-zinc-400 leading-relaxed">
                  This permanently removes the question. Actions cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                aria-label="Close"
                className="w-8 h-8 shrink-0 rounded-lg border border-white/10 bg-white/[0.05] text-zinc-400 hover:text-white hover:bg-white/10 flex items-center justify-center text-lg leading-none transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-800 bg-[#18181c] p-3.5">
              <p className="text-[10px] font-bold tracking-[0.14em] text-zinc-500 uppercase mb-1.5">
                {confirmTarget.category} · {confirmTarget.qcode}
              </p>
              <p className="text-xs text-zinc-200 leading-relaxed line-clamp-3">{confirmTarget.text}</p>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 text-[11px] font-bold text-zinc-300 border border-white/10 hover:bg-white/[0.06] hover:text-white rounded-xl px-3 py-2.5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingId === confirmTarget.id}
                onClick={() => handleDeleteQuestion(confirmTarget.id)}
                className="flex-1 text-[11px] font-black text-white bg-[#e5484d] hover:brightness-110 rounded-xl px-3 py-2.5 transition-all disabled:opacity-40 cursor-pointer"
              >
                {deletingId === confirmTarget.id ? "Deleting..." : "Delete Question"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Queue + latest */}
      <div className="grid lg:grid-cols-2 gap-4 items-stretch">
        <div className="rounded-2xl border border-zinc-800/80 bg-[#121215] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[15px] font-bold text-zinc-100">Quality queue</h2>
            <span className="text-[9px] font-black tracking-[0.14em] text-zinc-400 tabular-nums">{queue.length} PENDING</span>
          </div>
          {queue.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4">Queue is clear. New submissions land here for review.</p>
          ) : (
            <div className="space-y-2 mt-2">
              {queue.slice(0, 4).map((it) => (
                <div key={it.id} className="flex items-center gap-3">
                  <p className="flex-1 text-[11px] text-zinc-200 leading-snug line-clamp-2 min-w-0">
                    <span className="font-mono text-zinc-500">{it.qcode} ++ </span>{it.text}
                  </p>
                  <button
                    disabled={approving === it.id}
                    onClick={() => approve(it.id)}
                    className="text-[10px] font-black text-black bg-lime-300 hover:brightness-110 rounded-lg px-2.5 py-1.5 transition-all disabled:opacity-50 shrink-0"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          )}
          {queue.length > 0 && (
            <button
              onClick={approveAll}
              disabled={approvingAll}
              className="mt-3 text-[11px] font-black text-black bg-lime-300 hover:brightness-110 rounded-xl px-4 py-2 transition-all disabled:opacity-50"
            >
              {approvingAll ? "Approving…" : `Approve all ${queue.length}`}
            </button>
          )}
          <p className="mt-2.5 text-[10px] text-zinc-600">Content reviews · possible duplicates · missing explanations surface here.</p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-[#121215] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[15px] font-bold text-zinc-100">Latest additions</h2>
            <span className="text-[9px] font-bold tracking-[0.14em] text-zinc-400 tabular-nums">
              {latest.count24h} IN 24H
            </span>
          </div>
          {latest.items.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4">Nothing added yet.</p>
          ) : (
            <div className="space-y-2 mt-2">
              {latest.items.map((it) => (
                <div key={it.qcode} className="flex items-baseline gap-3">
                  <span className="text-[10px] font-mono font-bold text-lime-200 shrink-0">{it.qcode}</span>
                  <p className="flex-1 text-[11px] text-zinc-300 truncate">{it.text}</p>
                  <span className="text-[10px] text-zinc-600 shrink-0">{it.createdLabel}</span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2.5 text-[10px] text-zinc-600">New manual, CSV and paste additions land here first as drafts.</p>
        </div>
      </div>
    </div>
  );
}
