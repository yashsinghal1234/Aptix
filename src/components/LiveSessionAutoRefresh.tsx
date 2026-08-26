"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function LiveSessionAutoRefresh({ status }: { status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAutoSync, setIsAutoSync] = useState(true);

  useEffect(() => {
    if (status === "COMPLETED" || !isAutoSync) return;

    const interval = setInterval(() => {
      startTransition(() => {
        router.refresh();
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [status, isAutoSync, router]);

  if (status === "COMPLETED") {
    return (
      <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
        Session Finalized
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => {
          startTransition(() => {
            router.refresh();
          });
        }}
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-soft-sm cursor-pointer"
        title="Click to force refresh immediately"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>{isPending ? "Syncing..." : "LIVE FEED (Auto-updating 3s)"}</span>
      </button>

      <button
        onClick={() => setIsAutoSync(!isAutoSync)}
        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
      >
        {isAutoSync ? "Pause" : "Resume"}
      </button>
    </div>
  );
}
