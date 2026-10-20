import { NextResponse } from "next/server";
import { submitExamAction } from "@/app/actions/exam";

/**
 * Plain-HTTP submission transport (bypasses the server-action POST path).
 * Used as a fallback by the exam interface when the server-action transport
 * stalls — the underlying action is identical and idempotent.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const attemptId = typeof (body as any).attemptId === "string" ? (body as any).attemptId : "";
    if (!attemptId) {
      return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
    }

    const rawAnswers = (body as any).answers;
    const answers: Record<string, string> =
      rawAnswers && typeof rawAnswers === "object" && !Array.isArray(rawAnswers)
        ? Object.fromEntries(
            Object.entries(rawAnswers)
              .filter(([, v]) => typeof v === "string")
              .map(([k, v]) => [k, String(v)])
          )
        : {};

    const rawTimeSpent = (body as any).timeSpent;
    const timeSpent: Record<string, number> | undefined =
      rawTimeSpent && typeof rawTimeSpent === "object" && !Array.isArray(rawTimeSpent)
        ? Object.fromEntries(
            Object.entries(rawTimeSpent)
              .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
              .map(([k, v]) => [k, Number(v)])
          )
        : undefined;

    const clientStartedAtMsRaw = (body as any).clientStartedAtMs;
    const clientStartedAtMs =
      typeof clientStartedAtMsRaw === "number" && Number.isFinite(clientStartedAtMsRaw)
        ? clientStartedAtMsRaw
        : undefined;

    const result = await submitExamAction(attemptId, answers, timeSpent, clientStartedAtMs);
    // Surface the action's own verdict; the client treats any well-formed
    // response (even an error verdict) as "transport alive".
    return NextResponse.json(result ?? { error: "Unknown submission result" });
  } catch (error: any) {
    console.error("[api/exam/submit] transport error:", error);
    return NextResponse.json({ error: error?.message || "Submission transport failed" }, { status: 500 });
  }
}
