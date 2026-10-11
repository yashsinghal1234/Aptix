"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSetterAction, removeSetterAction, adminResetUserPasswordAction } from "@/app/actions/owner";
import { SubjectSelector } from "@/components/SubjectSelector";
import { Panel, Flower } from "./OpsPanels";

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
        <p className="text-[10px] font-bold tracking-[0.22em] text-lime-200/80 mb-3">STAFFING / 2026–27</p>
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
          <div className="flex items-center gap-3">
            {tag && <span className="text-[9px] font-bold tracking-[0.18em] text-neutral-500">{tag}</span>}
            <button type="button" onClick={onClose} aria-label="Close" className="text-neutral-500 hover:text-white text-xl leading-none px-1">×</button>
          </div>
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
  const [requireChange, setRequireChange] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; name: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = () => setPassword(`Setter@${Math.floor(1000 + Math.random() * 9000)}`);

  const copy = () => {
    if (!created) return;
    navigator.clipboard.writeText(
      `APTIX Staff Portal Activation:\nEmail: ${created.email}\nTemporary Password: ${created.password}\nPortal URL: ${window.location.origin}/admin/login\n(You will be prompted to choose your own private permanent password upon first sign-in.)`
    );
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
        <div className="mb-4 p-3.5 rounded-xl bg-lime-300/[0.07] border border-lime-300/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-lime-100">
            <span className="font-black">Author account created.</span>{" "}
            <span className="font-mono">{created.email}</span> · temp{" "}
            <span className="font-mono font-black">{created.password}</span>
          </p>
          <button type="button" onClick={copy} className="text-[11px] font-black text-black bg-lime-300 hover:brightness-110 rounded-lg px-3 py-1.5 shrink-0 cursor-pointer">
            {copied ? "✓ Copied!" : "Copy activation"}
          </button>
        </div>
      )}
      {error && <p className="mb-3 text-xs font-bold text-rose-300 bg-rose-950/40 border border-rose-800/50 rounded-xl px-3 py-2">{error}</p>}

      <form ref={formRef} action={submit} className="space-y-4 sm:space-y-5">
        {/* Row 1: Faculty name & Institutional email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
        </div>

        {/* Row 2: Temporary password + Auto-Generate Random */}
        <div>
          <label className="block text-xs font-normal text-neutral-400 mb-2">
            Temporary password · minimum 6 characters
          </label>
          <div className="flex items-center gap-3">
            <input
              name="password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              className="flex-1 px-4 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs sm:text-sm text-neutral-200 placeholder-neutral-600 focus:border-white/30 focus:outline-none transition-colors font-mono tracking-wider"
            />
            <button
              type="button"
              onClick={generate}
              className="px-4 py-2.5 bg-[#171917] hover:bg-[#202420] border border-white/10 text-neutral-300 hover:text-white rounded-xl text-xs font-medium transition-colors shrink-0 cursor-pointer"
            >
              Auto-Generate Random
            </button>
          </div>
        </div>

        {/* Row 3: Toggle */}
        <div className="flex items-center justify-between py-1">
          <span className="text-xs sm:text-[13px] font-normal text-neutral-300">
            Must change password on first login
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={requireChange}
            onClick={() => setRequireChange((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              requireChange ? "bg-[#bef264]" : "bg-neutral-800"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                requireChange ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Row 4: Green alert banner */}
        <div className="rounded-xl border border-white/5 border-l-2 border-l-[#bef264] bg-[#111411] p-4 sm:p-5">
          <h4 className="text-sm font-bold text-[#bef264] mb-1.5">Activate before authoring</h4>
          <p className="text-xs text-neutral-400 leading-relaxed">
            New staff receive a temporary password and the SETTER role. First login requires /admin/setup-password. A private password is Scrypt-encrypted and never accessible to the administrator.
          </p>
        </div>

        {/* Row 5: Action Button & Note */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-[#bef264] hover:bg-[#b0e650] text-black text-xs sm:text-sm font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-sm active:scale-95"
          >
            {loading ? "Adding..." : "Add Setter"}
          </button>
        </div>

        <input type="hidden" name="requireChange" value={requireChange ? "on" : "off"} />
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
        <div className="grid grid-cols-[1.4fr_1fr_auto_auto_auto_auto] gap-x-4 gap-y-1 items-center min-w-[760px]">
          {(["AUTHOR / EMAIL", "DEPARTMENT", "STATUS", "AUTHORED", "JOINED", "ACTIONS"] as const).map((h, i) => (
            <p key={h} className={`text-[9px] font-bold tracking-[0.16em] text-neutral-600 pb-2 ${i >= 1 ? "text-center" : ""} ${i === 5 ? "text-right" : ""}`}>{h}</p>
          ))}
          {setters.length === 0 && (
            <p className="col-span-6 text-xs text-neutral-500 py-6 text-center">No authors yet. Invite faculty with the panel above.</p>
          )}
          {setters.map((s) => (
            <React.Fragment key={s.id}>
              <div className="py-3 border-t border-white/[0.06] pr-2 min-w-0">
                <p className="text-xs font-bold text-white truncate">{s.name}</p>
                <p className="text-[10px] text-neutral-500 truncate">{s.email}</p>
              </div>
              <div className="py-3 border-t border-white/[0.06] text-center">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.08] text-neutral-200 border border-white/10">
                  {s.assignedSubject || "General / All"}
                </span>
              </div>
              <p className="py-3 border-t border-white/[0.06] text-center">
                {s.mustChangePassword ? (
                  <span className="text-[9px] font-black tracking-wider text-[#f2a488] whitespace-nowrap">Password Change Required</span>
                ) : (
                  <span className="text-[9px] font-black tracking-wider text-lime-200 whitespace-nowrap">Active</span>
                )}
              </p>
              <p className="py-3 border-t border-white/[0.06] text-xs font-bold text-white tabular-nums text-center">{s.authored}</p>
              <p className="py-3 border-t border-white/[0.06] text-[11px] text-neutral-400 tabular-nums text-center whitespace-nowrap">{s.joinedLabel}</p>
              <div className="py-3 border-t border-white/[0.06] flex justify-end gap-1.5">
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
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-neutral-600">
        <p>
          Deployed authors: <span className="text-neutral-300 font-bold tabular-nums">{setters.reduce((a, s) => a + s.authored, 0)}</span> questions ·{" "}
          {active} Active · {pending} Password Change Required are account states, not content approval states.
        </p>
        <a href="/dashboard/setter/bank" className="font-bold text-neutral-400 hover:text-lime-200 transition-colors whitespace-nowrap">
          Next: bulk import →
        </a>
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
  const [requireChange, setRequireChange] = useState(true);
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
    const res = await adminResetUserPasswordAction(target.id, password || undefined, requireChange);
    setLoading(false);
    if ((res as any).error) alert((res as any).error);
    else if (res.success && (res as any).temporaryPassword) {
      setResult({ email: target.email, temp: (res as any).temporaryPassword });
      router.refresh();
    }
  };

  return (
    <Modal title="Reset Staff Password" tag="STATIC RESET STATE" onClose={onClose}>
      <p className="text-[10px] text-neutral-500 mb-3 font-mono">Temporarily preset to: {email || "—"}</p>
      <label className={LABEL}>Staff email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mira.nair@northbridge.edu" className={INPUT} />
      <div className="flex items-center justify-between mt-3 mb-1.5">
        <label className={LABEL + " !mb-0"}>Temporary password</label>
        <button type="button" onClick={() => setPassword(`Reset@${Math.floor(1000 + Math.random() * 9000)}`)} className="text-[10px] font-bold text-neutral-400 hover:text-lime-200 transition-colors">
          ⟳ Auto-generate
        </button>
      </div>
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Reset@7392" className={`${INPUT} font-mono`} />
      {result && (
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(`APTIX Password Reset:\nEmail: ${result.email}\nTemporary Password: ${result.temp}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          }}
          className="mt-2.5 w-full text-[11px] font-bold text-lime-200 bg-lime-300/10 border border-lime-300/25 rounded-xl px-3 py-2"
        >
          {copied ? "✓ Copied!" : `New temp for ${result.email}: ${result.temp} — tap to copy`}
        </button>
      )}
      <div className="mt-3 border-t border-white/[0.07] pt-3">
        <Toggle on={requireChange} onChange={setRequireChange} label="Require password change on next login" hint="Minimum 6 characters. The previous password is replaced, never retrieved." />
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onClose} className="text-[11px] font-bold text-neutral-400 hover:text-white px-3 py-2">Cancel</button>
        <button
          type="button"
          disabled={loading || !setters.some((s) => s.email.toLowerCase() === email.trim().toLowerCase())}
          onClick={reset}
          className="flex-1 text-[11px] font-black text-black bg-lime-300 hover:brightness-110 rounded-xl px-3 py-2.5 transition-all disabled:opacity-40"
        >
          {loading ? "Resetting..." : "✓ Issue temporary password"}
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
    <Modal title="Remove Setter" tag="STATE CONFIRMATION" onClose={onClose}>
      <p className="text-[10px] text-neutral-500 mb-3 font-mono">Revoke {email || "—"}</p>
      <div className="rounded-xl bg-[#f2a488]/[0.06] border border-[#f2a488]/20 p-3 mb-3">
        <p className="text-[11px] font-bold text-[#f2a488]">Staff access will be revoked</p>
        <p className="text-[10px] text-neutral-400 mt-1 leading-relaxed">
          Removes this setter&rsquo;s account access. Existing authored questions and the question bank stay untouched. This is not a question-bank deletion.
        </p>
      </div>
      <label className={LABEL}>Staff email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@northbridge.edu" className={INPUT} />
      <label className={LABEL + " mt-3"}>Type REMOVE to confirm</label>
      <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="REMOVE" className={`${INPUT} font-mono uppercase`} />
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onClose} className="text-[11px] font-bold text-neutral-400 hover:text-white px-3 py-2">Cancel</button>
        <button
          type="button"
          disabled={!ready || loading}
          onClick={remove}
          className="flex-1 text-[11px] font-black text-white bg-[#e5484d] hover:brightness-110 rounded-xl px-3 py-2.5 transition-all disabled:opacity-40"
        >
          {loading ? "Removing..." : "⛔ Remove Setter"}
        </button>
      </div>
    </Modal>
  );
}
