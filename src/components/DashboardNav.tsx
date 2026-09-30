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

  const navItems = isOwner
    ? [
        {
          label: "Dashboard",
          href: "/dashboard/owner",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
          exact: true,
        },
        {
          label: "Schedule Exam",
          href: "/dashboard/owner/template/new",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
        },
        {
          label: "History & Analytics",
          href: "/dashboard/owner/results",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
        },
        {
          label: "Question Adder",
          href: "/dashboard/setter",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ),
          exact: true,
        },
        {
          label: "Question Bank",
          href: "/dashboard/setter/bank",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          ),
        },
        {
          label: "Candidate Records",
          href: "/dashboard/owner/candidates",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          label: "Manage Setters",
          href: "/dashboard/owner/setters",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          ),
        },
      ]
    : [
        {
          label: "Question Adder",
          href: "/dashboard/setter",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ),
          exact: true,
        },
        {
          label: "Question Bank",
          href: "/dashboard/setter/bank",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          ),
        },
      ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="min-h-screen bg-[#000000] text-neutral-100 flex flex-col md:flex-row font-sans selection:bg-white selection:text-black">
      {/* Mobile Top Navbar */}
      <div className="md:hidden bg-[#000000]/95 backdrop-blur-md text-white px-4 py-3 flex items-center justify-between border-b border-neutral-800/80 shadow-md z-40">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex items-center justify-center overflow-hidden shrink-0">
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

      {/* Sidebar for Desktop & Mobile Overlay */}
      <aside
        className={`${
          mobileMenuOpen ? "flex" : "hidden"
        } md:flex w-full md:w-64 bg-[#07080c] text-white shrink-0 flex-col border-r border-neutral-800/80 z-40 fixed md:static inset-0 md:inset-auto top-[53px] md:top-0 h-[calc(100vh-53px)] md:h-screen transition-all`}
      >
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Logo Header (Desktop) */}
          <div className="hidden md:flex items-center gap-3.5 mb-8">
            <div className="relative w-14 h-14 flex items-center justify-center overflow-hidden shrink-0">
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
              <span className="font-black text-2xl tracking-tight text-white block leading-none">Aptix</span>
              <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider block mt-1">Control Center</span>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all ${
                    active
                      ? "bg-white text-black shadow-md border border-white"
                      : "text-neutral-400 hover:bg-neutral-900/80 hover:text-white"
                  }`}
                >
                  <span className={active ? "text-black" : "text-neutral-400"}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile footer */}
        <div className="p-5 border-t border-neutral-800/80 mt-auto">
          <div className="flex items-center gap-3 text-xs bg-[#0d0f14] p-3 rounded-2xl border border-neutral-800">
            <div className="w-9 h-9 rounded-xl bg-neutral-800 text-white font-black flex items-center justify-center shrink-0 border border-neutral-700 text-xs">
              {isOwner ? "OW" : "ST"}
            </div>
            <div className="truncate">
              <p className="font-bold text-white text-xs flex items-center gap-1.5">
                <span>{isOwner ? "Administrator" : "Question Setter"}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </p>
              <p className="text-neutral-400 text-[11px] truncate font-medium">{isOwner ? "Full Permissions" : "Content Author"}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-[calc(100vh-53px)] md:h-screen overflow-hidden bg-[#000000]">
        <header className="bg-[#000000]/80 backdrop-blur-md border-b border-neutral-800/80 px-6 md:px-8 py-3.5 flex justify-between items-center shrink-0">
          <div className="flex items-center">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white">
              {isOwner ? "Executive Admin Portal" : "Authoring Setter Portal"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ChangePasswordModal />
            <a
              href="/api/auth/logout"
              className="px-4 py-2 sm:px-4.5 sm:py-2.5 text-xs sm:text-sm font-bold text-neutral-200 bg-neutral-900 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-900/50 rounded-xl transition-all border border-neutral-800 flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </a>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-[#000000] p-4 sm:p-6 md:p-8 text-neutral-100">
          {children}
        </div>
      </main>
    </div>
  );
}
