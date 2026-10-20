"use client";

import React, { useState, useEffect } from "react";
import { submitExamInquiryAction } from "@/app/actions/inquiry";

interface HostExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminEmail?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
}

export function HostExamModal({
  isOpen,
  onClose,
  adminEmail = "singhalyash307@gmail.com",
  githubUrl = "https://github.com/yashsinghal1234",
  linkedinUrl = "https://www.linkedin.com/in/yash-singhal-94894b317/",
  twitterUrl = "https://x.com/singhalyash307",
}: HostExamModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form states whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setSubmitted(false);
      setError(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose();
    setSubmitted(false);
    setError(null);
    setMessage("");
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const mailtoHref = `mailto:${adminEmail}?subject=${encodeURIComponent(
    `Aptix Inquiry - ${name || "Platform Access"}`
  )}&body=${encodeURIComponent(
    `Name: ${name || "N/A"}\nEmail: ${email || "N/A"}\nInstitution: ${
      organization || "N/A"
    }\n\nMessage:\n${message || "Interested in conducting examinations on Aptix."}`
  )}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await submitExamInquiryAction({
      name,
      email,
      organization,
      message,
    });

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setSubmitted(true);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleClose}
    >
      {/* Sleek deep black card with no cross button */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#050608] text-neutral-100 rounded-[28px] border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.95)] max-w-lg w-full flex flex-col max-h-[92vh] overflow-hidden relative font-sans select-none"
      >
        {/* Subtle top glow line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime-300/40 to-transparent pointer-events-none" />

        {/* Header (No plaintext email id written here) */}
        <div className="px-6 sm:px-8 pt-7 pb-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-[10px] font-mono font-bold tracking-[0.16em] uppercase text-lime-300 bg-lime-300/10 border border-lime-300/20 px-2.5 py-0.5 rounded-full">
              CONTACT &amp; CONNECT
            </span>
          </div>

          <h2 id="contact-modal-title" className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-none">
            Get in touch<span className="text-lime-300">.</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
            Reach out directly for exam hosting, institutional access, or collaboration.
          </p>
        </div>

        {/* Social Media & Contact Channels Row */}
        <div className="px-6 sm:px-8 py-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* GitHub */}
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-neutral-300 hover:text-white transition-all group"
              title="GitHub Profile"
            >
              <svg className="w-4 h-4 shrink-0 text-neutral-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span className="text-xs font-semibold">GitHub</span>
            </a>

            {/* LinkedIn */}
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-neutral-300 hover:text-white transition-all group"
              title="LinkedIn Profile"
            >
              <svg className="w-4 h-4 shrink-0 text-[#0a66c2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.64 1.64 0 1 0 0-3.28 1.64 1.64 0 0 0 0 3.28m1.39 9.74v-8.37H5.07v8.37h2.78z" />
              </svg>
              <span className="text-xs font-semibold">LinkedIn</span>
            </a>

            {/* X (Twitter) */}
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-neutral-300 hover:text-white transition-all group"
              title="X Profile"
            >
              <svg className="w-4 h-4 shrink-0 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="text-xs font-semibold">X</span>
            </a>

            {/* Email */}
            <a
              href={`mailto:${adminEmail}`}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-neutral-300 hover:text-white transition-all group"
              title="Send Direct Email"
            >
              <svg className="w-4 h-4 shrink-0 text-lime-300 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-semibold">Email</span>
            </a>
          </div>
        </div>

        {/* Minimal Form */}
        <div className="px-6 sm:px-8 py-4 flex-1 overflow-y-auto">
          {submitted ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-300 flex items-center justify-center mx-auto text-xl font-bold">
                ✓
              </div>
              <h3 className="text-lg font-bold text-white">Message Dispatched</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
                Thank you! Your message has been sent. We will review your inquiry and get back to you shortly.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setMessage("");
                  }}
                  className="px-4 py-2 rounded-full border border-white/10 hover:bg-white/[0.05] text-neutral-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  Send Another
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2 rounded-full bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Row 1: Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Name <span className="text-lime-300">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 outline-none focus:border-white/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Email <span className="text-lime-300">*</span>
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 outline-none focus:border-white/30 transition-colors"
                  />
                </div>
              </div>

              {/* Row 2: Institution / Org */}
              <div>
                <label className="block text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Institution (optional)
                </label>
                <input
                  type="text"
                  placeholder="College or Organization"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 outline-none focus:border-white/30 transition-colors"
                />
              </div>

              {/* Row 3: Message */}
              <div>
                <label className="block text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Message
                </label>
                <textarea
                  rows={3}
                  placeholder="How can I help you?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 outline-none focus:border-white/30 transition-colors resize-none"
                />
              </div>

              {error && (
                <p className="text-[11px] font-semibold text-rose-300 bg-rose-950/40 border border-rose-500/40 rounded-xl p-2">
                  {error}
                </p>
              )}

              {/* Footer Actions (No cross button, clean Cancel & Send) */}
              <div className="pt-3 flex items-center justify-between border-t border-white/10">
                <span className="text-[11px] text-neutral-500">
                  Direct dispatch
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 rounded-full border border-white/10 hover:bg-white/[0.05] text-neutral-400 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        <span>Sending…</span>
                      </>
                    ) : (
                      <span>Send Message</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
