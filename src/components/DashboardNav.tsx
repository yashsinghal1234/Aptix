"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";

interface DashboardNavProps {
  isOwner: boolean;
  userName?: string;
  children: React.ReactNode;
}

const ownerItems = [
  {
    label: "Dashboard", href: "/dashboard/owner", exact: true, hash: "",
    icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>),
  },
  {
    label: "Schedule Exam", href: "/dashboard/owner/templates", exact: false, hash: "",
    section: ["/dashboard/owner/templates", "/dashboard/owner/template/", "/dashboard/owner/schedule"],
    icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>),
  },
  {
    label: "Live Monitoring", href: "/dashboard/owner", exact: false, hash: "#live",
    icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" /></svg>),
  },
  {
    label: "History & Analytics", href: "/dashboard/owner/results", exact: false, hash: "",
    icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>),
  },
  {
    label: "Question authoring", href: "/dashboard/setter", exact: true, hash: "",
    icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>),
  },
  {
    label: "Question Bank", href: "/dashboard/setter/bank", exact: false, hash: "",
    icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>),
  },
  {
    label: "Candidate Records", href: "/dashboard/owner/candidates", exact: false, hash: "",
    icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>),
  },
  {
    label: "Manage Setters", href: "/dashboard/owner/setters", exact: false, hash: "",
    icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>),
  },
];

const governanceItems = [
  { label: "Members & roles", href: "/dashboard/owner/setters" },
  { label: "Security & audit", href: "/dashboard/owner/results" },
  { label: "Institution settings", href: "/dashboard/owner/setters" },
];

const setterItems = [
  {
    label: "Question authoring", href: "/dashboard/setter", exact: true, hash: "",
    icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>),
  },
  {
    label: "Question Bank", href: "/dashboard/setter/bank", exact: false, hash: "",
    icon: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>),
  },
];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "AD";
}

