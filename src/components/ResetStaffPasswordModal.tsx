"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { adminResetUserPasswordAction } from "@/app/actions/owner";

export function ResetStaffPasswordModal({ userId, userName, userEmail }: { userId: string; userName: string; userEmail: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [customPassword, setCustomPassword] = useState("");
  const [result, setResult] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleAutoGenerate = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    setCustomPassword(`Reset@${num}`);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await adminResetUserPasswordAction(userId, customPassword || undefined);
    setLoading(false);

    if (res.error) {
      alert(res.error);
    } else if (res.success && res.temporaryPassword && res.email) {
      setResult({
        email: res.email,
        temporaryPassword: res.temporaryPassword
      });
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const text = `Aptix Password Reset:\nEmail: ${result.email}\nTemporary Password: ${result.temporaryPassword}\nPortal URL: ${window.location.origin}/admin/login\n(You will be required to set your own secret password upon sign-in.)`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClose = () => {
    setIsOpen(false);
    setResult(null);
    setCustomPassword("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/40 px-2.5 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1 shrink-0 cursor-pointer"
      >
        <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Reset Password</span>
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#0a0c10] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-neutral-800 relative animate-in fade-in zoom-in-95 duration-150 text-neutral-100">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-800 mb-4">
              <div>
                <h3 className="font-bold text-white text-sm">Reset Staff Password</h3>
                <p className="text-xs text-neutral-400 mt-0.5">{userName} ({userEmail})</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-neutral-400 hover:text-white text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {result ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-950/40 border border-emerald-700/60 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    <span className="text-xs font-bold text-emerald-300">Password Reset Successfully!</span>
                  </div>
                  <div className="text-xs text-emerald-200 space-y-1">
                    <p><span className="font-bold text-white">Email:</span> {result.email}</p>
                    <p>
                      <span className="font-bold text-white">Temporary Password:</span>{" "}
                      <span className="font-mono bg-neutral-900 border border-emerald-500/40 px-2 py-0.5 rounded font-bold text-white">{result.temporaryPassword}</span>
                    </p>
                  </div>
                  <p className="text-[11px] text-emerald-400/80 mt-2 font-medium flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>The user will be required to choose their own confidential password upon next login.</span>
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {copied ? (
                      <span>✓ Copied to Clipboard!</span>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                        <span>Copy Reset Details</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                      Temporary Reset Password
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGenerate}
                      className="text-[10px] font-bold text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Auto-Generate</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Leave empty to auto-generate"
                    className="w-full px-3.5 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 outline-none font-mono font-bold text-white placeholder-neutral-600"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    An initial temporary password will be assigned. The user must replace it immediately upon sign-in.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-white hover:bg-neutral-200 text-black font-bold rounded-xl text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    {loading ? "Resetting..." : "Confirm Reset →"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
