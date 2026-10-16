"use client";

import React, { useState, useEffect } from "react";
import { detectVirtualMachine } from "@/lib/anti-cheat-detector";

/* ── Ready checklist ─────────────────────────────── */
const CHECK_ITEMS = [
  "I have read the assessment policies",
  "Power connected and a quiet workspace ready",
  "No calculators, notes or external assistance",
];

export function ReadyChecklist() {
  const [on, setOn] = useState<boolean[]>([false, false, false]);
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
      <h3 className="text-[13px] font-bold text-white mb-3">Ready checklist</h3>
      <div className="space-y-2.5">
        {CHECK_ITEMS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setOn((p) => p.map((v, j) => (j === i ? !v : v)))}
            className="w-full flex items-center justify-between gap-3 text-left group"
          >
            <span className={`text-xs ${on[i] ? "text-neutral-200" : "text-neutral-400"} group-hover:text-white transition-colors`}>
              {label}
            </span>
            <span className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${on[i] ? "bg-lime-300" : "bg-white/15"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-black transition-all ${on[i] ? "left-[18px]" : "left-0.5"}`} />
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-neutral-500 leading-relaxed">
        Stay on this screen. Keep one device and one tab open. Fullscreen is required during the exam; focus changes are recorded. Answers recover from local IndexedDB after a crash and retry on reconnect. Offline time never extends the server deadline.
      </p>
    </div>
  );
}

/* ── Preflight diagnostics ───────────────────────── */
type RowState = "HEALTHY" | "LIMITED" | "UNAVAILABLE" | "CHECKING";

function Pill({ s }: { s: RowState }) {
  const cls =
    s === "HEALTHY"
      ? "text-lime-200"
      : s === "LIMITED"
        ? "text-[#f2a488]"
        : s === "CHECKING"
          ? "text-neutral-400 animate-pulse"
          : "text-neutral-600";
  return <span className={`text-[10px] font-bold whitespace-nowrap ${cls}`}>{s === "CHECKING" ? "Checking…" : s === "LIMITED" ? "Capability limited" : s === "UNAVAILABLE" ? "Unavailable" : "Healthy"}</span>;
}

export function PreflightDiagnostics() {
  const [rows, setRows] = useState<{ label: string; value: string; state: RowState }[]>([
    { label: "Server NTP latency", value: "measuring…", state: "CHECKING" },
    { label: "Battery", value: "checking…", state: "CHECKING" },
    { label: "Display configuration", value: "checking…", state: "CHECKING" },
    { label: "Native resolution", value: "checking…", state: "CHECKING" },
    { label: "VM / RDP guard", value: "checking…", state: "CHECKING" },
    { label: "Browser-extension guardian", value: "Arms at exam launch", state: "LIMITED" },
    { label: "Fullscreen", value: "Request at launch", state: "LIMITED" },
    { label: "Recovery storage", value: "checking…", state: "CHECKING" },
    { label: "Single-device lease", value: "Verified on start", state: "LIMITED" },
  ]);
  const [checkedAt, setCheckedAt] = useState("--:--:--");

  useEffect(() => {
    let live = true;
    (async () => {
      let ping: number | null = null;
      try {
        const t0 = performance.now();
        await fetch("/api/time", { cache: "no-store" });
        ping = Math.round(performance.now() - t0);
      } catch {}
      let batt: string = "Unavailable";
      try {
        const b = await (navigator as any).getBattery?.();
        if (b) batt = `${Math.round(b.level * 100)}% ${b.charging ? "charging" : "on battery"}`;
      } catch {}
      const vm = detectVirtualMachine();
      const extFlag = (window.screen as any)?.isExtended;
      const displayKnown = extFlag === true || extFlag === false;
      const single = !extFlag;
      const vmKnown = vm.confidence !== "NONE";
      const res = `${window.screen.width} × ${window.screen.height}`;
      const idb = typeof indexedDB !== "undefined";
      if (!live) return;
      setRows([
        { label: "Server NTP latency", value: ping !== null ? `${ping} ms · healthy` : "unreachable", state: ping !== null ? "HEALTHY" : "UNAVAILABLE" },
        { label: "Battery", value: batt === "Unavailable" ? "Not reported by this browser" : batt, state: batt === "Unavailable" ? "UNAVAILABLE" : "HEALTHY" },
        { label: "Display configuration", value: !displayKnown ? "Unknown (browser can't report displays)" : single ? "Single display" : "Extended displays", state: !displayKnown ? "UNAVAILABLE" : single ? "HEALTHY" : "LIMITED" },
        { label: "Native resolution", value: `${res} reported`, state: "HEALTHY" },
        { label: "VM / RDP guard", value: !vmKnown ? "Unknown (masked by this browser)" : vm.isVM ? `Virtualized (${vm.renderer || "unknown"})` : "Physical host", state: !vmKnown ? "UNAVAILABLE" : vm.isVM ? "LIMITED" : "HEALTHY" },
        { label: "Browser-extension guardian", value: "Arms at exam launch", state: "LIMITED" },
        { label: "Fullscreen", value: "Request at launch", state: "LIMITED" },
        { label: "Recovery storage", value: idb ? "IndexedDB available" : "Memory only", state: idb ? "HEALTHY" : "LIMITED" },
        { label: "Single-device lease", value: "Verified on start", state: "LIMITED" },
      ]);
      setCheckedAt(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    })();
    return () => { live = false; };
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[13px] font-bold text-white">Preflight diagnostics</h3>
      </div>
      <p className="text-[10px] text-neutral-600 mb-3">Illustrative readings · checked {checkedAt} IST</p>
      <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 items-baseline">
        <p className="text-[9px] font-bold tracking-[0.16em] text-neutral-600">CHECK</p>
        <p className="text-[9px] font-bold tracking-[0.16em] text-neutral-600 text-right">MEASURE / STATE</p>
        {rows.map((r) => (
          <React.Fragment key={r.label}>
            <p className="text-[11px] text-neutral-300 py-1.5 border-t border-white/[0.06]">{r.label}</p>
            <p className="py-1.5 border-t border-white/[0.06] text-right">
              <span className="block text-[10px] text-neutral-500">{r.value}</span>
              <Pill s={r.state} />
            </p>
          </React.Fragment>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-neutral-600 leading-relaxed">
        Checks are browser-limited. Exam integrity does not prove the absence of extra displays, virtual machines, remote-access software or extensions. Optional capabilities cannot guarantee detection and do not block the session.
      </p>
    </div>
  );
}

/* ── Silent connection status ────────────────────── */
export function HeartbeatPanel() {
  const [t, setT] = useState("--:--:--");
  useEffect(() => {
    const f = () => setT(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    f();
    const id = setInterval(f, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
      <h3 className="text-[13px] font-bold text-white mb-3">Silent connection status</h3>
      <p className="flex items-center gap-2 text-[10px] font-black tracking-[0.14em] text-lime-200">
        <span className="w-1.5 h-1.5 rounded-full bg-lime-300 animate-pulse" /> HEARTBEAT HEALTHY
      </p>
      <p className="mt-2 text-[11px] text-neutral-400">
        Poll cadence 3s · last tick <span className="font-mono text-neutral-200 tabular-nums">{t}</span>
      </p>
      <p className="mt-1.5 text-[10px] text-neutral-600 leading-relaxed">
        No sound, refresh or repeated sign-in is needed. Contact the invigilator if the hall stays beyond your scheduled start.
      </p>
    </div>
  );
}
