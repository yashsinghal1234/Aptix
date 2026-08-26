"use client";

import { createSetterAction, removeSetterAction } from "@/app/actions/owner";
import { useRef } from "react";

export function SetterForm() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft p-6 sm:p-8 mb-8">
      <div className="mb-4">
        <h3 className="font-bold text-slate-900 text-sm tracking-tight">Authorize Question Author</h3>
        <p className="text-xs text-slate-400 mt-0.5">Grant authoring access to faculty members and test designers</p>
      </div>
      <form
        ref={formRef}
        action={async (formData) => {
          const res = await createSetterAction(formData);
          if (res.error) {
            alert(res.error);
          } else {
            formRef.current?.reset();
          }
        }}
        className="flex flex-col sm:flex-row gap-4 items-end"
      >
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name</label>
          <input 
            type="text" 
            name="name"
            required
            className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-600 outline-none transition-all font-medium text-slate-900"
            placeholder="e.g. Dr. Jane Smith"
          />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
          <input 
            type="email" 
            name="email"
            required
            className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-600 outline-none transition-all font-medium text-slate-900"
            placeholder="jane@university.edu"
          />
        </div>
        <button 
          type="submit"
          className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-brand whitespace-nowrap"
        >
          Add Author &rarr;
        </button>
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
      className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-1 rounded-lg transition-colors border border-rose-100"
    >
      Revoke
    </button>
  );
}
