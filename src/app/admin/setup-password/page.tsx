"use client";

import React, { useState } from "react";
import { setupFirstTimePasswordAction, logoutAction } from "@/app/actions/auth";

export default function SetupPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    const res = await setupFirstTimePasswordAction(formData);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    }
  };

  return (
    <main className="h-screen w-screen bg-[#070b14] flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden text-white font-sans select-none">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="bg-[#0e1526]/95 backdrop-blur-md p-5 sm:p-6 rounded-2xl shadow-2xl max-w-[400px] w-full border border-slate-800 relative z-10 my-auto">
        <div className="text-center mb-3.5 flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-2 shadow-md mb-2 border border-slate-700/60">
            <img src="/kts-logo.png" alt="Logo" className="h-full w-full object-contain" />
          </div>
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/80 mb-1">
            First-Time Security Activation
          </span>
          <h1 className="text-lg font-black tracking-tight text-white">Choose Your Secret Password</h1>
          <p className="text-slate-400 mt-1 text-[11px] leading-relaxed">
            Create your own private permanent password to activate your account.
          </p>
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 animate-in fade-in duration-200">
            <svg className="w-3.5 h-3.5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <span>{error}</span>
          </div>
        )}

        <form action={handleSubmit} className="space-y-2.5">
          <div>
            <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              New Private Password
            </label>
            <input 
              type="password" 
              name="newPassword"
              required
              minLength={6}
              autoComplete="new-password"
              autoFocus
              className="w-full px-3 py-2 text-white bg-slate-900/80 border border-slate-700/80 rounded-xl focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-xs font-medium placeholder-slate-500"
              placeholder="Minimum 6 characters"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              Confirm New Password
            </label>
            <input 
              type="password" 
              name="confirmPassword"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full px-3 py-2 text-white bg-slate-900/80 border border-slate-700/80 rounded-xl focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-xs font-medium placeholder-slate-500"
              placeholder="Re-enter your password"
            />
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-[10px] text-slate-400 space-y-0.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              <span>Confidential & Encrypted</span>
            </div>
            <p>Your password is scrypt-encrypted and never accessible to the administrator.</p>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-lg hover:shadow-emerald-600/30 transition-all text-xs tracking-wide mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Password...</span>
              </>
            ) : (
              <span>Save & Continue to Dashboard →</span>
            )}
          </button>
        </form>

        <div className="mt-3.5 pt-3 border-t border-slate-800 text-center">
          <form action={logoutAction}>
            <button 
              type="submit"
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-300 transition-colors"
            >
              Sign out and return later
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
