import { logoutAction } from "@/app/actions/auth";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = cookies().get("token")?.value;
  let role = "CANDIDATE";
  if (token) {
    const payload = await verifyToken(token);
    if (payload) role = payload.role as string;
  }
  const isOwner = role === "OWNER";

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#090d16] text-white shrink-0 hidden md:flex flex-col border-r border-slate-800 shadow-2xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-md border border-slate-700/50 shrink-0">
              <img src="/aptix_logo.jpg" alt="Aptix" className="h-full w-full object-contain" />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-white block">Aptix</span>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest block -mt-0.5">Control Center</span>
            </div>
          </div>

          <nav className="space-y-1.5">
            {isOwner && (
              <>
                <a href="/dashboard/owner" className="flex items-center gap-3 px-3.5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs tracking-wide transition-all shadow-md">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                  <span>Dashboard</span>
                </a>
                <a href="/dashboard/owner/schedule" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-300 hover:bg-slate-800/80 hover:text-white rounded-xl font-semibold text-xs tracking-wide transition-colors">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  <span>Schedule Exam</span>
                </a>
                <a href="/dashboard/owner/results" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-300 hover:bg-slate-800/80 hover:text-white rounded-xl font-semibold text-xs tracking-wide transition-colors">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                  <span>History & Analytics</span>
                </a>
              </>
            )}
            <a href="/dashboard/setter" className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs tracking-wide transition-colors ${!isOwner ? 'bg-indigo-600 text-white font-bold shadow-md' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}>
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
              <span>Question Adder</span>
            </a>
            <a href="/dashboard/setter/bank" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-300 hover:bg-slate-800/80 hover:text-white rounded-xl font-semibold text-xs tracking-wide transition-colors">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
              <span>Question Bank</span>
            </a>
            {isOwner && (
              <>
                <a href="/dashboard/owner#candidates" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-300 hover:bg-slate-800/80 hover:text-white rounded-xl font-semibold text-xs tracking-wide transition-colors">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                  <span>Candidate Records</span>
                </a>
                <a href="/dashboard/owner#setters" className="flex items-center gap-3 px-3.5 py-2.5 text-slate-300 hover:bg-slate-800/80 hover:text-white rounded-xl font-semibold text-xs tracking-wide transition-colors">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                  <span>Manage Setters</span>
                </a>
              </>
            )}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800/80">
          <div className="flex items-center gap-3 text-xs bg-slate-900 p-3 rounded-2xl border border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center shadow-sm">
              {isOwner ? "OW" : "ST"}
            </div>
            <div className="truncate">
              <p className="font-bold text-white text-xs">{isOwner ? "Administrator" : "Question Setter"}</p>
              <p className="text-slate-400 text-[11px] truncate font-medium">{isOwner ? "Full Permissions" : "Content Author"}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200/80 px-8 py-4 flex justify-between items-center shrink-0 shadow-soft-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-100">
              {isOwner ? "Admin Portal" : "Setter Portal"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <form action={logoutAction}>
              <button 
                type="submit" 
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-xl transition-all border border-slate-200 flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                Logout
              </button>
            </form>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-slate-50/60 p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
