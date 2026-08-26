"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { setSessionStatusAction } from "@/app/actions/session";

export function ActiveSessionsList({ initialSessions }: { initialSessions: any[] }) {
  const [now, setNow] = useState(new Date());

  // Update time every second to dynamically switch SCHEDULED to LIVE
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (initialSessions.length === 0) {
    return (
      <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        <p className="text-slate-400 text-xs font-semibold">No active or live exam sessions currently running.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {initialSessions.map(session => {
        let effectiveStatus = session.status;
        const startTime = session.startTime ? new Date(session.startTime) : null;
        
        if (session.status === "SCHEDULED" && startTime && startTime <= now) {
          effectiveStatus = "LIVE";
        }

        const isLive = effectiveStatus === "LIVE";

        return (
          <div key={session.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-2xl border transition-all ${
            isLive ? 'bg-emerald-50/30 border-emerald-200/80 shadow-soft-sm' : 'bg-white border-slate-200/80 shadow-soft-sm'
          }`}>
            <div className="mb-3 sm:mb-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  isLive ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-50 text-brand-700'
                }`}>
                  {effectiveStatus} {session.status !== effectiveStatus ? "(Auto-Live)" : ""}
                </span>
                <span className="text-xs text-slate-400 font-medium">|</span>
                <span className="text-xs text-slate-500 font-bold">{session._count?.attempts || 0} Candidates</span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm">{session.exam.title}</h3>
              {startTime && (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Scheduled: {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({startTime.toLocaleDateString()})
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link 
                href={`/dashboard/owner/session/${session.id}`}
                className="flex-1 sm:flex-initial text-center text-xs px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-soft-sm"
              >
                Live Monitor
              </Link>
              {effectiveStatus === "SCHEDULED" && (
                <form action={async (formData) => {
                  await setSessionStatusAction(formData);
                }} className="flex-1 sm:flex-initial">
                  <input type="hidden" name="sessionId" value={session.id} />
                  <input type="hidden" name="status" value="LIVE" />
                  <button className="w-full text-xs px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm">
                    Go Live
                  </button>
                </form>
              )}
              {effectiveStatus === "LIVE" && (
                <form action={async (formData) => {
                  await setSessionStatusAction(formData);
                }} className="flex-1 sm:flex-initial">
                  <input type="hidden" name="sessionId" value={session.id} />
                  <input type="hidden" name="status" value="COMPLETED" />
                  <button className="w-full text-xs px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all shadow-sm">
                    End Session
                  </button>
                </form>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
