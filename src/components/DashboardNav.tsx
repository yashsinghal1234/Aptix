"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";

interface DashboardNavProps {
  isOwner: boolean;
  children: React.ReactNode;
}

export function DashboardNav({ isOwner, children }: DashboardNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Grouped Navigation matching Image 4
  const workspaceItems = isOwner
    ? [
        {
          label: "Dashboard",
          href: "/dashboard/owner",
          exact: true,
          icon: (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth="2" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth="2" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth="2" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth="2" />
            </svg>
          ),
        },
        {
          label: "Assessments",
          href: "/dashboard/owner#templates",
          exact: false,
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          label: "Live sessions",
          href: "/dashboard/owner#active-sessions",
          badge: "2",
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.828a5 5 0 010-7.072m7.072 0a5 5 0 010 7.072M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          ),
        },
        {
          label: "Question bank",
          href: "/dashboard/setter/bank",
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
        {
          label: "Candidates",
          href: "/dashboard/owner/candidates",
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          label: "Analytics",
          href: "/dashboard/owner/results",
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
        },
      ]
    : [
        {
          label: "Question Adder",
          href: "/dashboard/setter",
          exact: true,
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ),
        },
        {
          label: "Question Bank",
          href: "/dashboard/setter/bank",
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          ),
        },
      ];

  const adminItems = isOwner
    ? [
        {
          label: "Team & access",
          href: "/dashboard/owner/setters",
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ),
        },
        {
          label: "System settings",
          href: "/dashboard/owner/candidates",
          icon: (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          ),
        },
      ]
    : [];

  const isActive = (href: string, exact?: boolean) => {
    const cleanHref = href.split("#")[0];
    if (exact) {
      return pathname === cleanHref;
    }
    return pathname === cleanHref || pathname.startsWith(cleanHref + "/");
  };

  return (
    <div className="min-h-screen bg-[#07080c] text-neutral-100 flex flex-col md:flex-row font-sans selection:bg-white selection:text-black">
      {/* Mobile Top Navbar */}
      <div className="md:hidden bg-[#0a0c12]/95 backdrop-blur-md text-white px-4 py-3 flex items-center justify-between border-b border-neutral-800/80 shadow-md z-40">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 flex items-center justify-center overflow-hidden shrink-0">
            <video
              src="/aptix-logo-anim.mp4"
              autoPlay
              loop
              muted
              playsInline
              poster="/logo-preview-frame.jpg"
              className="w-full h-full object-cover mix-blend-screen scale-130 pointer-events-none"
            />
          </div>
          <div>
            <span className="font-black text-lg text-white tracking-tight leading-none block">Aptix</span>
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mt-0.5">Control Center</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800 focus:outline-none transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Sidebar matching Image 4 */}
      <aside
        className={`${
          mobileMenuOpen ? "flex" : "hidden"
        } md:flex w-full md:w-64 bg-[#0a0c12] text-white shrink-0 flex-col border-r border-neutral-800/80 z-40 fixed md:static inset-0 md:inset-auto top-[53px] md:top-0 h-[calc(100vh-53px)] md:h-screen transition-all`}
      >
        <div className="p-5 flex-1 overflow-y-auto space-y-7">
          {/* Logo Header (Desktop) */}
          <div className="hidden md:flex items-center gap-3 pt-1">
            <div className="relative w-11 h-11 flex items-center justify-center overflow-hidden shrink-0">
              <video
                src="/aptix-logo-anim.mp4"
                autoPlay
                loop
                muted
                playsInline
                poster="/logo-preview-frame.jpg"
                className="w-full h-full object-cover mix-blend-screen scale-135 pointer-events-none"
              />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-white block leading-none">Aptix</span>
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mt-1">Control Center</span>
            </div>
          </div>

          {/* Section 1: WORKSPACE */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold tracking-widest text-neutral-500 uppercase px-3 block mb-2.5">
              Workspace
            </span>
            <nav className="space-y-1">
              {workspaceItems.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-sm tracking-wide transition-all ${
                      active
                        ? "bg-[#181726] text-white border border-[#7c3aed]/50 shadow-[0_0_15px_rgba(124,58,237,0.15)]"
                        : "text-neutral-400 hover:bg-neutral-900/60 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={active ? "text-violet-400" : "text-neutral-400"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>

                    {/* Purple badge for Live sessions */}
                    {item.badge && (
                      <span className="w-5 h-5 rounded-full bg-[#7c3aed] text-white text-[11px] font-black flex items-center justify-center shrink-0 shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Section 2: ADMINISTRATION */}
          {adminItems.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-bold tracking-widest text-neutral-500 uppercase px-3 block mb-2.5">
                Administration
              </span>
              <nav className="space-y-1">
                {adminItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold text-sm tracking-wide transition-all ${
                        active
                          ? "bg-[#181726] text-white border border-[#7c3aed]/50"
                          : "text-neutral-400 hover:bg-neutral-900/60 hover:text-white"
                      }`}
                    >
                      <span className={active ? "text-violet-400" : "text-neutral-400"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        {/* User profile footer */}
        <div className="p-4 border-t border-neutral-800/80 mt-auto bg-[#07080c]">
          <div className="flex items-center gap-3 text-xs bg-[#10121a] p-3 rounded-2xl border border-neutral-800">
            <div className="w-8 h-8 rounded-full bg-[#6d28d9] text-white font-black flex items-center justify-center shrink-0 text-xs shadow-sm">
              AK
            </div>
            <div className="truncate flex-1">
              <p className="font-bold text-white text-xs flex items-center gap-1.5">
                <span>{isOwner ? "Aarav K." : "Setter Author"}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </p>
              <p className="text-neutral-400 text-[11px] truncate font-medium">
                {isOwner ? "Executive Director" : "Content Setter"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-[calc(100vh-53px)] md:h-screen overflow-hidden bg-[#07080c]">
        {/* Top Navbar matching Image 1 */}
        <header className="bg-[#0a0c12]/95 backdrop-blur-md border-b border-neutral-800/80 px-6 md:px-8 py-3 flex justify-between items-center shrink-0 z-30">
          {/* Breadcrumb: [grid icon] Workspace > Dashboard */}
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-neutral-400">
            <svg className="w-4 h-4 text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth="2" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth="2" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth="2" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth="2" />
            </svg>
            <span className="text-neutral-300">Workspace</span>
            <span className="text-neutral-600 font-bold">›</span>
            <span className="text-white font-bold">Dashboard</span>
          </div>

          {/* Action Bar (Moon | + Create assessment | Search | Bell | Avatar) */}
          <div className="flex items-center gap-3">
            {/* Dark Mode Icon Pill */}
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              aria-label="Theme Mode"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </button>

            {/* + Create assessment Dropdown/Button */}
            <Link
              href="/dashboard/owner/template/new"
              className="inline-flex items-center gap-1.5 px-4.5 py-2 bg-white hover:bg-neutral-200 text-black text-xs sm:text-sm font-bold rounded-full transition shadow-md whitespace-nowrap cursor-pointer"
            >
              <span className="text-base font-normal leading-none">+</span>
              <span>Create assessment</span>
              <svg className="w-3.5 h-3.5 text-neutral-700 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </Link>

            {/* Search Icon Button */}
            <button
              type="button"
              className="w-9 h-9 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-900 transition flex items-center justify-center cursor-pointer"
              aria-label="Search"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Notification Bell */}
            <button
              type="button"
              className="relative w-9 h-9 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-900 transition flex items-center justify-center cursor-pointer"
              aria-label="Notifications"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-violet-500" />
            </button>

            {/* User Avatar with Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="w-8 h-8 rounded-full bg-[#6d28d9] text-white font-bold text-xs flex items-center justify-center shadow-md cursor-pointer hover:ring-2 hover:ring-violet-400 transition"
                aria-label="User Menu"
              >
                AK
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#10121a] border border-neutral-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-neutral-800/80 mb-1">
                    <p className="font-bold text-sm text-white">Aarav K.</p>
                    <p className="text-xs text-neutral-400">admin@aptix.org</p>
                  </div>
                  <div className="p-1">
                    <ChangePasswordModal />
                  </div>
                  <form action={logoutAction} className="pt-1 border-t border-neutral-800/80">
                    <button
                      type="submit"
                      className="w-full text-left px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/30 rounded-xl transition flex items-center gap-2 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Logout</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-[#07080c] p-4 sm:p-6 md:p-8 text-neutral-100">
          {children}
        </div>
      </main>
    </div>
  );
}
