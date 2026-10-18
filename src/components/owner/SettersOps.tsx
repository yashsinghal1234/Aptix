"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSetterAction, removeSetterAction, adminResetUserPasswordAction } from "@/app/actions/owner";
import { SubjectSelector } from "@/components/SubjectSelector";
import { Panel, Flower } from "./OpsPanels";
import { generateSecureTemporaryPassword } from "@/lib/password-generator";

export interface SetterRow {
  id: string;
  name: string;
  email: string;
  assignedSubject?: string | null;
  joinedLabel: string;
  mustChangePassword: boolean;
  authored: number;
}

/* ── Hero ────────────────────────────────────────── */
export function SettersHero() {
  return (
    <div className="flex items-start justify-between gap-6 px-1 pt-1">
      <div>
        <h1 className="text-3xl sm:text-[40px] font-black text-white tracking-tight leading-none">
          Good questions start here.
        </h1>
        <p className="text-[13px] text-neutral-400 mt-2.5">
          Invite faculty, reset temporary access and manage author status. Master permissions stay with the owner.
        </p>
      </div>
      <Flower className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 mt-1" />
    </div>
  );
}

/* ── Stat cards ──────────────────────────────────── */
export function SetterStats({ stats }: { stats: { label: string; value: string; sub: string }[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl border border-white/10 bg-[#0e0f13] p-4">
          <p className="text-[11px] font-medium text-neutral-400">{s.label}</p>
          <p className="mt-1.5 text-[26px] leading-none font-black tracking-tight text-white tabular-nums">{s.value}</p>
          <p className="mt-2 text-[10px] font-medium text-neutral-500">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Shared bits ─────────────────────────────────── */
const LABEL = "block text-[10px] font-bold text-neutral-500 uppercase tracking-[0.14em] mb-1.5";
const INPUT =
  "w-full px-3.5 py-2.5 text-xs bg-black/60 border border-white/10 rounded-xl outline-none font-medium text-white placeholder-neutral-600 focus:border-lime-300/50 transition-colors";

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold text-neutral-200">{label}</p>
        {hint && <p className="text-[10px] text-neutral-500 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`relative w-9 h-5 rounded-full shrink-0 transition-colors cursor-pointer ${on ? "bg-lime-300" : "bg-white/15"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-black transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function Modal({ title, tag, onClose, children }: { title: string; tag?: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-[#0e0f13] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-[15px] font-bold text-white">{title}</h3>
          {tag && <span className="text-[9px] font-bold tracking-[0.18em] text-neutral-500">{tag}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Add setter ──────────────────────────────────── */
export function AddSetterPanel() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; name: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = () => setPassword(generateSecureTemporaryPassword("Setter"));

  const copy = () => {
    if (!created) return;
    navigator.clipboard.writeText(created.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const submit = async (fd: FormData) => {
    setLoading(true);
    setError(null);
    setCreated(null);
    const res = await createSetterAction(fd);
    setLoading(false);
    if (res.error) setError(res.error);
    else if (res.success && res.email && res.password) {
      setCreated({ email: res.email, name: res.name || "", password: res.password });
      formRef.current?.reset();
      setPassword("");
      router.refresh();
    }
  };

  return (
    <Panel title="Add Setter">
      {created && (
        <div className="mb-4 px-3 py-2.5 rounded-xl bg-lime-300/[0.07] border border-lime-300/25 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5">
          <p className="text-sm font-black text-lime-200 tracking-tight">Account created.</p>
          <div className="inline-flex items-stretch rounded-full overflow-hidden shrink-0">
            <span className="font-mono text-xs font-medium text-neutral-200 bg-white/[0.05] border border-white/15 rounded-full px-3.5 py-1.5 whitespace-nowrap">
              {created.email}
            </span>
          </div>
          <div className="inline-flex items-center gap-2.5 rounded-full border border-lime-300/30 bg-black/40 pl-4 pr-1.5 py-1.5 shrink-0 sm:ml-auto">
            <span className="font-mono font-black text-white text-xs tracking-wider whitespace-nowrap">
              {created.password}
            </span>
            <button
              type="button"
              onClick={copy}
              className="text-[11px] font-black text-black bg-lime-300 hover:brightness-110 rounded-full px-3 py-1.5 shrink-0 cursor-pointer transition-all"
            >
              {copied ? "✓ Copied!" : "Copy password"}
            </button>
          </div>
        </div>
      )}
      {error && <p className="mb-3 text-xs font-bold text-rose-300 bg-rose-950/40 border border-rose-800/50 rounded-xl px-3 py-2">{error}</p>}

      <form ref={formRef} action={submit} className="space-y-4 sm:space-y-5">
        {/* Single line: Faculty name · Institutional email · Temporary password · Add Setter */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.25fr_1fr_auto] gap-3 sm:gap-4 md:items-end">
          <div>
            <label className="block text-xs font-normal text-neutral-400 mb-2">Faculty name</label>
            <input
              name="name"
              required
              placeholder="Dr. Kavya Shah"
              className="w-full px-4 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs sm:text-sm text-neutral-200 placeholder-neutral-600 focus:border-white/30 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-normal text-neutral-400 mb-2">Institutional email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="kavya.shah@northbridge.edu"
              className="w-full px-4 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs sm:text-sm text-neutral-200 placeholder-neutral-600 focus:border-white/30 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-normal text-neutral-400 mb-2">
              Temporary password
              <span className="text-neutral-600"> · 8+ chars</span>
            </label>
            <div className="relative">
              <input
                name="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full pr-10 px-4 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs sm:text-sm text-neutral-200 placeholder-neutral-600 focus:border-white/30 focus:outline-none transition-colors font-mono tracking-wider"
              />
              <button
                type="button"
                onClick={generate}
                title="Auto-generate random password"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-6 py-2.5 bg-[#bef264] hover:bg-[#b0e650] text-black text-xs sm:text-sm font-black rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-sm active:scale-[0.98] whitespace-nowrap"
          >
            {loading ? "Adding…" : "Add Setter"}
          </button>
        </div>

        <input type="hidden" name="requireChange" value="on" />
      </form>
    </Panel>
  );
}

/* ── Faculty directory ───────────────────────────── */
export function FacultyDirectory({ setters }: { setters: SetterRow[] }) {
  const [resetOpen, setResetOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState("");

  const active = setters.filter((s) => !s.mustChangePassword).length;
  const pending = setters.length - active;
  const dialogList = setters.map((s) => ({ id: s.id, email: s.email, name: s.name }));

  return (
    <Panel
      title="Faculty directory"
      action={
        <span className="text-[10px] text-neutral-500">
          Showing {setters.length} of {setters.length} authors
        </span>
      }
    >
      <ResetDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        setters={dialogList}
        initialEmail={selectedEmail}
      />
      <RemoveDialog
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        setters={dialogList}
        initialEmail={selectedEmail}
      />
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="pb-2.5 text-[9px] font-bold tracking-[0.16em] text-neutral-500 uppercase text-left">
                AUTHOR / EMAIL
              </th>
              <th className="pb-2.5 text-[9px] font-bold tracking-[0.16em] text-neutral-500 uppercase text-center w-[160px]">
                DEPARTMENT
              </th>
              <th className="pb-2.5 text-[9px] font-bold tracking-[0.16em] text-neutral-500 uppercase text-center w-[180px]">
                STATUS
              </th>
              <th className="pb-2.5 text-[9px] font-bold tracking-[0.16em] text-neutral-500 uppercase text-center w-[100px]">
                AUTHORED
              </th>
              <th className="pb-2.5 text-[9px] font-bold tracking-[0.16em] text-neutral-500 uppercase text-center w-[110px]">
                JOINED
              </th>
              <th className="pb-2.5 text-[9px] font-bold tracking-[0.16em] text-neutral-500 uppercase text-right w-[200px]">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {setters.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-xs text-neutral-500 py-8 text-center">
                  No authors yet. Invite faculty with the panel above.
                </td>
              </tr>
            ) : (
              setters.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="py-3 pr-4 align-middle">
                    <p className="text-xs font-bold text-white truncate">{s.name}</p>
                    <p className="text-[10px] text-neutral-500 truncate">{s.email}</p>
                  </td>
                  <td className="py-3 px-3 text-center align-middle">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.08] text-neutral-200 border border-white/10">
                      {s.assignedSubject || "General / All"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center align-middle">
                    {s.mustChangePassword ? (
                      <span className="text-[9px] font-black tracking-wider text-[#f2a488] whitespace-nowrap">Password Change Required</span>
                    ) : (
                      <span className="text-[9px] font-black tracking-wider text-lime-200 whitespace-nowrap">Active</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-xs font-bold text-white tabular-nums text-center align-middle">
                    {s.authored}
                  </td>
                  <td className="py-3 px-3 text-[11px] text-neutral-400 tabular-nums text-center whitespace-nowrap align-middle">
                    {s.joinedLabel}
                  </td>
                  <td className="py-3 pl-3 text-right align-middle">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEmail(s.email);
                          setResetOpen(true);
                        }}
                        className="text-[10px] font-bold text-neutral-200 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Reset password
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEmail(s.email);
                          setRemoveOpen(true);
                        }}
                        className="text-[10px] font-bold text-[#f2a488] bg-[#f2a488]/10 hover:bg-[#f2a488]/20 border border-[#f2a488]/25 rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Remove setter
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ── Reset + remove panels ───────────────────────── */
export function ResetDialog({
  open,
  onClose,
  setters,
  initialEmail,
}: {
  open: boolean;
  onClose: () => void;
  setters: { id: string; email: string; name: string }[];
  initialEmail?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ email: string; temp: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail || "");
      setPassword("");
      setResult(null);
      setCopied(false);
    }
  }, [open, initialEmail]);

  if (!open) return null;

  const reset = async () => {
    const target = setters.find((s) => s.email.toLowerCase() === email.trim().toLowerCase());
    if (!target) return;
    setLoading(true);
    const res = await adminResetUserPasswordAction(target.id, password || undefined, true);
    setLoading(false);
    if ((res as any).error) alert((res as any).error);
    else if (res.success && (res as any).temporaryPassword) {
      setResult({ email: target.email, temp: (res as any).temporaryPassword });
      router.refresh();
    }
  };

  return (
    <Modal title="Reset Staff Password" onClose={onClose}>
      <label className={LABEL}>Temporary password · min 8 characters</label>
      <div className="relative">
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••"
          className={`${INPUT} pr-10 font-mono tracking-wider`}
        />
        <button
          type="button"
          onClick={() => setPassword(generateSecureTemporaryPassword("Reset"))}
          title="Auto-generate random password"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      {result && (
        <div className="mt-3 inline-flex items-center gap-2.5 rounded-full border border-lime-300/30 bg-black/40 pl-4 pr-1.5 py-1.5 shrink-0 w-full">
          <span className="font-mono font-black text-white text-xs tracking-wider whitespace-nowrap overflow-hidden text-ellipsis">
            {result.temp}
          </span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(result.temp);
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            }}
            className="ml-auto text-[11px] font-black text-black bg-lime-300 hover:brightness-110 rounded-full px-3 py-1.5 shrink-0 cursor-pointer transition-all"
          >
            {copied ? "✓ Copied!" : "Copy password"}
          </button>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 text-[11px] font-bold text-neutral-300 border border-white/10 hover:bg-white/[0.06] hover:text-white rounded-xl px-3 py-2.5 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={loading || !setters.some((s) => s.email.toLowerCase() === email.trim().toLowerCase())}
          onClick={reset}
          className="flex-1 text-[11px] font-black text-black bg-lime-300 hover:brightness-110 rounded-xl px-3 py-2.5 transition-all disabled:opacity-40 cursor-pointer"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </div>
    </Modal>
  );
}

export function RemoveDialog({
  open,
  onClose,
  setters,
  initialEmail,
}: {
  open: boolean;
  onClose: () => void;
  setters: { id: string; email: string; name: string }[];
  initialEmail?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail || "");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail || "");
      setConfirm("");
    }
  }, [open, initialEmail]);

  if (!open) return null;

  const target = setters.find((s) => s.email.toLowerCase() === email.trim().toLowerCase());
  const ready = !!target && confirm.trim().toUpperCase() === "REMOVE";

  const remove = async () => {
    if (!ready || !target) return;
    setLoading(true);
    await removeSetterAction(target.id);
    setLoading(false);
    onClose();
    router.refresh();
  };

  return (
    <Modal title="Remove Setter" onClose={onClose}>
      <label className={LABEL}>Type REMOVE to confirm</label>
      <input
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="••••••"
        className="w-full px-6 py-3.5 bg-black/50 border border-white/10 rounded-2xl text-center text-white text-base font-mono tracking-[0.25em] uppercase focus:border-white/30 focus:outline-none transition-colors placeholder:tracking-[0.25em] placeholder:text-neutral-700 cursor-text"
      />
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 text-[11px] font-bold text-neutral-300 border border-white/10 hover:bg-white/[0.06] hover:text-white rounded-xl px-3 py-2.5 transition-colors cursor-pointer">
          Cancel
        </button>
        <button
          type="button"
          disabled={!ready || loading}
          onClick={remove}
          className="flex-1 text-[11px] font-black text-white bg-[#e5484d] hover:brightness-110 rounded-xl px-3 py-2.5 transition-all disabled:opacity-40 cursor-pointer"
        >
          {loading ? "Removing..." : "Remove Setter"}
        </button>
      </div>
    </Modal>
  );
}
