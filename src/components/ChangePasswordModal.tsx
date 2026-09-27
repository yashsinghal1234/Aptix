"use client";

import { useState } from "react";
import { changePasswordAction } from "@/app/actions/owner";

export function ChangePasswordModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const formData = new FormData(e.currentTarget);
    const res = await changePasswordAction(formData);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else if (res.success) {
      setSuccessMsg(res.message || "Password updated successfully!");
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMsg(null);
      }, 1800);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          setError(null);
          setSuccessMsg(null);
        }}
        className="px-3 py-1.5 text-xs font-semibold text-neutral-300 bg-neutral-900 hover:bg-neutral-800 hover:text-white rounded-xl transition-all border border-neutral-800 flex items-center gap-1.5"
        title="Change your account password"
      >
        <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        <span>Change Password</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0a0c10] rounded-3xl border border-neutral-800 shadow-2xl max-w-sm w-full p-6 sm:p-7 relative text-neutral-100">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-neutral-800">
              <div>
                <h3 className="font-bold text-white text-base tracking-tight">Change Password</h3>
                <p className="text-xs text-neutral-400">Update your staff portal password</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800 flex items-center justify-center text-xs font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/50 text-rose-400 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-700/50 text-emerald-400 text-xs font-bold rounded-xl text-center">
                ✓ {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 outline-none transition-all font-medium text-white placeholder-neutral-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 outline-none transition-all font-medium text-white placeholder-neutral-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  minLength={6}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 outline-none transition-all font-medium text-white placeholder-neutral-600"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs font-bold transition-colors shadow-md disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Save Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
