"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PracticeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Practice Arena error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 selection:bg-white selection:text-black">
      <div className="bg-[#0a0c10] p-8 sm:p-10 rounded-3xl border border-neutral-800 shadow-2xl max-w-md w-full text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Practice Arena Notice</h2>
          <p className="text-sm text-neutral-400 mt-2 leading-relaxed font-normal">
            A temporary session interruption occurred. You can retry immediately to continue your practice.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full py-3.5 px-6 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-extrabold text-sm rounded-2xl transition-all shadow-md cursor-pointer"
          >
            Retry Practice Session
          </button>
          <Link
            href="/"
            className="w-full py-3 px-6 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white font-bold text-sm rounded-2xl transition-all border border-neutral-800 text-center cursor-pointer"
          >
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
