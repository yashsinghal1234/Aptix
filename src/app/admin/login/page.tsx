"use client";

import React, { useState } from "react";
import { staffLoginAction } from "@/app/actions/auth";
import Link from "next/link";

export default function StaffLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    const res = await staffLoginAction(formData);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    }
  };

  return (
    <main className="h-screen w-screen bg-[#070b14] flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden text-white font-sans select-none">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="bg-[#0e1526]/95 backdrop-blur-md p-5 sm:p-6 rounded-2xl shadow-2xl max-w-[400px] w-full border border-slate-800 relative z-10 my-auto">
        <div className="text-center mb-4 flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center p-2 shadow-md mb-2 border border-slate-700/60">
            <img src="/aptix_logo.jpg" alt="Aptix Logo" className="h-full w-full object-contain" />
          </div>
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-800/80 mb-1">
            Administrator & Staff Portal
          </span>
          <h1 className="text-lg font-black tracking-tight text-white">Staff Control Center</h1>
          <p className="text-slate-400 text-[11px]">Sign in with authorized staff credentials</p>
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-bold rounded-xl text-center animate-in fade-in duration-200">
            ⚠️ {error}
          </div>
        )}

        <form action={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              Staff Email Address
            </label>
            <input 
              type="email" 
              name="email"
              required
              autoComplete="email"
              className="w-full px-3 py-2 text-white bg-slate-900/80 border border-slate-700/80 rounded-xl focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-xs font-medium placeholder-slate-500"
              placeholder="e.g. admin@aptix.com"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                Staff Password
              </label>
            </div>
            <input 
              type="password" 
              name="password"
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 text-white bg-slate-900/80 border border-slate-700/80 rounded-xl focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-xs font-medium placeholder-slate-500"
              placeholder="••••••••••••"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-lg hover:shadow-indigo-600/30 transition-all text-xs tracking-wide mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to Dashboard →</span>
            )}
          </button>
        </form>

        <div className="mt-4 pt-3.5 border-t border-slate-800 text-center">
          <Link 
            href="/"
            className="text-[11px] font-semibold text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
          >
            <span>← Return to Candidate Exam Lobby</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
