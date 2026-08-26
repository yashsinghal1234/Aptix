"use client";

import { useTransition } from "react";
import { deleteQuestionAction } from "@/app/actions/setter";

export function DeleteQuestionButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (confirm("Are you sure you want to delete this question?")) {
          startTransition(() => {
            deleteQuestionAction(id);
          });
        }
      }}
      disabled={isPending}
      className="text-red-500 hover:text-red-700 disabled:opacity-50 p-2 rounded hover:bg-red-50 transition-colors"
      title="Delete Question"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
      </svg>
    </button>
  );
}
