"use client";

import { loginAction } from "@/app/actions/auth";

export function LoginForm() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold mx-auto mb-4 text-xl">
            A
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Aptitude Platform</h1>
          <p className="text-slate-500 mt-2 text-sm">Please login to begin your assessment</p>
        </div>
        
        <form action={loginAction} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input 
              type="text" 
              name="name"
              required
              className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input 
              type="email" 
              name="email"
              required
              className="w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
              placeholder="john@example.com"
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-indigo-600 text-white font-medium py-2.5 rounded-lg hover:bg-indigo-700 transition-colors mt-4"
          >
            Start Assessment
          </button>
        </form>
      </div>
    </main>
  );
}
