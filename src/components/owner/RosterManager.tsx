"use client";

import { useRef, useState, useTransition } from "react";
import {
  uploadRosterAction,
  removeRosterEntryAction,
  clearRosterAction,
} from "@/app/actions/roster";

type Roster = { email: string; name: string | null };

export default function RosterManager({
  sessionId,
  initialRosters,
}: {
  sessionId: string;
  initialRosters: Roster[];
}) {
  const [rosters, setRosters] = useState<Roster[]>(initialRosters);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = (list: Roster[]) => setRosters([...list].sort((a, b) => a.email.localeCompare(b.email)));

  const onUpload = (fd: FormData) => {
    setMsg(null);
    startTransition(async () => {
      const res = await uploadRosterAction(sessionId, fd);
      if ("error" in res && res.error) {
        setMsg(res.error);
        return;
      }
      const ok = res as { added: number; skipped: number };
      setMsg(`Approved list updated: ${ok.added} emails${ok.skipped ? `, ${ok.skipped} lines skipped` : ""}. Only these emails can log in now.`);
      setText("");
      if (fileRef.current) fileRef.current.value = "";
      window.location.reload();
    });
  };

  const onRemove = (email: string) => {
    startTransition(async () => {
      await removeRosterEntryAction(sessionId, email);
      refresh(rosters.filter((r) => r.email !== email));
    });
  };

  const onClear = () => {
    if (!confirm("Remove the approved list? Session becomes open to any email (domain check still applies).")) return;
    startTransition(async () => {
      await clearRosterAction(sessionId);
      setRosters([]);
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-neutral-500">APPROVED CANDIDATES</p>
          <p className="mt-1 text-sm font-black text-white">
            {rosters.length === 0 ? "Open session - any email can join" : `${rosters.length} approved emails - locked`}
          </p>
          <p className="mt-1 text-[11px] text-neutral-500">
            Upload CSV of valid students. When list is non-empty, only these emails can log in with the PIN. No OTP emails at exam time.
          </p>
        </div>
        {rosters.length > 0 && (
          <button
            onClick={onClear}
            disabled={pending}
            className="px-4 py-2 text-[11px] font-bold rounded-xl border border-white/10 text-neutral-300 hover:bg-white/5 disabled:opacity-50"
          >
            Clear list (open session)
          </button>
        )}
      </div>

      <form
        action={onUpload}
        className="mt-4 space-y-3"
      >
        <input type="hidden" name="mode" value={mode} />
        <div className="flex gap-2 text-[11px] font-bold">
          {(["replace", "append"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-lg border ${mode === m ? "bg-lime-300 text-black border-lime-300" : "border-white/10 text-neutral-300"}`}
            >
              {m === "replace" ? "Replace list" : "Append"}
            </button>
          ))}
        </div>
        <input
          ref={fileRef}
          type="file"
          name="file"
          accept=".csv,.txt"
          className="block w-full text-[11px] text-neutral-400 file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-white file:text-black file:text-[11px] file:font-bold"
        />
        <textarea
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder={"Or paste lines:\nyash.2428c@example.edu\npriya@example.edu,Priya Sharma"}
          className="w-full rounded-xl bg-black/40 border border-white/10 p-3 text-xs text-white placeholder:text-neutral-600 font-mono"
        />
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2.5 bg-lime-300 hover:brightness-110 text-black text-xs font-black rounded-xl disabled:opacity-50"
        >
          {pending ? "Uploading..." : "Upload approved list"}
        </button>
      </form>

      {msg && <p className="mt-3 text-[11px] font-bold text-lime-200">{msg}</p>}

      {rosters.length > 0 && (
        <div className="mt-4 max-h-56 overflow-auto rounded-xl border border-white/10">
          {rosters.map((r) => (
            <div key={r.email} className="flex items-center justify-between px-3 py-2 border-b border-white/5 text-xs">
              <span className="font-mono text-neutral-200">{r.email}{r.name ? <span className="text-neutral-500"> · {r.name}</span> : null}</span>
              <button onClick={() => onRemove(r.email)} disabled={pending} className="text-[11px] font-bold text-red-300 hover:text-red-200 disabled:opacity-50">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
