"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteQuestionAction } from "@/app/actions/setter";

/**
 * Delete control matching the drawer's Edit button shape exactly — the only
 * difference is the rose color signaling a destructive action.
 */
export function DeleteQuestionButton({ id, isLocked }: { id: string; isLocked?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (confirm("Are you sure you want to delete this question? This action cannot be undone.")) {
          startTransition(async () => {
            const res = await deleteQuestionAction(id);
            if (res && res.error) {
              alert(res.error);
              return;
            }
            router.refresh();
          });
        }
      }}
      disabled={isPending}
      className="px-4 py-2 bg-rose-500 hover:brightness-110 text-white text-xs font-black rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
      title="Delete Question"
    >
      {isPending ? "Deleting..." : "Delete Question"}
    </button>
  );
}
