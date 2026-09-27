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
    <div className="bg-[#0a0c10] rounded-3xl border border-neutral-800 shadow-md p-6 sm:p-8 mb-8">
      <div className="mb-4">
        <h3 className="font-bold text-white text-sm tracking-tight">Authorize Question Author</h3>
        <p className="text-xs text-neutral-400 mt-0.5">
          Grant authoring access with a temporary activation password. The author will be prompted to choose their own secret password upon first login.
        </p>
      </div>

      {createdCredentials && (
        <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-700/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-xs font-bold text-emerald-300">Author Account Created with Temporary Password</span>
            </div>
            <p className="text-xs text-emerald-200 font-medium">
              <span className="font-bold text-white">Email:</span> {createdCredentials.email} &bull; <span className="font-bold text-white">Temporary Password:</span> <span className="font-mono bg-neutral-900 border border-emerald-500/40 text-white px-2 py-0.5 rounded font-bold">{createdCredentials.password}</span>
            </p>
            <p className="text-[11px] text-emerald-400/80 mt-1 font-medium flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>The author will replace this with their own confidential password upon first login.</span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs font-bold px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors shrink-0 shadow-sm flex items-center gap-1.5 cursor-pointer"
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
          <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Full Name</label>
          <input 
            type="text" 
            name="name"
            required
            className="w-full px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 outline-none transition-all font-medium text-white placeholder-neutral-600"
            placeholder="e.g. Dr. Jane Smith"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Email Address</label>
          <input 
            type="email" 
            name="email"
            required
            className="w-full px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 outline-none transition-all font-medium text-white placeholder-neutral-600"
            placeholder="jane@university.edu"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">Initial Password</label>
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="text-[10px] font-bold text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="w-full px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 outline-none transition-all font-medium text-white font-mono placeholder-neutral-600"
              placeholder="e.g. Setter@2026 (or leave blank to auto-generate)"
            />
            <button 
              type="submit"
              disabled={loading}
              className="bg-white hover:bg-neutral-200 text-black px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md whitespace-nowrap disabled:opacity-50 cursor-pointer"
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
      className="text-xs font-bold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 px-3 py-1 rounded-lg transition-colors border border-rose-900/40 cursor-pointer"
    >
      Revoke
    </button>
  );
}
