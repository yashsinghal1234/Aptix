"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateTemplateAction } from "@/app/actions/template";
import { rescheduleSessionAction } from "@/app/actions/session";
import { LaunchSessionForm } from "@/components/LaunchSessionForm";

export interface StudioSession {
  id: string;
  pin: string | null;
  status: string;
  startLabel: string;
  attempts: number;
}

export interface TemplateItem {
  id: string;
  title: string;
  status: "LIVE" | "DRAFT" | "SCHEDULED";
  cohortCode: string;
  candidatesCount: number;
  durationMinutes: number;
  fixedCount: number;
  autoPickedCount: number;
  passScorePct: number;
  breakdown: string;
  timingStr: string;
  instructions: string;
  negativeMarking: string;
  pointsPerQ: number;
  domainLock: string;
  ownerName: string;
  createdLabel: string;
  categoryPills: Array<{ label: string; count: number }>;
  proctoring: {
    fullscreen: boolean;
    singleTab: boolean;
    focusLoss: boolean;
    forceSubmit: boolean;
  };
  latestSessionId: string | null;
  latestStartISO: string;
  sessions: StudioSession[];
}

interface TemplateStudioViewProps {
  initialTemplates: TemplateItem[];
}

export default function TemplateStudioView({ initialTemplates }: TemplateStudioViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [templates, setTemplates] = useState<TemplateItem[]>(initialTemplates);
  const [selectedId, setSelectedId] = useState<string>(initialTemplates[0]?.id || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "LIVE" | "DRAFT" | "SCHEDULED">("ALL");
  const [activeTab, setActiveTab] = useState<"specification" | "pool" | "history">("specification");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // Success / error message
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const selectedTemplate = templates.find((t) => t.id === selectedId) || null;

  // Local editing state for the active template
  const [editForm, setEditForm] = useState<TemplateItem | null>(selectedTemplate);
  const [reschedAt, setReschedAt] = useState("");
  const [reschedMsg, setReschedMsg] = useState<string | null>(null);
  const [launchOpen, setLaunchOpen] = useState<"launch" | "schedule" | null>(null);

  // When selection changes, update editForm
  React.useEffect(() => {
    setEditForm(selectedTemplate);
    setSaveSuccessMsg(null);
    setReschedMsg(null);
    setReschedAt("");
    setLaunchOpen(null);
  }, [selectedId]);

  // Filtering
  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.cohortCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.breakdown.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleReschedule = async () => {
    if (!editForm?.latestSessionId || !reschedAt) return;
    setReschedMsg(null);
    const fd = new FormData();
    fd.append("sessionId", editForm.latestSessionId);
    fd.append("startTime", new Date(reschedAt).toISOString());
    fd.append("timezoneOffset", new Date().getTimezoneOffset().toString());
    startTransition(async () => {
      const res = await rescheduleSessionAction(fd);
      if (res?.success) {
        setReschedMsg("Session rescheduled.");
        router.refresh();
      } else {
        setReschedMsg(res?.error || "Failed to reschedule session.");
      }
    });
  };

  if (templates.length === 0) {
    return (
      <div className="space-y-6 pb-12 font-sans selection:bg-lime-400 selection:text-black">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-lime-400 font-bold uppercase mb-1">
            BLUEPRINTS / VERSIONED & REUSABLE
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Set the standard<span className="text-lime-400">.</span>
          </h1>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            Define the rules once. Deliver a consistent assessment every time.
          </p>
        </div>
        <div className="p-12 text-center border border-white/10 rounded-2xl bg-[#0c0d12]">
          <p className="text-sm font-bold text-white">No blueprints yet</p>
          <p className="text-xs text-neutral-500 mt-1 mb-5">Create your first assessment template to get started.</p>
          <Link
            href="/dashboard/owner/template/new"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs shadow-lg transition-all cursor-pointer"
          >
            <span className="text-base leading-none font-black">+</span>
            <span>Create Template Studio</span>
          </Link>
        </div>
      </div>
    );
  }
  const handleSaveSpecification = async () => {
    if (!editForm) return;
    setSaveSuccessMsg(null);

    const fd = new FormData();
    fd.append("id", editForm.id);
    fd.append("title", editForm.title);
    fd.append("instructions", editForm.instructions);
    fd.append("durationMinutes", String(editForm.durationMinutes));
    fd.append("passCriteria", String(editForm.passScorePct));
    fd.append("allowedEmailDomain", editForm.domainLock.replace(/@|·\s*required/g, "").trim());
    fd.append("negativeMarkingEnabled", editForm.negativeMarking !== "0" ? "true" : "false");
    fd.append("negativeMarksValue", editForm.negativeMarking.replace(/[^0-9.]/g, "") || "0.5");
    fd.append("requireFullscreen", editForm.proctoring.fullscreen ? "true" : "false");
    fd.append("tabSwitchLimit", editForm.proctoring.forceSubmit ? "5" : "10");

    startTransition(async () => {
      const res = await updateTemplateAction(fd);
      if (res?.success) {
        setSaveSuccessMsg("Specification saved successfully.");
        // Update local template state
        setTemplates((prev) =>
          prev.map((item) => (item.id === editForm.id ? { ...editForm } : item))
        );
        router.refresh();
      } else {
        setSaveSuccessMsg(res?.error || "Failed to update specification.");
      }
    });
  };

  return (
    <div className="space-y-6 pb-12 font-sans selection:bg-lime-400 selection:text-black">
      {/* ── Top Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-lime-400 font-bold uppercase mb-1">
            BLUEPRINTS / VERSIONED & REUSABLE
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Set the standard<span className="text-lime-400">.</span>
          </h1>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            Define the rules once. Deliver a consistent assessment every time.
          </p>
        </div>

        <Link
          href="/dashboard/owner/template/new"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs shadow-lg transition-all self-start sm:self-auto cursor-pointer"
        >
          <span className="text-base leading-none font-black">+</span>
          <span>Create Template Studio</span>
        </Link>
      </div>

      {/* ── Search & Filter Controls ──────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-xl">
          <svg
            className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or cohort"
            className="w-full bg-[#0c0d12] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-white/20 transition-colors"
          />
        </div>

        {/* Status Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            className="bg-[#0c0d12] border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 text-xs text-neutral-300 hover:text-white font-medium flex items-center gap-2 cursor-pointer transition-colors"
          >
            <span>{statusFilter === "ALL" ? "All statuses" : statusFilter}</span>
            <span className="text-[10px] text-neutral-400">▾</span>
          </button>

          {statusDropdownOpen && (
            <div className="absolute right-0 mt-1 w-36 bg-[#0c0d12] border border-white/10 rounded-xl py-1 shadow-2xl z-30 font-mono text-xs">
              {(["ALL", "LIVE", "DRAFT", "SCHEDULED"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st);
                    setStatusDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-1.5 hover:bg-white/5 transition-colors ${
                    statusFilter === st ? "text-lime-300 font-bold" : "text-neutral-300"
                  }`}
                >
                  {st === "ALL" ? "All statuses" : st}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Two-Column Layout ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Template Cards List (span 6 or 7) */}
        <div className="lg:col-span-6 xl:col-span-6 space-y-3.5">
          {filteredTemplates.length === 0 ? (
            <div className="p-12 text-center border border-white/10 rounded-2xl bg-[#0c0d12] text-neutral-500 text-xs">
              No templates match your search criteria.
            </div>
          ) : (
            filteredTemplates.map((item) => {
              const isSelected = item.id === selectedId;

              let badgeBg = "bg-white/5 border border-white/10 text-neutral-400";
              let badgeText: string = item.status;
              if (item.status === "LIVE") {
                badgeBg = "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300";
              } else if (item.status === "DRAFT") {
                badgeBg = isSelected
                  ? "bg-lime-400/10 border border-lime-400/40 text-lime-300"
                  : "bg-white/5 border border-white/10 text-neutral-400";
                badgeText = isSelected ? "SELECTED · DRAFT" : "DRAFT";
              } else if (item.status === "SCHEDULED") {
                badgeBg = "bg-white/5 border border-white/10 text-neutral-400";
              }

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`rounded-2xl p-5 space-y-2 cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[#0c0d12] border-2 border-lime-400 shadow-[0_0_20px_rgba(163,230,53,0.15)]"
                      : "bg-[#0c0d12] border border-white/10 hover:border-white/20"
                  }`}
                >
                  {/* Card Title & Badge */}
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-bold text-white tracking-tight leading-snug">{item.title}</h3>
                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full shrink-0 uppercase tracking-wider ${badgeBg}`}
                    >
                      {badgeText}
                    </span>
                  </div>

                  {/* Cohort line */}
                  <p className="text-xs text-neutral-400 font-mono">
                    {item.cohortCode} · {item.candidatesCount} candidates
                  </p>

                  {/* Spec line */}
                  <div className="flex items-center justify-between text-xs font-mono text-neutral-300 pt-1">
                    <span>
                      {item.durationMinutes} min · {item.fixedCount} fixed + {item.autoPickedCount} auto-picked
                    </span>
                    <span className="text-neutral-400">Pass: {item.passScorePct}% net score</span>
                  </div>

                  {/* Breakdown Topics */}
                  <p className="text-xs text-neutral-400 font-mono truncate">{item.breakdown}</p>

                  {/* Timing line */}
                  <div className="pt-1 flex items-center justify-between text-xs font-mono text-neutral-400">
                    <span className="flex items-center gap-1 hover:text-white transition-colors">
                      {item.timingStr} <span className="text-[10px]">↗</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* Footer note below cards */}
          <p className="text-[11px] text-neutral-500 font-mono pt-2">
            {filteredTemplates.length} of {templates.length} templates shown · Scheduled drafts are checked for pool sufficiency.
          </p>
        </div>

        {/* RIGHT COLUMN: Editing Drawer / Panel (span 6 or 6) */}
        {editForm ? (
          <div className="lg:col-span-6 xl:col-span-6 bg-[#0c0d12] border border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl relative sticky top-6">
            {/* Drawer Top Header Badge & Close */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-300">
                {editForm.status === "LIVE" ? "LIVE SPECIFICATION" : editForm.status === "SCHEDULED" ? "SCHEDULED DRAFT" : "EDITING DRAFT"}
              </span>
              <button
                type="button"
                onClick={() => setSelectedId("")}
                aria-label="Close panel"
                className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Title & Owner line */}
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">{editForm.title}</h2>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">
                Owner: {editForm.ownerName} · {editForm.createdLabel}
              </p>
            </div>

            {/* Tabs Bar */}
            <div className="flex items-center gap-6 border-b border-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("specification")}
                className={`pb-2 transition-colors cursor-pointer ${
                  activeTab === "specification" ? "text-white border-b-2 border-lime-400" : "text-neutral-400 hover:text-white"
                }`}
              >
                Specification
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pool")}
                className={`pb-2 transition-colors cursor-pointer ${
                  activeTab === "pool" ? "text-white border-b-2 border-lime-400" : "text-neutral-400 hover:text-white"
                }`}
              >
                Question pool
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`pb-2 transition-colors cursor-pointer ${
                  activeTab === "history" ? "text-white border-b-2 border-lime-400" : "text-neutral-400 hover:text-white"
                }`}
              >
                History
              </button>
            </div>

            {/* Success message banner if saved */}
            {saveSuccessMsg && (
              <div className="p-3 rounded-xl bg-lime-400/10 border border-lime-400/30 text-lime-300 text-xs font-mono">
                ✓ {saveSuccessMsg}
              </div>
            )}

            {/* TAB CONTENT: Specification */}
            {activeTab === "specification" && (
              <div className="space-y-4">
                {/* Field 1: Instructions */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-400">Instructions · inline edit</label>
                  <textarea
                    rows={3}
                    value={editForm.instructions}
                    onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-neutral-200 outline-none focus:border-white/20 leading-relaxed font-sans resize-none"
                  />
                </div>

                {/* 2 Columns: Duration & Negative Marking */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-neutral-400">Duration</label>
                    <input
                      type="text"
                      value={`${editForm.durationMinutes} minutes`}
                      onChange={(e) => {
                        const val = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10) || 60;
                        setEditForm({ ...editForm, durationMinutes: val });
                      }}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-white/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-neutral-400">Negative marking</label>
                    <input
                      type="text"
                      value={editForm.negativeMarking}
                      onChange={(e) => setEditForm({ ...editForm, negativeMarking: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-white/20"
                    />
                  </div>
                </div>

                {/* 2 Columns: Passing Score & Points */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-neutral-400">Passing score</label>
                    <input
                      type="text"
                      value={`${editForm.passScorePct}% net score`}
                      onChange={(e) => {
                        const val = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10) || 50;
                        setEditForm({ ...editForm, passScorePct: val });
                      }}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-white/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-neutral-400">Points</label>
                    <input
                      type="text"
                      value={`${editForm.pointsPerQ} per question`}
                      onChange={(e) => {
                        const val = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10) || 2;
                        setEditForm({ ...editForm, pointsPerQ: val });
                      }}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-white/20"
                    />
                  </div>
                </div>

                {/* Institutional domain lock */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-neutral-400">Institutional domain lock</label>
                  <input
                    type="text"
                    value={editForm.domainLock}
                    onChange={(e) => setEditForm({ ...editForm, domainLock: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-white/20"
                  />
                </div>

                {/* Question pool & auto-pick rules */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <h4 className="text-xs font-bold text-white">Question pool & auto-pick rules</h4>
                  <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                    12 fixed questions + 28 seeded picks from 186 approved items. Easy 30% · Medium 50% · Hard 20%.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {editForm.categoryPills.map((p, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-neutral-300"
                      >
                        {p.label.toUpperCase()} {p.count}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Proctoring settings */}
                <div className="space-y-2.5 pt-2 border-t border-white/10">
                  <h4 className="text-xs font-bold text-white">Proctoring settings</h4>
                  <div className="grid grid-cols-2 gap-2.5 text-xs text-neutral-300">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editForm.proctoring.fullscreen}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            proctoring: { ...editForm.proctoring, fullscreen: e.target.checked },
                          })
                        }
                        className="rounded border-white/20 bg-black/60 text-lime-400 focus:ring-0 w-3.5 h-3.5 accent-lime-400"
                      />
                      <span>Fullscreen required</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editForm.proctoring.singleTab}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            proctoring: { ...editForm.proctoring, singleTab: e.target.checked },
                          })
                        }
                        className="rounded border-white/20 bg-black/60 text-lime-400 focus:ring-0 w-3.5 h-3.5 accent-lime-400"
                      />
                      <span>Single-tab / device lease</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editForm.proctoring.focusLoss}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            proctoring: { ...editForm.proctoring, focusLoss: e.target.checked },
                          })
                        }
                        className="rounded border-white/20 bg-black/60 text-lime-400 focus:ring-0 w-3.5 h-3.5 accent-lime-400"
                      />
                      <span>Focus-loss audit</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editForm.proctoring.forceSubmit}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            proctoring: { ...editForm.proctoring, forceSubmit: e.target.checked },
                          })
                        }
                        className="rounded border-white/20 bg-black/60 text-lime-400 focus:ring-0 w-3.5 h-3.5 accent-lime-400"
                      />
                      <span>Force-submit at 5 verified events</span>
                    </label>
                  </div>
                  <p className="text-[10px] text-neutral-500 font-mono">
                    Optional hardware / display checks: when supported.
                  </p>
                </div>

                {/* Reschedule draft session */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <h4 className="text-xs font-bold text-white">Reschedule session</h4>
                  {!editForm.latestSessionId ? (
                    <p className="text-[11px] text-neutral-500">
                      No active session on this blueprint. Launch or schedule below to open one.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="datetime-local"
                          value={reschedAt}
                          onChange={(e) => setReschedAt(e.target.value)}
                          style={{ colorScheme: "dark" }}
                          className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none focus:border-white/20"
                        />
                        <button
                          type="button"
                          disabled={isPending || !reschedAt}
                          onClick={handleReschedule}
                          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                        >
                          Reschedule
                        </button>
                      </div>
                      {reschedMsg && (
                        <p className="text-[11px] font-semibold text-neutral-300">{reschedMsg}</p>
                      )}
                    </>
                  )}
                </div>

                {/* Alert Box: Snapshots protect live exams */}
                <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3.5 flex items-start gap-3">
                  <div className="text-lime-400 shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Snapshots protect live exams</h5>
                    <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                      LIVE and COMPLETED specifications are immutable. Duplicate a blueprint to change questions; draft
                      edits apply only before scheduling.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleSaveSpecification}
                    className="flex-1 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs shadow-lg transition-all text-center cursor-pointer disabled:opacity-50"
                  >
                    {isPending ? "Saving..." : "Save specification"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setLaunchOpen("launch")}
                    className="px-4 py-2.5 rounded-xl bg-lime-300 hover:brightness-110 text-black font-extrabold text-xs transition-all cursor-pointer"
                  >
                    Launch
                  </button>
                  <button
                    type="button"
                    onClick={() => setLaunchOpen("schedule")}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Schedule</span>
                  </button>
                </div>
              </div>
            )}

      {/* Launch / Schedule modal */}
      {launchOpen && editForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setLaunchOpen(null)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-[#0e0f13] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-black text-white">
                {launchOpen === "schedule" ? "Schedule" : "Launch"} · {editForm.title}
              </h3>
              <button type="button" onClick={() => setLaunchOpen(null)} aria-label="Close" className="text-neutral-500 hover:text-white text-xl leading-none px-1">×</button>
            </div>
            <p className="text-xs text-neutral-500 mb-4">A PIN is generated for candidates to join.</p>
            <LaunchSessionForm templateId={editForm.id} autoOpenSchedule={launchOpen === "schedule"} />
          </div>
        </div>
      )}

            {/* TAB CONTENT: Question pool */}
            {activeTab === "pool" && (
              <div className="space-y-3 py-2 text-xs font-mono text-neutral-300">
                <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-1">
                  <p className="text-white font-bold">Configured Item Rules</p>
                  <p className="text-neutral-400 text-[11px]">
                    {editForm.fixedCount} fixed questions + {editForm.autoPickedCount} auto-picked across {editForm.categoryPills.length} categor{editForm.categoryPills.length === 1 ? "y" : "ies"}.
                  </p>
                </div>
                {editForm.categoryPills.length === 0 && (
                  <p className="text-[11px] text-neutral-500">No fixed questions bound yet.</p>
                )}
                {editForm.categoryPills.map((cp, idx) => (
                  <div key={idx} className="flex justify-between p-2.5 bg-white/[0.01] border border-white/5 rounded-lg">
                    <span>{cp.label}</span>
                    <span className="text-lime-300 font-bold">{cp.count} items</span>
                  </div>
                ))}
              </div>
            )}

            {/* TAB CONTENT: History */}
            {activeTab === "history" && (
              <div className="space-y-3 py-2 text-xs font-mono text-neutral-400">
                {editForm.sessions.length === 0 && (
                  <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl">
                    <p className="text-white font-bold">No sessions yet</p>
                    <p className="text-[11px] mt-0.5">Launch or schedule this blueprint to open its first session.</p>
                  </div>
                )}
                {editForm.sessions.map((s) => (
                  <div key={s.id} className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-1">
                    <div className="flex justify-between text-white font-bold">
                      <span className="font-mono">{s.pin || s.id.slice(-6).toUpperCase()}</span>
                      <span className={`text-[11px] ${s.status === "LIVE" ? "text-lime-300" : "text-neutral-500"}`}>{s.status}</span>
                    </div>
                    <p className="text-[11px]">{s.startLabel} · {s.attempts} attempt{s.attempts === 1 ? "" : "s"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

    </div>
  );
}
