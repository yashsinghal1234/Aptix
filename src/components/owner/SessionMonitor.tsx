"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  extendCandidateTimeAction,
  reopenCandidateAttemptAction,
  resetCandidateAttemptAction,
  toggleReleaseResultsAction,
  togglePodiumRevealAction,
  toggleGamifiedModeAction,
} from "@/app/actions/session";
import { useServerTime } from "@/hooks/useServerTime";

/* ── IST helpers ─────────────────────────────────── */
function istTime(d: Date | string) {
  return new Date(d).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: false });
}

/* ── Ticking "last refreshed" clock ──────────────── */
export function RefreshClock() {
  const [t, setT] = useState("--:--:--");
  useEffect(() => {
    const f = () => setT(istTime(new Date()));
    f();
    const id = setInterval(f, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">Last refreshed {t} IST</span>;
}

/* ── Server-calibrated countdown ─────────────────── */
export function SessionCountdown({
  startTime,
  durationMinutes,
  extendedUntil,
  status,
}: {
  startTime: string | null;
  durationMinutes: number;
  extendedUntil: string | null;
  status: string;
}) {
  const { getServerTime, synced } = useServerTime();
  const [left, setLeft] = useState<number | null>(null);
  const fired = React.useRef(false);

  useEffect(() => {
    if (status === "COMPLETED" || !startTime || !synced) {
      if (!startTime || !synced) setLeft(null);
      return;
    }
    const start = new Date(startTime).getTime();
    const end = extendedUntil ? new Date(extendedUntil).getTime() : start + durationMinutes * 60000;
    const tick = () => {
      const ms = end - getServerTime();
      if (ms > 0) setLeft(Math.floor(ms / 1000));
      else {
        setLeft(0);
        if (!fired.current) {
          fired.current = true;
          const form = document.getElementById("auto-end-session-form") as HTMLFormElement | null;
          if (form) form.requestSubmit();
        }
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTime, durationMinutes, extendedUntil, status, synced, getServerTime]);

  if (status === "COMPLETED") return <span className="text-neutral-500">Ended</span>;
  if (left === null) return <span className="text-neutral-500">Waiting</span>;
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const txt = h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return <span className={`tabular-nums ${left < 300 ? "text-[#f2a488] animate-pulse" : "text-white"}`}>{txt}</span>;
}

/* ── Types ───────────────────────────────────────── */
export interface MonitorAttempt {
  id: string;
  status: string;
  extendedUntil: string | null;
  createdAt: string;
  lastActivity: number;
  userId: string;
  userName: string;
  userEmail: string;
  emoji: string | null;
  gifUrl?: string | null;
  answered: number;
  earned: number;
  flags: number;
  flagDetails: { type: string; desc: string; time: string }[];
}

export interface MonitorFlag {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  userName: string;
}

const prettyType = (t: string) =>
  t.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/* ── Candidate table ─────────────────────────────── */
export function CandidateTable({
  attempts,
  totalQuestions,
  totalMarks,
  sessionId,
}: {
  attempts: MonitorAttempt[];
  totalQuestions: number;
  totalMarks: number;
  sessionId: string;
}) {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const PER = 8;
  const pages = Math.max(1, Math.ceil(attempts.length / PER));
  const shown = attempts.slice(page * PER, page * PER + PER);

  const call = async (key: string, fn: (fd: FormData) => Promise<any>, fields: Record<string, string>) => {
    setBusy(key);
    try {
      const fd = new FormData();
      Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
      await fn(fd);
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold text-white">Candidate table</h3>
        <span className="text-[10px] font-bold text-neutral-500 tabular-nums">
          {shown.length} OF {attempts.length}
        </span>
      </div>
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="grid grid-cols-[1.6fr_auto_auto_auto_auto_auto_auto] gap-x-4 gap-y-1 items-center min-w-[840px]">
          {(["NAME / EMAIL", "MASCOT", "STATUS", "PROGRESS", "CURRENT SCORE", "FLAGS", "INDIVIDUAL CONTROLS"] as const).map((h, i) => (
            <p key={h} className={`text-[9px] font-bold tracking-[0.16em] text-neutral-600 pb-2 ${i >= 2 ? "text-center" : ""} ${i === 6 ? "text-right" : ""}`}>
              {h}
            </p>
          ))}
          {shown.length === 0 && (
            <p className="col-span-7 text-xs text-neutral-500 py-6 text-center">No candidates have joined yet.</p>
          )}
          {shown.map((a) => {
            const open = expanded === a.id;
            const toggle = () => setExpanded((prev) => (prev === a.id ? null : a.id));
            return (
            <React.Fragment key={a.id}>
              <div onClick={toggle} className="py-3 border-t border-white/[0.06] pr-2 min-w-0 cursor-pointer group">
                <p className="text-xs font-bold text-white group-hover:text-lime-200 transition-colors truncate">
                  {a.userName}
                </p>
                <p className="text-[10px] text-neutral-500 truncate">{a.userEmail}</p>
              </div>
              <div onClick={toggle} className="py-3 border-t border-white/[0.06] cursor-pointer">
                <span className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-base overflow-hidden">
                  {a.gifUrl ? (
                    <img src={a.gifUrl} alt="" className="w-6 h-6 object-contain" />
                  ) : a.emoji && a.emoji !== "👤" ? (
                    a.emoji
                  ) : (
                    <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </span>
              </div>
              <div onClick={toggle} className="py-3 border-t border-white/[0.06] text-center cursor-pointer">
                {a.status === "SUBMITTED" ? (
                  <span className="text-[9px] font-black tracking-wider text-neutral-300 bg-white/[0.07] border border-white/10 rounded px-1.5 py-0.5 whitespace-nowrap">SUBMITTED</span>
                ) : a.status === "IN_PROGRESS" ? (
                  <span className="text-[10px] font-bold tracking-wider text-lime-300 whitespace-nowrap">IN PROGRESS</span>
                ) : (
                  <span className="text-[10px] font-bold tracking-wider text-neutral-500 whitespace-nowrap">NOT STARTED</span>
                )}
              </div>
              <p onClick={toggle} className="py-3 border-t border-white/[0.06] text-xs text-neutral-200 tabular-nums text-center whitespace-nowrap cursor-pointer">
                {a.answered} / {totalQuestions}
              </p>
              <p onClick={toggle} className="py-3 border-t border-white/[0.06] text-xs text-neutral-200 tabular-nums text-center whitespace-nowrap cursor-pointer">
                {a.status === "SUBMITTED" ? `${a.earned.toFixed(0)} / ${totalMarks}` : a.answered > 0 ? `${a.earned.toFixed(0)} / ${a.answered}` : "—"}
              </p>
              <p onClick={toggle} className="py-3 border-t border-white/[0.06] text-center cursor-pointer">
                {a.flags > 0 ? (
                  <span className="text-[11px] font-bold text-[#f2a488] whitespace-nowrap">{a.flags} flag{a.flags === 1 ? "" : "s"}</span>
                ) : (
                  <span className="text-[11px] text-neutral-500 whitespace-nowrap">0 flags</span>
                )}
              </p>
              <div className="py-3 border-t border-white/[0.06] flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                {a.status === "IN_PROGRESS" ? (
                  [5, 10, 15].map((m) => (
                    <button
                      key={m}
                      disabled={busy === `${a.id}-${m}`}
                      onClick={() => call(`${a.id}-${m}`, extendCandidateTimeAction, { attemptId: a.id, minutes: String(m) })}
                      className="text-[11px] font-bold text-black bg-white hover:bg-neutral-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      +{m}m
                    </button>
                  ))
                ) : a.status === "SUBMITTED" ? (
                  <>
                    <button
                      disabled={busy === `${a.id}-re`}
                      onClick={() => call(`${a.id}-re`, reopenCandidateAttemptAction, { attemptId: a.id, minutes: "10" })}
                      className="text-[11px] font-bold text-black bg-white hover:bg-neutral-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      Reopen (+10m)
                    </button>
                    <button
                      disabled={busy === `${a.id}-rt`}
                      onClick={() => call(`${a.id}-rt`, resetCandidateAttemptAction, { attemptId: a.id })}
                      className="text-[11px] font-bold text-neutral-500 hover:text-[#f2a488] transition-colors disabled:opacity-50 whitespace-nowrap px-1"
                    >
                      Reset Retake
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] font-medium text-neutral-600 px-2">Launch</span>
                )}
              </div>
              {open && (
                <div className="col-span-7 mb-2 rounded-xl border border-lime-300/20 bg-lime-300/[0.03] p-4">
                  <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[9px] font-bold tracking-[0.16em] text-neutral-500 mb-1.5">CANDIDATE</p>
                      <p className="text-xs font-bold text-white">{a.userName}</p>
                      <p className="text-[10px] text-neutral-500">{a.userEmail}</p>
                      <p className="text-[10px] text-neutral-500 mt-1">
                        Joined {new Date(a.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" })} IST
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold tracking-[0.16em] text-neutral-500 mb-1.5">PROGRESS & SCORE</p>
                      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full bg-lime-300" style={{ width: `${totalQuestions > 0 ? Math.round((a.answered / totalQuestions) * 100) : 0}%` }} />
                      </div>
                      <p className="text-[11px] text-neutral-300 mt-1.5 tabular-nums">
                        {a.answered}/{totalQuestions} answered · {a.status === "SUBMITTED" ? `${a.earned.toFixed(1)} / ${totalMarks}` : `${a.earned.toFixed(1)} live points`}
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">
                        {a.extendedUntil
                          ? `Extended until ${new Date(a.extendedUntil).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" })} IST`
                          : "No individual extension"}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[9px] font-bold tracking-[0.16em] text-neutral-500 mb-1.5">
                        INTEGRITY TIMELINE · {a.flagDetails.length}
                      </p>
                      {a.flagDetails.length === 0 ? (
                        <p className="text-[11px] text-neutral-500">Clean session — no flags recorded.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {a.flagDetails.map((f, i) => (
                            <p key={i} className="text-[11px] text-neutral-300">
                              <span className="font-mono text-neutral-500 tabular-nums">
                                {new Date(f.time).toLocaleTimeString("en-GB", { hour12: false, timeZone: "Asia/Kolkata" })}
                              </span>{" "}
                              <span className="font-bold text-[#f2a488]">{prettyType(f.type)}</span>
                              <span className="text-neutral-500"> · {f.desc}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/[0.07] flex justify-end">
                    <Link
                      href={`/dashboard/owner/results/${sessionId}/candidate/${a.id}`}
                      className="text-[11px] font-bold text-lime-200 hover:text-lime-100 transition-colors"
                    >
                      Open full scorecard →
                    </Link>
                  </div>
                </div>
              )}
            </React.Fragment>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-neutral-600">
        <span>Sorted by recent activity · Page {page + 1} of {pages}</span>
        <span className="flex gap-1.5">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-2.5 py-1 rounded-md border border-white/10 text-neutral-300 disabled:opacity-40 hover:bg-white/5">← Previous</button>
          <button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="px-2.5 py-1 rounded-md border border-white/10 text-neutral-300 disabled:opacity-40 hover:bg-white/5">Next →</button>
        </span>
      </div>
    </div>
  );
}

/* ── Integrity feed ──────────────────────────────── */
type FeedTab = "ALL" | "WINDOW" | "TAB";
export function IntegrityFeed({ flags }: { flags: MonitorFlag[] }) {
  const [tab, setTab] = useState<FeedTab>("ALL");
  const list = useMemo(() => {
    const ordered = flags.slice().sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
    if (tab === "WINDOW") return ordered.filter((f) => /WINDOW|BLUR|FULLSCREEN|EXIT/i.test(f.type));
    if (tab === "TAB") return ordered.filter((f) => /TAB|SWITCH/i.test(f.type));
    return ordered;
  }, [flags, tab]);

  const tabs: { k: FeedTab; label: string }[] = [
    { k: "ALL", label: "All events" },
    { k: "WINDOW", label: "Window exit" },
    { k: "TAB", label: "Tab switch" },
  ];

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold text-white">Chronological integrity feed</h3>
        <span className="text-[10px] font-bold text-neutral-500 tabular-nums">{list.length} OF {flags.length} SIGNALS</span>
      </div>
      <div className="flex gap-1.5 mb-3">
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`text-[10px] font-bold rounded-md px-2.5 py-1.5 border transition-colors ${
              tab === t.k ? "text-lime-200 border-lime-300/40 bg-lime-300/10" : "text-neutral-500 border-white/10 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="text-xs text-neutral-500 py-4">No signals in this category. All candidates are clean.</p>
      ) : (
        <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
          {list.map((f) => (
            <div key={f.id} className="grid grid-cols-[64px_130px_1fr] gap-3 items-baseline py-2 border-t border-white/[0.05]">
              <span className="text-[10px] font-mono text-neutral-500 tabular-nums">{istTime(f.timestamp)}</span>
              <span className="text-[11px] font-bold text-neutral-200 truncate">{f.userName}</span>
              <span className="text-[11px] text-neutral-400 truncate">
                <span className="text-neutral-500">{prettyType(f.type)} detected · </span>{f.description}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Result Release Control ───────────────────────── */
export function ResultReleaseControl({
  sessionId,
  initialReleased,
  initialPodiumRevealed,
  initialGamified,
  resultVisibility,
  submittedCount,
}: {
  sessionId: string;
  initialReleased: boolean;
  initialPodiumRevealed?: boolean;
  initialGamified?: boolean;
  resultVisibility: string;
  submittedCount: number;
}) {
  const router = useRouter();
  const [released, setReleased] = useState(initialReleased);
  const [podiumRevealed, setPodiumRevealed] = useState(Boolean(initialPodiumRevealed));
  const [gamified, setGamified] = useState(Boolean(initialGamified));
  const [busy, setBusy] = useState(false);
  const [podiumBusy, setPodiumBusy] = useState(false);
  const [gamifiedBusy, setGamifiedBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleToggle = async (nextState: boolean) => {
    setBusy(true);
    setStatusMsg(null);
    try {
      const fd = new FormData();
      fd.append("sessionId", sessionId);
      fd.append("released", String(nextState));
      const res = await toggleReleaseResultsAction(fd);
      if (res?.success) {
        setReleased(nextState);
        setStatusMsg({
          type: "success",
          text: nextState
            ? "Results released successfully! Submitted candidates can now view their scorecards."
            : "Results have been withheld from candidates.",
        });
        router.refresh();
      } else {
        setStatusMsg({ type: "error", text: res?.error || "Failed to update result release status." });
      }
    } catch (e: any) {
      setStatusMsg({ type: "error", text: e.message || "Failed to update release status." });
    } finally {
      setBusy(false);
    }
  };

  const handleTogglePodium = async (nextState: boolean) => {
    setPodiumBusy(true);
    setStatusMsg(null);
    try {
      const fd = new FormData();
      fd.append("sessionId", sessionId);
      fd.append("revealed", String(nextState));
      const res = await togglePodiumRevealAction(fd);
      if (res?.success) {
        setPodiumRevealed(nextState);
        setStatusMsg({
          type: "success",
          text: nextState
            ? "Cohort podium revealed! Candidates who have access to results can now see the animated podium snapshot."
            : "Cohort podium is now hidden from candidates.",
        });
        router.refresh();
      } else {
        setStatusMsg({ type: "error", text: res?.error || "Failed to update podium visibility." });
      }
    } catch (e: any) {
      setStatusMsg({ type: "error", text: e.message || "Failed to update podium visibility." });
    } finally {
      setPodiumBusy(false);
    }
  };

  const handleToggleGamified = async (nextState: boolean) => {
    setGamifiedBusy(true);
    setStatusMsg(null);
    try {
      const fd = new FormData();
      fd.append("sessionId", sessionId);
      fd.append("gamified", String(nextState));
      const res = await toggleGamifiedModeAction(fd);
      if (res?.success) {
        setGamified(nextState);
        setStatusMsg({
          type: "success",
          text: nextState
            ? "Gamified mode enabled! Candidates who enter will now choose their spirit mascot character before launching."
            : "Gamified mode disabled for this session.",
        });
        router.refresh();
      } else {
        setStatusMsg({ type: "error", text: res?.error || "Failed to update gamified mode." });
      }
    } catch (e: any) {
      setStatusMsg({ type: "error", text: e.message || "Failed to update gamified mode." });
    } finally {
      setGamifiedBusy(false);
    }
  };

  const isAfterRelease = resultVisibility === "AFTER_RELEASE";
  const isNever = resultVisibility === "NEVER";
  const resultsAccessible = resultVisibility === "IMMEDIATE" || released;

  return (
    <div className={`rounded-2xl border p-5 transition-all space-y-5 ${
      released
        ? "border-emerald-500/30 bg-emerald-950/[0.08]"
        : isAfterRelease
          ? "border-amber-400/25 bg-amber-500/[0.04]"
          : "border-white/10 bg-[#0e0f13]"
    }`}>
      {/* ── SECTION A: Result Release ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.18em] text-neutral-400 uppercase">
              CANDIDATE RESULT RELEASE
            </span>
            {released ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                RESULTS RELEASED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px] font-bold font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                WITHHELD (PENDING RELEASE)
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-300 font-medium leading-relaxed max-w-xl">
            {released
              ? "All submitted candidates can now immediately view their marks, performance scorecard, and answer keys."
              : isAfterRelease
                ? "This exam is configured for 'After Release'. Candidates who have submitted are currently seeing the submission confirmation screen and cannot see their score until you release results here."
                : isNever
                  ? "This exam is configured for 'Never' visibility. Releasing here will override and allow submitted candidates to view their results."
                  : "Exam is currently set to Immediate visibility upon candidate submission."}
          </p>
          <p className="text-[10px] text-neutral-500 font-mono">
            {submittedCount} candidate{submittedCount === 1 ? "" : "s"} submitted · Template policy: {resultVisibility}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {released ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => handleToggle(false)}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {busy ? "Updating..." : "Withhold / Hide Results"}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => handleToggle(true)}
              className="px-5 py-2.5 bg-lime-300 hover:bg-lime-200 text-black text-xs font-black rounded-xl shadow-lg shadow-lime-950/30 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{busy ? "Releasing..." : "Release Results to Candidates"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── SECTION B: Podium Reveal Control ── */}
      <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.18em] text-neutral-400 uppercase">
              COHORT PODIUM REVEAL
            </span>
            {podiumRevealed ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-400/10 border border-purple-400/30 text-purple-300 text-[10px] font-bold font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                PODIUM REVEALED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400 text-[10px] font-bold font-mono">
                PODIUM HIDDEN
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-300 font-medium leading-relaxed max-w-xl">
            {podiumRevealed
              ? "Candidates who have access to results can now see the animated top-3 podium snapshot with mascot character GIFs."
              : "The cohort podium snapshot is hidden on student screens. Candidates only see their own rank until you reveal the podium here."}
          </p>
          <p className="text-[10px] text-neutral-500 font-mono">
            Requires results visibility ({resultsAccessible ? "Currently accessible" : "Pending result release"})
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {podiumRevealed ? (
            <button
              type="button"
              disabled={podiumBusy}
              onClick={() => handleTogglePodium(false)}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {podiumBusy ? "Updating..." : "Withhold / Hide Podium"}
            </button>
          ) : (
            <button
              type="button"
              disabled={podiumBusy}
              onClick={() => handleTogglePodium(true)}
              className="px-5 py-2.5 bg-purple-500 hover:bg-purple-400 text-white text-xs font-black rounded-xl shadow-lg shadow-purple-950/30 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span>{podiumBusy ? "Revealing..." : "Reveal Podium to Candidates"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── SECTION C: Gamified Mode Control ── */}
      <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.18em] text-neutral-400 uppercase">
              GAMIFIED MODE (MASCOT SELECTION)
            </span>
            {gamified ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-300 text-[10px] font-bold font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                GAMIFIED MODE ACTIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400 text-[10px] font-bold font-mono">
                STANDARD (OFF)
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-300 font-medium leading-relaxed max-w-xl">
            {gamified
              ? "Candidates pick their spirit mascot character before launch, and see their mascot badge throughout the assessment and leaderboard."
              : "Standard mode is active. Candidates bypass the mascot chooser and enter straight into the exam."}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {gamified ? (
            <button
              type="button"
              disabled={gamifiedBusy}
              onClick={() => handleToggleGamified(false)}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {gamifiedBusy ? "Updating..." : "Disable Gamified Mode"}
            </button>
          ) : (
            <button
              type="button"
              disabled={gamifiedBusy}
              onClick={() => handleToggleGamified(true)}
              className="px-5 py-2.5 bg-lime-300 hover:bg-lime-200 text-black text-xs font-black rounded-xl shadow-lg shadow-lime-950/30 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2 whitespace-nowrap"
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 fill-current text-black" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h8l-1 8 11-13h-8l1-7z" />
                </svg>
                <span>{gamifiedBusy ? "Enabling..." : "Enable Gamified Mode"}</span>
              </span>
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div className={`mt-3 p-3 rounded-xl text-xs font-medium border ${
          statusMsg.type === "success"
            ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
            : "bg-rose-950/40 border-rose-500/30 text-rose-300"
        }`}>
          {statusMsg.text}
        </div>
      )}
    </div>
  );
}
