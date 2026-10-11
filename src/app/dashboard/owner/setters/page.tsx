import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { getCachedSettersData } from "@/lib/dashboard-cache";
import {
  SettersHero,
  SetterStats,
  AddSetterPanel,
  FacultyDirectory,
} from "@/components/owner/SettersOps";

export const dynamic = "force-dynamic";

export default async function ManageSettersPage() {
  const token = cookies().get("token")?.value;
  if (!token) redirect("/");

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") redirect("/");

  const [setters, authorGroups, totalBankQuestions, categories] = await getCachedSettersData();

  const questionsByAuthor = (authorGroups as any[]).reduce((acc: Record<string, number>, g: any) => {
    acc[g.authorId] = g._count.id;
    return acc;
  }, {} as Record<string, number>);

  const totalQuestionsAuthored = (authorGroups as any[]).reduce((sum, g: any) => sum + g._count.id, 0);
  const catNames = (categories as any[]).map((c: any) => c.category).filter(Boolean);

  const rows = (setters as any[]).map((s: any) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    assignedSubject: s.assignedSubject || null,
    joinedLabel: s.createdAt
      ? new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
      : "—",
    mustChangePassword: s.mustChangePassword === true,
    authored: questionsByAuthor[s.id] || 0,
  }));

  const activeCount = rows.filter((r) => !r.mustChangePassword).length;
  const pwdCount = rows.length - activeCount;

  return (
    <div className="max-w-[1440px] mx-auto space-y-4 pb-8">
      <SettersHero />

      <SetterStats
        stats={[
          { label: "Total Authors", value: String(rows.length), sub: `${activeCount} active · ${pwdCount} password change required` },
          { label: "Questions Authored", value: totalQuestionsAuthored.toLocaleString(), sub: "Across all faculty contributors" },
          { label: "Bank Volume", value: Number(totalBankQuestions).toLocaleString(), sub: "Including drafts and review queue" },
          {
            label: "Subject Domains",
            value: String(catNames.length).padStart(2, "0"),
            sub: catNames.length > 0 ? `${catNames.slice(0, 3).join(", ").toLowerCase()}${catNames.length > 3 ? " and more" : ""}` : "No subjects yet",
          },
        ]}
      />

      <AddSetterPanel />

      <FacultyDirectory setters={rows} />
    </div>
  );
}
