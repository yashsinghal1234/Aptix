import React from "react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { CreateTemplateForm } from "@/components/CreateTemplateForm";

export const dynamic = "force-dynamic";

export default async function NewTemplatePage() {
  const token = cookies().get("token")?.value;
  if (!token) redirect("/");
  
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") redirect("/");

  const allQuestions = await prisma.question.findMany({
    where: { status: "APPROVED" },
    include: { _count: { select: { responses: true } } }
  });

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <CreateTemplateForm allQuestions={allQuestions} />
    </div>
  );
}
