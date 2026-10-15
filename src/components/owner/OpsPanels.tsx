import React from "react";
import { LiveSparkline } from "./LiveSparkline";

/* ── Shared bits ─────────────────────────────────── */

export function Panel({
  title,
  tag,
  action,
  children,
  className = "",
  id,
}: {
  title: string;
  tag?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`rounded-2xl border border-white/10 bg-[#0e0f13] p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-[15px] font-bold text-white tracking-tight">{title}</h2>
        {tag ? (
          <span className="text-[9px] font-bold tracking-[0.18em] text-neutral-500">{tag}</span>
        ) : null}
        {action}
      </div>
      {children}
    </section>
  );
}

export function Flower({ className = "w-20 h-20" }: { className?: string }) {
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      {petals.map((r) => (
        <ellipse key={r} cx="50" cy="28" rx="13" ry="24" fill="#bef264" transform={`rotate(${r} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="11" fill="#060607" />
    </svg>
  );
}

/* ── Hero ────────────────────────────────────────── */

export function OpsHero() {
  return (
    <div className="flex items-start justify-between gap-6 px-1 pt-1">
      <div>
        <p className="text-[10px] font-bold tracking-[0.22em] text-lime-200/80 mb-3">
          CONTROL PLANE · ADMINISTRATOR
        </p>
        <h1 className="text-3xl sm:text-[44px] font-black text-white tracking-tight leading-[1.02]">
          Big exams. Calm operations<span className="text-lime-300">.</span>
        </h1>
        <p className="text-[13px] text-neutral-400 mt-2.5">
          One view of every session, signal and candidate. You&rsquo;re in control.
        </p>
      </div>
      <Flower className="w-16 h-16 sm:w-24 sm:h-24 shrink-0 mt-1" />
    </div>
  );
}

/* ── Stat cards ──────────────────────────────────── */

export interface StatItem {
  label: string;
  value: string;
  sub: string;
  accent?: "lime" | "peach";
}

export function StatCards({ stats }: { stats: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl border border-white/10 bg-[#0e0f13] p-4">
          <p className="text-[11px] font-medium text-neutral-400">{s.label}</p>
          <p
            className={`mt-1.5 text-[28px] leading-none font-black tracking-tight tabular-nums ${
              s.accent === "lime" ? "text-lime-300" : s.accent === "peach" ? "text-[#f2a488]" : "text-white"
            }`}
          >
            {s.value}
          </p>
          <p className="mt-2 text-[10px] font-medium text-neutral-500">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Engine health ───────────────────────────────── */

export function EngineHealthPanel({ leases, clock }: { leases: number; clock: React.ReactNode }) {
  const rows: [string, string][] = [
    ["Answer sync · 3s cadence", "Healthy"],
    ["Question snapshot cache", "Ready"],
    ["Timer / deadline worker", "Healthy"],
  ];
  return (
    <Panel title="Engine health" tag="LIVE" action={clock} className="h-full">
      <span className="inline-block text-[9px] font-black tracking-[0.14em] text-lime-200 bg-lime-300/10 border border-lime-300/25 rounded-full px-2.5 py-1">
        ALL CORE SERVICES AVAILABLE
      </span>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-[30px] leading-none font-black text-white tabular-nums">{leases.toLocaleString()}</p>
        <p className="text-[10px] text-neutral-500 pb-1">active leases</p>
      </div>
      <LiveSparkline />
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-y-2.5 border-t border-white/[0.07] pt-3">
        <p className="text-[9px] font-bold tracking-[0.16em] text-neutral-600">SERVICE</p>
        <p className="text-[9px] font-bold tracking-[0.16em] text-neutral-600 text-right">STATE</p>
        {rows.map(([s, st]) => (
          <React.Fragment key={s}>
            <p className="text-xs text-neutral-300">{s}</p>
            <p className="text-xs font-semibold text-lime-200/90 text-right">{st}</p>
          </React.Fragment>
        ))}
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-neutral-600">
        Designed for 1,000+ concurrent candidates. This workspace shows illustrative telemetry.
      </p>
    </Panel>
  );
}

/* ── Integrity monitor ───────────────────────────── */

export interface FlagRow {
  type: string;
  count: number;
  cands?: number;
  share?: number;
}

export function IntegrityMonitor({
  cleanRate,
  cleanCount,
  total,
  rows,
  nearThreshold,
}: {
  cleanRate: string;
  cleanCount: number;
  total: number;
  rows: FlagRow[];
  nearThreshold: number;
}) {
  return (
    <Panel title="Integrity Monitor" tag="CLEAN RATE" className="h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-3.5 mb-5">
          <p className="text-[38px] leading-none font-black text-lime-400 tabular-nums">{cleanRate}%</p>
          <div className="leading-tight">
            <span className="block text-xs font-medium text-neutral-400">candidates clean</span>
            <span className="block text-xs font-semibold text-neutral-500 tabular-nums mt-0.5">
              {cleanCount.toLocaleString()} / {total.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_80px_70px] gap-x-2 pb-2.5 text-[9px] font-bold tracking-[0.16em] text-neutral-500 uppercase select-none">
          <span>EVENT TYPE</span>
          <span className="text-center">COUNT</span>
          <span className="text-right">CANDS.</span>
        </div>

        {rows.length === 0 ? (
          <p className="text-xs text-neutral-500 py-4 text-center">No integrity events recorded.</p>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {rows.map((r) => (
              <div
                key={r.type}
                className="grid grid-cols-[1fr_80px_70px] gap-x-2 py-3 items-center text-xs"
              >
                <span className="text-neutral-300 font-medium truncate">{r.type}</span>
                <span className="font-semibold text-[#f2a488] tabular-nums text-center">
                  {r.count}
                </span>
                <span className="font-medium text-neutral-300 tabular-nums text-right">
                  {r.cands ?? Math.max(1, Math.round(r.count * 0.7))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] border-l-2 border-l-[#f2a488] p-3.5 relative">
        <p className="text-xs font-bold text-[#f2a488]">
          {nearThreshold} candidates near policy threshold
        </p>
        <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
          Force submission triggers at 5 verified violations. Review evidence before action.
        </p>
      </div>
    </Panel>
  );
}

/* ── Agenda ──────────────────────────────────────── */

export interface AgendaItem {
  id: string;
  title: string;
  subject?: string | null;
  startLabel: string;
  readiness: string;
  ready: boolean;
}

export function AgendaPanel({ items }: { items: AgendaItem[] }) {
  return (
    <Panel title="Next on the agenda" className="h-full">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 items-center">
        <p className="text-[9px] font-bold tracking-[0.16em] text-neutral-600 pb-1">EXAM / SUBJECT</p>
        <p className="text-[9px] font-bold tracking-[0.16em] text-neutral-600 pb-1">TIMETABLE</p>
        <p className="text-[9px] font-bold tracking-[0.16em] text-neutral-600 pb-1 text-right">STATUS</p>
        {items.length === 0 && (
          <p className="col-span-3 text-xs text-neutral-500 py-4">Nothing scheduled. New sessions appear here.</p>
        )}
        {items.slice(0, 5).map((a) => (
          <React.Fragment key={a.id}>
            <div className="py-2.5 border-t border-white/[0.06] flex items-center gap-2 min-w-0 pr-2">
              {a.subject && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-lime-400/10 text-lime-300 border border-lime-400/20 shrink-0">
                  {a.subject}
                </span>
              )}
              <span className="text-xs font-semibold text-neutral-200 truncate">{a.title}</span>
            </div>
            <p className="text-xs text-neutral-300 py-2.5 border-t border-white/[0.06] whitespace-nowrap font-medium">{a.startLabel}</p>
            <p className={`text-xs font-semibold py-2.5 border-t border-white/[0.06] text-right whitespace-nowrap ${a.ready ? "text-lime-200/90" : "text-neutral-500"}`}>
              {a.readiness}
            </p>
          </React.Fragment>
        ))}
      </div>
    </Panel>
  );
}

/* ── Triage ──────────────────────────────────────── */

export function TriagePanel({ flagCount, topType }: { flagCount: number; topType: string }) {
  return (
    <Panel title="Attention, not alarm" tag="SECURITY TRIAGE" className="h-full">
      <div className="rounded-xl border border-[#f2a488]/25 bg-[#f2a488]/[0.05] p-3.5">
        <p className="text-xs font-bold text-[#f2a488]">
          {flagCount > 0 ? `${flagCount} candidates near policy threshold` : "All quiet on the integrity front"}
        </p>
        <p className="text-[11px] text-neutral-400 mt-1.5 leading-relaxed">
          {flagCount > 0
            ? `Repeated focus loss (${topType}). Review evidence before intervention; force submission triggers at 5 verified violations.`
            : "No repeated-loss patterns detected. Proctoring shield is nominal."}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <a href="/dashboard/owner/results" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/10 px-2 py-2.5 text-[11px] font-bold text-neutral-200 transition-colors">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
          Review flags
        </a>
        <a href="/dashboard/owner/template/new" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/10 px-2 py-2.5 text-[11px] font-bold text-neutral-200 transition-colors">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          Schedule exam
        </a>
        <a href="/dashboard/setter/bank" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/10 px-2 py-2.5 text-[11px] font-bold text-neutral-200 transition-colors">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          Import questions
        </a>
      </div>
      <p className="mt-3 text-[10px] text-neutral-600">Every extension, retake and forced end is written to the audit trail.</p>
    </Panel>
  );
}

/* ── Bank health ─────────────────────────────────── */

export interface BankRow {
  subject: string;
  approved: number;
  pending: number;
}

export function BankHealthPanel({
  total,
  approved,
  pending,
  rows,
}: {
  total: number;
  approved: number;
  pending: number;
  rows: BankRow[];
}) {
  return (
    <Panel
      title="Bank Health"
      action={
        <span className="text-[9px] font-black tracking-[0.14em] text-lime-200 bg-lime-300/10 border border-lime-300/25 rounded-full px-2.5 py-1 tabular-nums">
          {total.toLocaleString()} QUESTIONS
        </span>
      }
      className="h-full"
    >
      <div className="flex items-baseline gap-5">
        <p className="text-[26px] leading-none font-black text-lime-300 tabular-nums">
          {approved.toLocaleString()}
          <span className="block text-[10px] font-medium text-neutral-500 mt-1.5">Approved</span>
        </p>
        <p className="text-[26px] leading-none font-black text-[#f2a488] tabular-nums">
          {pending.toLocaleString()}
          <span className="block text-[10px] font-medium text-neutral-500 mt-1.5">Pending Review</span>
        </p>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 items-center">
        <p className="text-[9px] font-bold tracking-[0.16em] text-neutral-600 pb-1">SUBJECT</p>
        <p className="text-[9px] font-bold tracking-[0.16em] text-neutral-600 pb-1 text-right">APPROVED</p>
        <p className="text-[9px] font-bold tracking-[0.16em] text-neutral-600 pb-1 text-right">PENDING</p>
        {rows.map((r) => (
          <React.Fragment key={r.subject}>
            <p className="text-xs text-neutral-200 py-2.5 border-t border-white/[0.06] truncate pr-2">{r.subject}</p>
            <p className="text-xs font-semibold text-neutral-300 tabular-nums py-2.5 border-t border-white/[0.06] text-right">{r.approved.toLocaleString()}</p>
            <p className="text-xs tabular-nums py-2.5 border-t border-white/[0.06] text-right text-neutral-400">{r.pending.toLocaleString()}</p>
          </React.Fragment>
        ))}
      </div>
    </Panel>
  );
}
