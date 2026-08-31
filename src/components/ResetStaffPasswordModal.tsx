"use client";

import React, { useState } from "react";
import { adminResetUserPasswordAction } from "@/app/actions/owner";

export function ResetStaffPasswordModal({ userId, userName, userEmail }: { userId: string; userName: string; userEmail: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
        className="text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1 shrink-0"
      >
        <span>🔄 Reset Password</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Reset Staff Password</h3>
                <p className="text-xs text-slate-400 mt-0.5">{userName} ({userEmail})</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {result ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-emerald-900">Password Reset Successfully!</span>
                  </div>
                  <div className="text-xs text-emerald-800 space-y-1">
                    <p><span className="font-bold">Email:</span> {result.email}</p>
                    <p>
                      <span className="font-bold">Temporary Password:</span>{" "}
                      <span className="font-mono bg-emerald-100 px-2 py-0.5 rounded font-bold">{result.temporaryPassword}</span>
                    </p>
                  </div>
                  <p className="text-[11px] text-emerald-700/80 mt-2 font-medium">
                    🔒 The user will be required to choose their own confidential password upon next login.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {copied ? "✓ Copied to Clipboard!" : "📋 Copy Reset Details"}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Temporary Reset Password
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGenerate}
                      className="text-[10px] font-bold text-brand-600 hover:underline"
                    >
                      🎲 Auto-Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Leave empty to auto-generate"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none font-mono font-bold text-slate-800"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    An initial temporary password will be assigned. The user must replace it immediately upon sign-in.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {loading ? "Resetting..." : "Confirm Reset →"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
