"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getActiveExamStatusAction } from "@/app/actions/exam";

export function NoExamPoller() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      const active = await getActiveExamStatusAction();
      if (active) {
        router.refresh();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [router]);

  return null;
}
