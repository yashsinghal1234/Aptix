"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setSessionStatusAction } from "@/app/actions/session";
import { reviewQuestionAction, approveAllQuestionsAction } from "@/app/actions/schedule";
import { updateTemplateAction, duplicateTemplateAction, deleteTemplateAction } from "@/app/actions/template";
import { LaunchSessionForm } from "@/components/LaunchSessionForm";
import { Panel } from "./OpsPanels";

/* ── Ticking IST clock ───────────────────────────── */
export function EngineClock() {
  const [t, setT] = useState("--:--:--");
  useEffect(() => {
    const f = () =>
      setT(new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: false }));
    f();
    const id = setInterval(f, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="text-[10px] font-mono text-neutral-500 tabular-nums">{t}</span>;
}

/* ── Score distribution ──────────────────────────── */
export interface DistOption {
  id: string;
  label: string;
  examTitle: string;
  tierCounts: number[];
  avgScore: number;
  medianScore: number;
  passRate: number;
  peakTierLabel: string;
  totalEvaluated: number;
}

const TIER_LABELS = ["<40%", "40–55%", "55–70%", "70–85%", ">85%"];
const TIER_COLORS = ["#f2a488", "#454c40", "#bef264", "#729338", "#485c27"];

export function ScoreDistributionPanel({
  options,
  defaultId,
}: {
  options: DistOption[];
  defaultId: string;
}) {
  const [sel, setSel] = useState(defaultId);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const opt = options.find((o) => o.id === sel) || options[0];

  // Click outside & Escape key listeners
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDropdownOpen(false);
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);

  if (!opt) return null;
  const max = Math.max(...opt.tierCounts, 1);

  return (
    <Panel
      title="Score Distribution"
      className="h-full flex flex-col justify-between"
      action={
        <div className="relative" ref={dropdownRef}>
          {/* Custom Trigger Button */}
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="bg-white text-black pl-3.5 pr-8 py-1.5 sm:py-2 rounded-xl flex items-center shadow-md select-none transition-all hover:bg-neutral-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
          >
            <span className="text-left font-bold text-xs text-neutral-900 leading-tight max-w-[130px] sm:max-w-[170px] truncate block">
              {opt.examTitle}
            </span>
            <div
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-900 pointer-events-none transition-transform duration-200 ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Custom Dark Popover Dropdown matching Aptix styling */}
          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 rounded-2xl bg-[#0c0f17]/95 backdrop-blur-2xl border border-neutral-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150"
              role="listbox"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800/80 text-[11px] font-bold text-neutral-400">
                <span className="uppercase tracking-wider flex items-center gap-1.5 text-neutral-300">
                  <svg className="w-3.5 h-3.5 text-lime-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  Select Assessment
                </span>
                <span className="font-mono text-[10px] text-neutral-400">
                  {options.length} Options
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1 py-1 pr-1 custom-scrollbar">
                {options.map((o) => {
                  const isSelected = o.id === sel;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setSel(o.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? "bg-white/[0.12] border border-white/20 text-white font-bold"
                          : "hover:bg-neutral-800/60 text-neutral-300 hover:text-white"
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span className="text-xs truncate block font-medium">
                        {o.examTitle}
                      </span>
                      {isSelected && (
                        <svg className="w-4 h-4 text-lime-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      }
    >
      <div>
        {/* Top metrics: side-by-side percentage + description */}
        <div className="flex flex-wrap items-center gap-7 sm:gap-9 mt-1 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl sm:text-[34px] font-black text-[#bef264] tracking-tight tabular-nums leading-none">
              {opt.passRate.toFixed(1)}%
            </span>
            <div className="flex flex-col text-xs leading-[1.25]">
              <span className="font-semibold text-neutral-300">Pass Rate</span>
              <span className="text-neutral-400">Cutoff: 55%</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-3xl sm:text-[34px] font-black text-white tracking-tight tabular-nums leading-none">
              {opt.medianScore.toFixed(1)}%
            </span>
            <div className="flex flex-col text-xs leading-[1.25]">
              <span className="font-semibold text-neutral-300">Median Score</span>
              <span className="text-neutral-400">
                {opt.totalEvaluated} candidate{opt.totalEvaluated === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>

        {/* 5 Wide Histogram Bars */}
        <div className="grid grid-cols-5 gap-3 sm:gap-4 items-end h-[120px] pt-3">
          {opt.tierCounts.map((c, i) => {
            const heightPx = c > 0 ? Math.max(22, Math.round(22 + ((c / max) * 92))) : 6;
            return (
              <div key={i} className="flex flex-col items-center justify-end h-full">
                <div
                  className="w-full rounded-md sm:rounded-lg transition-all duration-500 shadow-sm"
                  style={{
                    height: `${heightPx}px`,
                    backgroundColor: c > 0 ? TIER_COLORS[i] : "rgba(255, 255, 255, 0.08)",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Labels & Counts below bars */}
        <div className="grid grid-cols-5 gap-3 sm:gap-4 mt-2.5">
          {opt.tierCounts.map((c, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <span className="text-[11px] sm:text-xs font-medium text-neutral-400 tracking-tight">
                {TIER_LABELS[i]}
              </span>
              <span className="text-xs sm:text-[13px] font-bold text-white tabular-nums mt-1">
                {c}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Cutoff note */}
      <div className="flex items-center gap-2.5 mt-6 pt-1 text-xs text-neutral-400 font-normal">
        <span className="w-5 h-[2px] rounded-full bg-[#f2a488] shrink-0" />
        <span>Cutoff at 55% · candidates below will not qualify</span>
      </div>
    </Panel>
  );
}

/* ── Live sessions table ─────────────────────────── */
function fmtIST(d: Date) {
  return d.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
}

export function LiveSessionsTable({ initialSessions, serverNow }: { initialSessions: any[]; serverNow: string }) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [now, setNow] = useState(() => new Date(serverNow));
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"END" | "GO_LIVE" | null>(null);

  useEffect(() => { setSessions(initialSessions); }, [initialSessions]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const runStatus = async (sessionId: string, status: "LIVE" | "COMPLETED", kind: "END" | "GO_LIVE") => {
    if (kind === "END" && !confirm("Conclude this assessment session? Active candidate submissions will be finalized.")) return;
    setLoadingId(sessionId);
    setActionType(kind);
    try {
      const fd = new FormData();
      fd.append("sessionId", sessionId);
      fd.append("status", status);
      const res = await setSessionStatusAction(fd);
      if (res?.success) {
        if (kind === "END") setSessions((p) => p.filter((s) => s.id !== sessionId));
        else setSessions((p) => p.map((s) => (s.id === sessionId ? { ...s, status: "LIVE", startTime: new Date().toISOString() } : s)));
        router.refresh();
      } else alert(res?.error || "Action failed. Please try again.");
    } catch { alert("An unexpected error occurred."); }
    finally { setLoadingId(null); setActionType(null); }
  };

  const withEffective = sessions.map((s) => {
    const st = s.startTime ? new Date(s.startTime) : null;
    const eff = s.status === "SCHEDULED" && st && st <= now ? "LIVE" : s.status;
    return { s, st, eff, live: eff === "LIVE" };
  });
  const joined = sessions.reduce((a, s) => a + (s._count?.attempts || 0), 0);

  return (
    <Panel
      id="live"
      title="Live Sessions"
      className="h-full flex flex-col"
      action={
        <Link href="/dashboard/owner/template/new" className="text-[11px] font-bold text-neutral-300 hover:text-white border border-white/15 rounded-lg px-3 py-1.5 transition-colors">
          ↗ Open command center
        </Link>
      }
    >
      {sessions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center min-h-[320px]">
          <p className="text-xs text-neutral-500">No active sessions yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="grid grid-cols-[1.4fr_auto_auto_auto_auto_auto] gap-x-4 gap-y-1 items-center min-w-[640px]">
            {(["ASSESSMENT", "PIN", "CANDIDATES", "WINDOW · IST", "STATUS", "ACTIONS"] as const).map((h, i) => (
              <p key={h} className={`text-[9px] font-bold tracking-[0.16em] text-neutral-600 pb-2 ${i >= 1 ? "text-center" : ""} ${i === 5 ? "text-right" : ""}`}>{h}</p>
            ))}
            {withEffective.map(({ s, st, eff, live }) => {
              const busy = loadingId === s.id;
              const end = st && s.durationMinutes ? new Date(st.getTime() + s.durationMinutes * 60000) : null;
              return (
                <React.Fragment key={s.id}>
                  <div className="py-3 border-t border-white/[0.06] pr-2">
                    <p className="text-xs font-bold text-neutral-100 truncate">{s.exam?.title || "Assessment"}</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      {(s.exam?.title || "").slice(0, 3).toUpperCase()}-{(s.pin || "").replace("APT-", "")} · {s._count?.questions ?? s.questions?.length ?? "–"} Qs
                    </p>
                  </div>
                  <p className="py-3 border-t border-white/[0.06] text-center">
                    {s.pin ? (
                      <button
                        onClick={() => navigator.clipboard.writeText(s.pin)}
                        title="Click to copy PIN"
                        className="font-mono text-[11px] font-bold text-lime-200 hover:text-lime-100"
                      >
                        {s.pin.replace("APT-", "")}
                      </button>
                    ) : (<span className="text-neutral-600">—</span>)}
                  </p>
                  <p className="py-3 border-t border-white/[0.06] text-xs text-neutral-300 tabular-nums text-center">
                    {s._count?.attempts || 0}{live ? ` / ${s._count?.attempts || 0}` : " reg."}
                  </p>
                  <p className="py-3 border-t border-white/[0.06] text-[11px] text-neutral-400 tabular-nums text-center whitespace-nowrap">
                    {st ? `${fmtIST(st)}${end ? `–${fmtIST(end)}` : ""}` : "—"}
                  </p>
                  <p className="py-3 border-t border-white/[0.06] text-center">
                    {live ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-lime-200"><span className="w-1.5 h-1.5 rounded-full bg-lime-300 animate-pulse" />LIVE</span>
                    ) : (
                      <span className="text-[9px] font-black tracking-wider text-neutral-400 bg-white/[0.06] border border-white/10 rounded px-1.5 py-0.5">SCHEDULED</span>
                    )}
                  </p>
                  <div className="py-3 border-t border-white/[0.06] flex items-center justify-end gap-1.5">
                    <Link
                      href={`/dashboard/owner/session/${s.id}`}
                      className="text-[11px] font-bold text-neutral-200 bg-white/[0.06] hover:bg-white/10 border border-white/10 rounded-lg px-2.5 py-1.5 transition-colors"
                    >
                      Monitor
                    </Link>
                    {eff === "SCHEDULED" ? (
                      <button
                        disabled={busy}
                        onClick={() => runStatus(s.id, "LIVE", "GO_LIVE")}
                        className="text-[11px] font-bold text-black bg-lime-300 hover:brightness-110 rounded-lg px-2.5 py-1.5 transition-all disabled:opacity-50"
                      >
                        {busy ? "..." : "Go Live"}
                      </button>
                    ) : (
                      <button
                        disabled={busy}
                        onClick={() => runStatus(s.id, "COMPLETED", "END")}
                        className="text-[11px] font-bold text-[#f2a488] bg-[#f2a488]/10 hover:bg-[#f2a488]/20 border border-[#f2a488]/30 rounded-lg px-2.5 py-1.5 transition-all disabled:opacity-50"
                      >
                        {busy ? "..." : "Conclude"}
                      </button>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ── Quality queue ───────────────────────────────── */
type QTab = "PENDING" | "APPROVED" | "DRAFT" | "REJECTED" | "ALL";

export function QualityQueue({ questions }: { questions: any[] }) {
  const [tab, setTab] = useState<QTab>("PENDING");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [batch, setBatch] = useState(false);
  const [localQuestions, setLocalQuestions] = useState(questions);
  const router = useRouter();

  useEffect(() => {
    setLocalQuestions(questions);
  }, [questions]);

  const pending = localQuestions.filter((q) => q.status === "SUBMITTED");
  const approved = localQuestions.filter((q) => q.status === "APPROVED");
  const drafts = localQuestions.filter((q) => q.status === "DRAFT");
  const rejected = localQuestions.filter((q) => q.status === "REJECTED");
  const list =
    tab === "PENDING"
      ? pending
      : tab === "APPROVED"
      ? approved
      : tab === "DRAFT"
      ? drafts
      : tab === "REJECTED"
      ? rejected
      : localQuestions;
  const shown = list.slice(0, 6);

  const review = async (id: string, action: "APPROVE" | "REJECT") => {
    setLoadingId(id);
    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    setLocalQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: newStatus } : q))
    );
    const res = await reviewQuestionAction(id, action);
    setLoadingId(null);
    if (res?.error) {
      setLocalQuestions(questions);
      alert(res.error);
    } else {
      router.refresh();
    }
  };

  const approveAll = async () => {
    if (!confirm(`Approve all ${pending.length} pending questions?`)) return;
    setBatch(true);
    setLocalQuestions((prev) =>
      prev.map((q) => (q.status === "SUBMITTED" ? { ...q, status: "APPROVED" } : q))
    );
    const res = await approveAllQuestionsAction();
    setBatch(false);
    if (res?.error) {
      setLocalQuestions(questions);
      alert(res.error);
    } else {
      router.refresh();
    }
  };

  const tabs: { k: QTab; label: string; n: number }[] = [
    { k: "PENDING", label: "Pending", n: pending.length },
    { k: "APPROVED", label: "Approved", n: approved.length },
    { k: "DRAFT", label: "Drafts", n: drafts.length },
    { k: "REJECTED", label: "Rejected", n: rejected.length },
    { k: "ALL", label: "All", n: localQuestions.length },
  ];

  return (
    <Panel
      title="Quality Queue"
      className="h-full"
      action={
        pending.length > 0 ? (
          <button
            onClick={approveAll}
            disabled={batch}
            className="text-[10px] font-black text-black bg-lime-300 hover:brightness-110 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            {batch ? "Approving..." : "Approve All Selected"}
          </button>
        ) : undefined
      }
    >
      <div className="flex gap-1.5 flex-wrap mb-3">
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`text-[10px] font-bold rounded-lg px-2.5 py-1.5 border transition-colors cursor-pointer ${
              tab === t.k
                ? "text-lime-200 border-lime-300/40 bg-lime-300/10"
                : "text-neutral-500 border-white/10 hover:text-white"
            }`}
          >
            {t.label} ({t.n})
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center">
        <p className="text-[9px] font-bold tracking-[0.16em] text-neutral-600 pb-1">QUESTION PREVIEW</p>
        <p className="text-[9px] font-bold tracking-[0.16em] text-neutral-600 pb-1">SUBJECT</p>
        <p className="text-[9px] font-bold tracking-[0.16em] text-neutral-600 pb-1 text-right">ACTIONS</p>
        {shown.length === 0 && <p className="col-span-3 text-xs text-neutral-500 py-4">Nothing here right now.</p>}
        {shown.map((q) => (
          <React.Fragment key={q.id}>
            <p className="text-[11px] text-neutral-200 py-2.5 border-t border-white/[0.06] leading-snug line-clamp-2 pr-2">{q.text}</p>
            <p className="text-[10px] text-neutral-500 py-2.5 border-t border-white/[0.06] whitespace-nowrap">{(q.category || "General").split(" ")[0]}</p>
            <div className="py-2.5 border-t border-white/[0.06] flex justify-end gap-1.5">
              {q.status !== "APPROVED" && (
                <button
                  disabled={loadingId === q.id}
                  onClick={() => review(q.id, "APPROVE")}
                  className="text-[10px] font-bold text-black bg-lime-300 hover:brightness-110 rounded-md px-2 py-1 transition-all disabled:opacity-50 cursor-pointer"
                >
                  Approve
                </button>
              )}
              {q.status !== "REJECTED" && (
                <button
                  disabled={loadingId === q.id}
                  onClick={() => review(q.id, "REJECT")}
                  className="text-[10px] font-bold text-[#f2a488] bg-[#f2a488]/10 hover:bg-[#f2a488]/20 border border-[#f2a488]/30 rounded-md px-2 py-1 transition-all disabled:opacity-50 cursor-pointer"
                >
                  Reject
                </button>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
    </Panel>
  );
}

/* ── Template cards ──────────────────────────────── */
export interface TemplateCard {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  ready: boolean;
  qCount: number;
  raw: any;
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-[#0e0f13] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

const MINI_LABEL = "block text-[10px] font-bold text-neutral-500 uppercase tracking-[0.14em] mb-1.5";
const MINI_INPUT = "w-full px-3.5 py-2.5 text-xs bg-black/60 border border-white/10 rounded-xl outline-none font-medium text-white placeholder-neutral-600 focus:border-lime-300/50";

export function TemplateCards({ templates }: { templates: TemplateCard[] }) {
  const router = useRouter();
  const [launchFor, setLaunchFor] = useState<TemplateCard | null>(null);
  const [scheduleFor, setScheduleFor] = useState<TemplateCard | null>(null);
  const [editFor, setEditFor] = useState<TemplateCard | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editMsg, setEditMsg] = useState<string | null>(null);

  const duplicate = async (id: string) => {
    setBusyId(id);
    await duplicateTemplateAction(id);
    setBusyId(null);
    router.refresh();
  };
  const remove = async (id: string, title: string) => {
    if (!confirm(`Delete template "${title}"? This cannot be undone.`)) return;
    setBusyId(id);
    await deleteTemplateAction(id);
    setBusyId(null);
    router.refresh();
  };
  const saveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEditMsg(null);
    const fd = new FormData(e.currentTarget);
    const res = await updateTemplateAction(fd);
    if (res?.error) setEditMsg(res.error);
    else { setEditFor(null); router.refresh(); }
  };

  return (
    <Panel
      id="templates"
      title="Exam Templates"
      action={
        <Link href="/dashboard/owner/template/new" className="text-[11px] font-black text-black bg-lime-300 hover:brightness-110 rounded-lg px-3.5 py-2 transition-all">
          + New Template
        </Link>
      }
    >
      {templates.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm font-bold text-white">No templates yet</p>
          <p className="text-xs text-neutral-500 mt-1">Create your first assessment blueprint to get started.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex flex-col">
              <p className="text-[13px] font-bold text-white leading-snug">{t.title}</p>
              <p className="mt-1.5 flex items-center gap-2 text-[10px] font-medium text-neutral-500">
                <span className={`font-black tracking-wider ${t.ready ? "text-lime-200" : "text-neutral-500"}`}>
                  {t.ready ? "PUBLISHED" : "DRAFT"}
                </span>
                <span className="tabular-nums">{t.qCount} questions · {t.durationMinutes} min</span>
              </p>
              <p className="mt-2 text-[11px] text-neutral-400 leading-relaxed line-clamp-3 flex-1">
                {t.description || "No description provided for this template."}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.ready ? (
                  <button onClick={() => setLaunchFor(t)} className="text-[11px] font-bold text-black bg-lime-300 hover:brightness-110 rounded-lg px-3 py-1.5 transition-all">Launch</button>
                ) : (
                  <Link href="/dashboard/owner/template/new" className="text-[11px] font-bold text-black bg-lime-300 hover:brightness-110 rounded-lg px-3 py-1.5 transition-all">Continue Editing</Link>
                )}
                <button onClick={() => setScheduleFor(t)} className="text-[11px] font-bold text-neutral-200 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 transition-colors">Schedule</button>
                <button onClick={() => setEditFor(t)} className="text-[11px] font-bold text-neutral-200 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 transition-colors">Edit</button>
                <button disabled={busyId === t.id} onClick={() => duplicate(t.id)} className="text-[11px] font-bold text-neutral-200 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50">Duplicate</button>
                <button disabled={busyId === t.id} onClick={() => remove(t.id, t.title)} className="text-[11px] font-bold text-[#f2a488] bg-[#f2a488]/10 hover:bg-[#f2a488]/20 border border-[#f2a488]/25 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(launchFor || scheduleFor) && (
        <Modal onClose={() => { setLaunchFor(null); setScheduleFor(null); }}>
          <h3 className="text-base font-black text-white">{scheduleFor ? "Schedule" : "Launch"} · {(launchFor || scheduleFor)!.title}</h3>
          <p className="text-xs text-neutral-500 mt-1 mb-4">A PIN is generated for candidates to join.</p>
          <LaunchSessionForm templateId={(launchFor || scheduleFor)!.id} autoOpenSchedule={!!scheduleFor} />
        </Modal>
      )}

      {editFor && (
        <Modal onClose={() => { setEditFor(null); setEditMsg(null); }}>
          <h3 className="text-base font-black text-white">Edit Template</h3>
          <p className="text-xs text-neutral-500 mt-1 mb-4">{editFor.title}</p>
          {editMsg && <p className="text-xs font-bold text-rose-300 bg-rose-950/40 border border-rose-800/50 rounded-xl px-3 py-2 mb-3">{editMsg}</p>}
          <form onSubmit={saveEdit} className="space-y-3.5">
            <input type="hidden" name="id" value={editFor.id} />
            <div>
              <label className={MINI_LABEL}>Title</label>
              <input name="title" defaultValue={editFor.raw.title || ""} className={MINI_INPUT} />
            </div>
            <div>
              <label className={MINI_LABEL}>Subject</label>
              <input name="subject" defaultValue={editFor.raw.subject || ""} className={MINI_INPUT} />
            </div>
            <div>
              <label className={MINI_LABEL}>Description</label>
              <textarea name="description" rows={2} defaultValue={editFor.raw.description || ""} className={`${MINI_INPUT} resize-none`} />
            </div>
            <div>
              <label className={MINI_LABEL}>Candidate instructions</label>
              <textarea name="instructions" rows={2} defaultValue={editFor.raw.instructions || ""} className={`${MINI_INPUT} resize-none`} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={MINI_LABEL}>Duration (min)</label>
                <input name="durationMinutes" type="number" min="1" defaultValue={editFor.raw.durationMinutes ?? 60} className={MINI_INPUT} />
              </div>
              <div>
                <label className={MINI_LABEL}>Pass %</label>
                <input name="passCriteria" type="number" min="0" max="100" defaultValue={editFor.raw.passCriteria ?? 50} className={MINI_INPUT} />
              </div>
              <div>
                <label className={MINI_LABEL}>Max attempts</label>
                <input name="maxAttempts" type="number" min="1" defaultValue={editFor.raw.maxAttempts ?? 1} className={MINI_INPUT} />
              </div>
            </div>
            <div>
              <label className={MINI_LABEL}>Tab switch limit</label>
              <input name="tabSwitchLimit" type="number" min="1" defaultValue={editFor.raw.tabSwitchLimit ?? ""} placeholder="Blank for unlimited" className={MINI_INPUT} />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-300 cursor-pointer">
                <input type="checkbox" name="requireFullscreen" defaultChecked={!!editFor.raw.requireFullscreen} className="accent-[#bef264] w-4 h-4" /> Fullscreen
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-300 cursor-pointer">
                <input type="checkbox" name="disableCopyPaste" defaultChecked={!!editFor.raw.disableCopyPaste} className="accent-[#bef264] w-4 h-4" /> Block clipboard
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setEditFor(null)} className="text-xs font-bold text-neutral-300 hover:text-white px-4 py-2.5">Cancel</button>
              <button type="submit" className="text-xs font-black text-black bg-lime-300 hover:brightness-110 rounded-xl px-5 py-2.5">Save changes</button>
            </div>
          </form>
        </Modal>
      )}
    </Panel>
  );
}
