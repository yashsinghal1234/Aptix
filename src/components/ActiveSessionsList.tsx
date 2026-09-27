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
      <div className="py-12 px-6 text-center flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 mb-3 shadow-inner">
          <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h4 className="font-bold text-white text-sm">No Live Sessions Active</h4>
        <p className="text-xs text-neutral-400 mt-1 max-w-xs">
          No active or live exam sessions currently running across candidate clusters.
        </p>
        <Link
          href="/dashboard/owner/schedule"
          className="mt-4 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Schedule Live Exam</span>
        </Link>
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
            isLive ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]' : 'bg-[#0d0f14]/60 border-neutral-800 hover:border-neutral-700 hover:bg-[#12151d]'
          }`}>
            <div className="mb-3 sm:mb-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  isLive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                }`}>
                  {effectiveStatus} {session.status !== effectiveStatus ? "(Auto-Live)" : ""}
                </span>
                {session.pin && (
                  <span 
                    onClick={() => navigator.clipboard.writeText(session.pin)}
                    title="Click to copy PIN"
                    className="cursor-pointer text-[10px] font-mono font-extrabold bg-neutral-900 text-neutral-200 px-2 py-0.5 rounded-md border border-neutral-700 hover:border-neutral-500 transition-colors flex items-center gap-1"
                  >
                    <span>PIN: {session.pin}</span>
                    <svg className="w-3 h-3 opacity-70 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                  </span>
                )}
                {session.allowedEmailDomain && (
                  <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30">
                    @{session.allowedEmailDomain.replace(/^@/, '')}
                  </span>
                )}
                <span className="text-xs text-neutral-600 font-medium">|</span>
                <span className="text-xs text-neutral-400 font-bold">{session._count?.attempts || 0} Candidates</span>
              </div>
              <h3 className="font-bold text-white text-sm">{session.exam.title}</h3>
              {startTime && (
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Scheduled: {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({startTime.toLocaleDateString()})
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link 
                href={`/dashboard/owner/session/${session.id}`}
                className="flex-1 sm:flex-initial text-center text-xs px-3.5 py-2 bg-white border border-white text-black rounded-xl font-bold hover:bg-neutral-200 transition-all shadow-md"
              >
                Live Monitor
              </Link>
              {effectiveStatus === "SCHEDULED" && (
                <form action={async (formData) => {
                  await setSessionStatusAction(formData);
                }} className="flex-1 sm:flex-initial">
                  <input type="hidden" name="sessionId" value={session.id} />
                  <input type="hidden" name="status" value="LIVE" />
                  <button className="w-full text-xs px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-sm">
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
                  <button className="w-full text-xs px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 rounded-xl font-bold transition-all shadow-sm">
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
