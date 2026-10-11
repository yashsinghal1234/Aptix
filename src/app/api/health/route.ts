import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json(
      {
        status: "error",
        database: "unconfigured",
        message: "DATABASE_URL environment variable is not set.",
        hint: "Please set DATABASE_URL in your deployment platform's Environment Variables settings (e.g. Vercel Project Settings > Environment Variables)."
      },
      { status: 500 }
    );
  }

  const hasQuotes = (dbUrl.startsWith('"') && dbUrl.endsWith('"')) || (dbUrl.startsWith("'") && dbUrl.endsWith("'"));
  const sanitizedUrl = dbUrl.trim().replace(/^["']|["']$/g, "");

  let host = "unknown";
  try {
    const parsed = new URL(sanitizedUrl);
    host = parsed.host;
  } catch {
    host = "invalid-url-format";
  }

  const start = Date.now();
  try {
    const userCount = await prisma.user.count();
    const durationMs = Date.now() - start;
    return NextResponse.json({
      status: "ok",
      database: "connected",
      host,
      hasQuotesInEnv: hasQuotes,
      latencyMs: durationMs,
      userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    const durationMs = Date.now() - start;
    return NextResponse.json(
      {
        status: "error",
        database: "unreachable",
        host,
        hasQuotesInEnv: hasQuotes,
        latencyMs: durationMs,
        errorCode: error?.code || null,
        errorMessage: error?.message || String(error),
        hint:
          error?.code === "P1001"
            ? "Database server is unreachable. Verify your Neon database is active (not paused/deleted) and host is correct."
            : error?.code === "P1000"
            ? "Authentication failed. Double check your database user and password in DATABASE_URL."
            : error?.code === "P1003"
            ? "Database does not exist. Check database name in DATABASE_URL."
            : "Check deployment environment variables and Neon connectivity."
      },
      { status: 500 }
    );
  }
}
