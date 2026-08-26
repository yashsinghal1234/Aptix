"use client";

import React, { useState } from "react";
import { loginAction } from "@/app/actions/auth";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    const res = await loginAction(formData);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50/70 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />

      <div className="bg-white p-10 rounded-2xl shadow-soft-xl max-w-md w-full border border-slate-100/80 relative z-10">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center p-2.5 shadow-soft mb-4">
            <img src="/aptix_logo.jpg" alt="Aptix Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Aptix Assessment</h1>
          <p className="text-slate-500 mt-1.5 text-sm font-medium">Please enter your credentials to begin</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl text-center">
            {error}
          </div>
        )}
        
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name</label>
            <input 
              type="text" 
              name="name"
              required
              className="w-full px-4 py-3 text-slate-900 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none transition-all text-sm font-medium"
              placeholder="e.g. Alex Johnson"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
            <input 
              type="email" 
              name="email"
              required
              className="w-full px-4 py-3 text-slate-900 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none transition-all text-sm font-medium"
              placeholder="alex@example.com"
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl shadow-brand hover:shadow-lg transition-all text-sm tracking-wide mt-2 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Start Assessment →"}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center justify-center">
          <span className="text-[11px] text-slate-400 mb-2 uppercase tracking-widest font-bold">In Collaboration With</span>
          <img src="/kts-logo.png" alt="Kinesis Technical Society" className="h-9 object-contain opacity-75 hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </main>
  );
}