export function DashboardNav({ isOwner, userName = "Administrator", children }: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [hash, setHash] = useState("");

  const navItems = isOwner ? ownerItems : setterItems;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    setHash(window.location.hash);
  }, [pathname]);

  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    navItems.forEach((item) => {
      try { router.prefetch(item.href); } catch {}
    });
  }, [router, navItems]);

  const isActive = (href: string, exact?: boolean, h?: string, section?: string[]) => {
    if (h) return pathname === href && hash === h;
    if (section && section.some((p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : p + "/"))) return true;
    if (exact) return pathname === href && (hash === "" || (hash !== "#live" && hash !== "#templates"));
    return pathname === href || pathname.startsWith(href + "/");
  };

  const displayName = userName || "Administrator";

  return (
    <div className="min-h-screen bg-[#060607] text-neutral-100 flex flex-col font-sans selection:bg-lime-300 selection:text-black" suppressHydrationWarning>
      {/* ── Topbar ─────────────────────────────────── */}
      <header className="h-16 shrink-0 border-b border-white/10 bg-[#060607] px-4 sm:px-6 flex items-center gap-3 sticky top-0 z-40">
        <Link href={isOwner ? "/dashboard/owner" : "/dashboard/setter"} className="flex items-center gap-3 shrink-0 group">
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center overflow-hidden shrink-0 rounded-lg bg-black/40 ring-1 ring-white/10 group-hover:ring-lime-400/30 transition-all">
            <video
              src="/aptix-logo-anim.mp4"
              autoPlay
              loop
              muted
              playsInline
              poster="/logo-preview-frame.jpg"
              className="w-full h-full object-cover mix-blend-screen scale-125 pointer-events-none"
            />
          </div>
          <span className="font-black text-[22px] sm:text-[23px] tracking-tight text-white leading-none group-hover:text-lime-300 transition-colors uppercase">
            APTIX
          </span>
          <span className="hidden sm:block w-px h-5.5 bg-white/15" />
          <span className="hidden sm:block text-xs font-medium text-neutral-400">Assessment Platform</span>
        </Link>

        {isOwner && (
          <div className="hidden md:flex items-center gap-2.5 absolute left-1/2 -translate-x-1/2">
            <span className="text-sm font-bold text-neutral-100 bg-white/[0.07] border border-white/15 rounded-full px-5 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
              KIET Deemed to be University.
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2.5">
          <button
            className="hidden sm:flex w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Notifications"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </button>

          {/* ── Combined User Profile & Actions Dropdown ── */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full sm:rounded-xl border transition-all select-none text-left cursor-pointer ${
                userMenuOpen
                  ? "bg-white/[0.08] border-white/25 shadow-lg shadow-black/50"
                  : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-white/20"
              }`}
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
              aria-label="Account options menu"
            >
              <span className="w-7 h-7 rounded-full bg-lime-300 text-black text-[11px] font-black flex items-center justify-center shrink-0 shadow-xs">
                {initials(displayName)}
              </span>
              <span className="hidden sm:block leading-tight pr-1">
                <span className="block text-xs font-bold text-white tracking-tight leading-none mb-0.5">
                  {displayName}
                </span>
                <span className="block text-[10px] text-neutral-400 font-medium leading-none">
                  {isOwner ? "Administrator" : "Setter"}
                </span>
              </span>
              <svg
                className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                  userMenuOpen ? "rotate-180 text-white" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[#0b0d13] border border-white/15 shadow-2xl shadow-black/90 p-1.5 z-50 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2.5 border-b border-white/[0.08] mb-1">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-lime-300 text-black text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                      {initials(displayName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{displayName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                        <span className="text-[10px] font-semibold text-lime-300 uppercase tracking-wider">
                          {isOwner ? "Administrator" : "Setter"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setPasswordModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-200 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors text-left cursor-pointer group"
                  >
                    <svg className="w-4 h-4 text-neutral-400 group-hover:text-lime-300 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <span className="flex-1">
                      <span>Change Password</span>
                    </span>
                  </button>

                  <div className="h-px bg-white/[0.08] my-1" />

                  <a
                    href="/api/auth/logout"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 rounded-xl transition-colors group"
                  >
                    <svg className="w-4 h-4 text-rose-400 group-hover:text-rose-300 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {passwordModalOpen && (
            <ChangePasswordModal
              isOpen={passwordModalOpen}
              onClose={() => setPasswordModalOpen(false)}
            />
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-white/[0.05] text-neutral-300 hover:text-white border border-white/10"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row" suppressHydrationWarning>
        {/* ── Sidebar ─────────────────────────────── */}
        <aside className={`${mobileMenuOpen ? "flex" : "hidden"} md:flex w-full md:w-[228px] shrink-0 flex-col border-b md:border-b-0 md:border-r border-white/10 bg-[#060607] z-30 md:fixed md:top-16 md:bottom-10 md:left-0 md:overflow-y-auto`}>
          <div className="p-4 flex-1 md:overflow-y-auto">
            <p className="text-[10px] font-bold tracking-[0.18em] text-neutral-600 px-2 mb-2">WORKSPACE</p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = isActive(item.href, item.exact, item.hash, (item as any).section);
                const fullHref = item.href + (item.hash || "");
                return (
                  <Link
                    key={item.label}
                    href={fullHref}
                    prefetch={true}
                    onMouseEnter={() => { try { router.prefetch(item.href); } catch {} }}
                    onClick={() => {
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold text-[13px] transition-all ${
                      active
                        ? "bg-lime-300/15 text-lime-200"
                        : "text-neutral-400 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <span className={active ? "text-lime-300" : "text-neutral-500"}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {isOwner && (
              <div className="mt-6">
                <p className="text-[10px] font-bold tracking-[0.18em] text-neutral-600 px-2 mb-2">GOVERNANCE</p>
                <nav className="space-y-1">
                  {governanceItems.map((g) => (
                    <Link
                      key={g.label}
                      href={g.href}
                      prefetch={true}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-[13px] text-neutral-500 hover:bg-white/[0.05] hover:text-white transition-all"
                    >
                      <span>{g.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            )}
            {/* Mobile-only account actions */}
            <div className="md:hidden mt-6 pt-4 border-t border-white/10 space-y-1">
              <p className="text-[10px] font-bold tracking-[0.18em] text-neutral-600 px-2 mb-2">ACCOUNT</p>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setPasswordModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-[13px] text-neutral-400 hover:bg-white/[0.05] hover:text-white transition-all text-left"
              >
                <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span>Change Password</span>
              </button>
              <a
                href="/api/auth/logout"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-[13px] text-rose-400 hover:bg-rose-500/10 transition-all"
              >
                <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </a>
            </div>
          </div>

          {isOwner && (
            <div className="hidden md:block p-4 pt-2">
              <p className="text-[10px] leading-relaxed text-zinc-500 px-1">
                Enterprise-Grade Digital Examination, Live Proctoring &amp; Concurrency-Resilient Assessment Engine
                <span className="block mt-1.5 text-zinc-600">APTIX • Proprietary License</span>
              </p>
            </div>
          )}
        </aside>

        {/* ── Content ─────────────────────────────── */}
        <main className="flex-1 min-w-0 md:ml-[228px]">
          <div className="p-4 sm:p-6">{children}</div>
        </main>
      </div>

      {/* ── Footer strip ──────────────────────────── */}
      <footer className="sticky bottom-0 z-40 shrink-0 border-t border-white/10 bg-[#060607] h-10 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10.5px] font-medium text-zinc-500">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span>APTIX Assessment Platform · KIET Deemed to be University</span>
          <span className="hidden sm:inline text-zinc-700">·</span>
          <Link href="/terms" className="hover:text-zinc-300 transition-colors">
            Terms
          </Link>
          <span className="text-zinc-700">·</span>
          <Link href="/privacy" className="hover:text-zinc-300 transition-colors">
            Privacy
          </Link>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Made by Yash Singhal pill with Github avatar */}
          <a
            href="https://github.com/yashsinghal1234"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 hover:border-zinc-600 transition-all shadow-xs"
            title="View Yash Singhal on GitHub"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/yash-avatar.jpg"
              alt="Yash Singhal"
              className="w-4 h-4 rounded-full ring-1 ring-white/30 object-cover shrink-0"
              onError={(e) => {
                e.currentTarget.src = "https://avatars.githubusercontent.com/u/173256800?v=4";
              }}
            />
            <span className="text-[11px] text-zinc-300 font-medium">
              Made by <span className="text-white font-bold group-hover:text-lime-300 transition-colors">Yash Singhal</span>
            </span>
          </a>

          {/* LinkedIn Logo Link with crisp white icon */}
          <a
            href="https://www.linkedin.com/in/yash-singhal-94894b317/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 rounded-full bg-white/[0.12] hover:bg-[#0a66c2] border border-white/20 hover:border-[#0a66c2] flex items-center justify-center text-white transition-all shadow-xs group"
            title="Connect on LinkedIn"
            aria-label="LinkedIn Profile"
          >
            <svg className="w-3.5 h-3.5 fill-white text-white" viewBox="0 0 24 24">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64c-.9 0-1.63.73-1.63 1.63 0 .9.73 1.63 1.63 1.63.9 0 1.63-.73 1.63-1.63 0-.9-.73-1.63-1.63-1.63Z" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}
