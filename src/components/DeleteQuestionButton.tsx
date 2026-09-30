"use client";

import { useTransition } from "react";
import { deleteQuestionAction } from "@/app/actions/setter";

export function DeleteQuestionButton({ id, isLocked }: { id: string; isLocked?: boolean }) {
  const [isPending, startTransition] = useTransition();

  if (isLocked) {
    return (
      <div 
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium cursor-not-allowed select-none"
        title="Question is locked: Bound to an active or completed assessment session. Deletion is blocked to preserve scoring records."
      >
        <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="text-[11px] font-semibold">Locked</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        if (confirm("Are you sure you want to delete this question?")) {
          startTransition(async () => {
            const res = await deleteQuestionAction(id);
            if (res && res.error) {
              alert(res.error);
            }
          });
        }
      }}
      disabled={isPending}
      className="text-red-500 hover:text-red-400 disabled:opacity-50 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
      title="Delete Question"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
      </svg>
    </button>
  );
}
