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
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: "Database check failed"
      },
      { status: 503 }
    );
  }
}

