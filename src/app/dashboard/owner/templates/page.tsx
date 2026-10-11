import React from "react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import TemplateStudioView, { TemplateItem, StudioSession } from "@/components/owner/TemplateStudioView";

export const dynamic = "force-dynamic";

const istDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const istTime = (d: Date | string) =>
  new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });

export default async function ExamTemplatesPage() {
  const token = cookies().get("token")?.value;
  if (!token) redirect("/");
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") redirect("/");

  const [dbExams, staff] = await Promise.all([
    prisma.exam.findMany({
      where: { isDeleted: false },
      include: {
        questions: { select: { id: true, category: true } },
        rules: { select: { count: true } },
        sessions: {
          select: {
            id: true,
            pin: true,
            status: true,
            startTime: true,
            durationMinutes: true,
            _count: { select: { attempts: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["SETTER", "OWNER"] } },
      select: { id: true, name: true, role: true },
    }),
  ]);

  const staffNames: Record<string, string> = {};
  for (const u of staff) staffNames[u.id] = u.role === "OWNER" ? "Administrator" : u.name;

  const items: TemplateItem[] = dbExams.map((e) => {
    const liveSession = e.sessions.find((s) => s.status === "LIVE") || null;
    const schedSession = e.sessions.find((s) => s.status === "SCHEDULED") || null;
    const activeSession = liveSession || schedSession || e.sessions[0] || null;
    const status: "LIVE" | "DRAFT" | "SCHEDULED" = liveSession ? "LIVE" : schedSession ? "SCHEDULED" : "DRAFT";

    const catMap: Record<string, number> = {};
    for (const q of e.questions) {
      const c = q.category || "General";
      catMap[c] = (catMap[c] || 0) + 1;
    }
    const pills = Object.entries(catMap).map(([label, count]) => ({ label, count }));
    const autoPicked = e.rules.reduce((a, r) => a + (Number(r.count) || 0), 0);

    const start = activeSession?.startTime ? new Date(activeSession.startTime) : null;
    const end = start ? new Date(start.getTime() + (activeSession?.durationMinutes || 0) * 60000) : null;
    const timingStr = start
      ? `${istDate(start)} · ${istTime(start)}–${end ? istTime(end) : ""} IST`
      : "Flexible window";

    const sessions: StudioSession[] = e.sessions.map((s) => ({
      id: s.id,
      pin: s.pin,
      status: s.status,
      startLabel: s.startTime ? `${istDate(s.startTime)} · ${istTime(s.startTime)} IST` : "Unscheduled",
      attempts: s._count.attempts,
    }));

    const domain = (e.allowedEmailDomain || "").replace(/^@/, "").trim();
    const cohortCode = e.subject
      ? e.subject.toUpperCase().slice(0, 12)
      : domain
        ? domain.split(".")[0].toUpperCase().slice(0, 12)
        : "APT";

    return {
      id: e.id,
      title: e.title,
      status,
      cohortCode,
      candidatesCount: activeSession ? activeSession._count.attempts : 0,
      durationMinutes: e.durationMinutes,
      fixedCount: e.questions.length,
      autoPickedCount: autoPicked,
      passScorePct: Math.round(e.passCriteria ?? 50),
      breakdown: pills.length > 0 ? pills.map((p) => `${p.label} ${p.count}`).join(" · ") : "No fixed questions yet",
      timingStr,
      instructions: e.instructions || "",
      negativeMarking: e.negativeMarkingEnabled ? `-${e.negativeMarksValue} / incorrect` : "Off",
      pointsPerQ: e.marksPerQuestion ?? 1,
      domainLock: domain ? `@${domain} · required` : "Open entry",
      ownerName: staffNames[e.createdBySetterId] || "Administrator",
      createdLabel: `Created ${istDate(e.createdAt)}`,
      categoryPills: pills,
      proctoring: {
        fullscreen: e.requireFullscreen,
        singleTab: true,
        focusLoss: true,
        forceSubmit: e.tabSwitchLimit !== null,
      },
      latestSessionId: activeSession && activeSession.status !== "COMPLETED" ? activeSession.id : null,
      latestStartISO:
        activeSession?.startTime && activeSession.status !== "COMPLETED"
          ? new Date(activeSession.startTime).toISOString()
          : "",
      sessions,
    };
  });

  return <TemplateStudioView initialTemplates={items} />;
}
