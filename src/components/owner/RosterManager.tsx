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
      setMsg(`Added ${ok.added} student${ok.added === 1 ? "" : "s"}${ok.skipped ? `, ${ok.skipped} skipped` : ""}. Only listed emails can log in now.`);
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
            {rosters.length > 0 ? `${rosters.length} approved emails - locked` : ""}
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

      <form action={onUpload} className="mt-4 flex items-center gap-2 flex-wrap">
        <input
          ref={fileRef}
          type="file"
          name="file"
          accept=".csv,.txt"
          className="text-[11px] text-neutral-400 file:mr-2 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-white file:text-black file:text-[11px] file:font-bold"
        />
        <input
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Or paste email, name"
          className="flex-1 min-w-[220px] rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-neutral-600 font-mono"
        />
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 bg-lime-300 hover:brightness-110 text-black text-xs font-black rounded-xl disabled:opacity-50 whitespace-nowrap"
        >
          {pending ? "Adding..." : "Add students"}
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
