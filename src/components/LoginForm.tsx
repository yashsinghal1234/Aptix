"use client";

import React, { useState } from "react";
import { candidateLoginAction } from "@/app/actions/auth";
import Link from "next/link";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [examPin, setExamPin] = useState("");

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    const res = await candidateLoginAction(formData);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    }
  };

  return (
    <main className="h-screen w-screen bg-slate-50/70 flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden font-sans select-none">
      {/* Subtle background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] bg-brand-200/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />

      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-soft-xl max-w-[400px] w-full border border-slate-100/90 relative z-10 my-auto">
        <div className="text-center mb-4 flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center p-2 shadow-soft mb-2">
            <img src="/aptix_logo.jpg" alt="Aptix Logo" className="h-full w-full object-contain" />
          </div>
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-100 mb-1">
            Assessment Portal
          </span>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Candidate Assessment Entry</h1>
          <p className="text-slate-500 text-[11px] font-medium">Enter your assigned Exam PIN and details to begin</p>
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold rounded-xl text-center leading-snug animate-in fade-in duration-200">
            ⚠️ {error}
          </div>
        )}
        
        <form action={handleSubmit} className="space-y-2.5">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                Exam Access PIN
              </label>
              <span className="text-[9px] font-semibold text-slate-400">Provided by instructor</span>
            </div>
            <input 
              type="text" 
              name="examPin"
              required
              value={examPin}
              onChange={(e) => setExamPin(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 text-slate-900 bg-slate-50/70 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-brand-600 outline-none transition-all text-sm font-mono font-bold tracking-wider placeholder-slate-400 uppercase"
              placeholder="e.g. APT-1001"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input 
              type="text" 
              name="name"
              required
              className="w-full px-3 py-2 text-slate-900 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none transition-all text-xs font-medium placeholder-slate-400"
              placeholder="e.g. Alex Johnson"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                Email Address
              </label>
              <span className="text-[9px] font-semibold text-brand-600">Institutional email</span>
            </div>
            <input 
              type="email" 
              name="email"
              required
              className="w-full px-3 py-2 text-slate-900 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none transition-all text-xs font-medium placeholder-slate-400"
              placeholder="e.g. yourname@kiet.edu"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-xl shadow-brand hover:shadow-lg transition-all text-xs tracking-wide mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Exam PIN...</span>
              </>
            ) : (
              <span>Start Assessment →</span>
            )}
          </button>
        </form>
        
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col gap-2 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Want to warm up?</span>
            <Link 
              href="/practice" 
              className="font-bold text-brand-600 hover:text-brand-800 hover:underline transition-colors flex items-center gap-1"
            >
              <span>🎯 Practice Arena</span>
            </Link>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-50">
            <span className="text-slate-400 font-medium">Are you an Examiner?</span>
            <Link 
              href="/admin/login" 
              className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
            >
              Staff Sign In →
            </Link>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100/60 flex items-center justify-center gap-2">
          <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">In Collaboration With</span>
          <img src="/kts-logo.png" alt="Kinesis Technical Society" className="h-5 object-contain opacity-70 hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </main>
  );
}
