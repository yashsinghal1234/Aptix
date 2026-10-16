import React from "react";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { CreateTemplateForm } from "@/components/CreateTemplateForm";
import { getCachedApprovedQuestions } from "@/lib/dashboard-cache";

export const dynamic = "force-dynamic";

export default async function NewTemplatePage() {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) redirect("/");

  const allQuestions = await getCachedApprovedQuestions();


  return (
    <div className="max-w-7xl mx-auto pb-12">
      <CreateTemplateForm allQuestions={allQuestions} />
    </div>
  );
}
