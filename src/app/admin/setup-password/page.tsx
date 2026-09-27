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
    <main className="h-screen w-screen bg-[#000000] flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden text-neutral-100 font-sans select-none">
      <div className="bg-[#0a0c10] p-6 sm:p-7 rounded-3xl shadow-2xl max-w-[420px] w-full border border-neutral-800 relative z-10 my-auto">
        <div className="text-center mb-5 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center p-1 shadow-md mb-3 border border-neutral-800 overflow-hidden">
            <video
              src="/aptix-logo-anim.mp4"
              poster="/logo-preview-frame.jpg"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover mix-blend-screen scale-125"
            />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30 mb-2">
            First-Time Security Activation
          </span>
          <h1 className="text-xl font-black tracking-tight text-white">Choose Your Secret Password</h1>
          <p className="text-neutral-400 mt-1 text-xs leading-relaxed">
            Create your own private permanent password to activate your account.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 animate-in fade-in duration-200">
            <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <span>{error}</span>
          </div>
        )}

        <form action={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
              New Private Password
            </label>
            <input 
              type="password" 
              name="newPassword"
              required
              minLength={6}
              autoComplete="new-password"
              autoFocus
              className="w-full px-3.5 py-2.5 text-white bg-neutral-900 border border-neutral-800 rounded-xl focus:bg-black focus:ring-1 focus:ring-neutral-700 outline-none transition-all text-xs font-medium placeholder-neutral-600"
              placeholder="Minimum 6 characters"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <input 
              type="password" 
              name="confirmPassword"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full px-3.5 py-2.5 text-white bg-neutral-900 border border-neutral-800 rounded-xl focus:bg-black focus:ring-1 focus:ring-neutral-700 outline-none transition-all text-xs font-medium placeholder-neutral-600"
              placeholder="Re-enter your password"
            />
          </div>

          <div className="bg-[#0d0f14] p-3 rounded-xl border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              <span>Confidential & Encrypted</span>
            </div>
            <p>Your password is scrypt-encrypted and never accessible to the administrator.</p>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-neutral-200 text-black font-bold py-2.5 rounded-xl shadow-md transition-all text-xs tracking-wide mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>Saving Password...</span>
              </>
            ) : (
              <span>Save & Continue to Dashboard →</span>
            )}
          </button>
        </form>

        <div className="mt-4 pt-3.5 border-t border-neutral-800 text-center">
          <form action={logoutAction}>
            <button 
              type="submit"
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Sign out and return later
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
