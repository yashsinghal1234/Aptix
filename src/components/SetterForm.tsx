"use client";

import { createSetterAction, removeSetterAction } from "@/app/actions/owner";
import { useState, useRef } from "react";

export function SetterForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    name: string;
    password: string;
  } | null>(null);
  const [customPassword, setCustomPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGeneratePassword = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    setCustomPassword(`Setter@${num}`);
  };

  const handleCopy = () => {
    if (!createdCredentials) return;
    const text = `Aptix Staff Portal Activation:\nEmail: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.password}\nPortal URL: ${window.location.origin}/admin/login\n(You will be prompted to choose your own private permanent password upon first sign-in.)`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setCreatedCredentials(null);
    const res = await createSetterAction(formData);
    setLoading(false);
    if (res.error) {
      alert(res.error);
    } else if (res.success && res.email && res.password) {
      setCreatedCredentials({
        email: res.email,
        name: res.name || "",
        password: res.password
      });
      formRef.current?.reset();
      setCustomPassword("");
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft p-6 sm:p-8 mb-8">
      <div className="mb-4">
        <h3 className="font-bold text-slate-900 text-sm tracking-tight">Authorize Question Author</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Grant authoring access with a temporary activation password. The author will be prompted to choose their own secret password upon first login.
        </p>
      </div>

      {createdCredentials && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-emerald-900">Author Account Created with Temporary Password</span>
            </div>
            <p className="text-xs text-emerald-800 font-medium">
              <span className="font-bold">Email:</span> {createdCredentials.email} &bull; <span className="font-bold">Temporary Password:</span> <span className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded font-bold">{createdCredentials.password}</span>
            </p>
            <p className="text-[11px] text-emerald-700/80 mt-1 font-medium flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>The author will replace this with their own confidential password upon first login.</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs font-bold px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shrink-0 shadow-sm flex items-center gap-1.5"
          >
            {copied ? (
              <span>✓ Copied to Clipboard!</span>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
                <span>Copy Activation Details</span>
              </>
            )}
          </button>
        </div>
      )}

      <form
        ref={formRef}
        action={handleSubmit}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end"
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name</label>
          <input 
            type="text" 
            name="name"
            required
            className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-600 outline-none transition-all font-medium text-slate-900"
            placeholder="e.g. Dr. Jane Smith"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
          <input 
            type="email" 
            name="email"
            required
            className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-600 outline-none transition-all font-medium text-slate-900"
            placeholder="jane@university.edu"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Initial Password</label>
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Auto-Generate</span>
            </button>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              name="password"
              value={customPassword}
              onChange={(e) => setCustomPassword(e.target.value)}
              className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-600 outline-none transition-all font-medium text-slate-900 font-mono"
              placeholder="e.g. Setter@2026 (or leave blank to auto-generate)"
            />
            <button 
              type="submit"
              disabled={loading}
              className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-brand whitespace-nowrap disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Author →"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export function RemoveSetterButton({ id }: { id: string }) {
  return (
    <button
      onClick={async () => {
        if(confirm("Are you sure you want to revoke setter access?")) {
          await removeSetterAction(id);
        }
      }}
      className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-1 rounded-lg transition-colors border border-rose-100"
    >
      Revoke
    </button>
  );
}
