"use client";

import { createSetterAction, removeSetterAction } from "@/app/actions/owner";
import { useRef } from "react";

export function SetterForm() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 mb-8">
      <h3 className="font-semibold text-slate-800 mb-4">Add Exam Setter</h3>
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
        className="flex gap-4 items-end"
      >
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">Full Name</label>
          <input 
            type="text" 
            name="name"
            required
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
            placeholder="Jane Smith"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">Email Address</label>
          <input 
            type="email" 
            name="email"
            required
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-600 outline-none"
            placeholder="jane@aptix.com"
          />
        </div>
        <button 
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Add Setter
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
      className="text-xs font-medium text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
    >
      Revoke
    </button>
  );
}
