import { NextResponse } from "next/server";
import { sweepExpiredAttemptsAction } from "@/app/actions/exam";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get("secret");
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : null;

  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return NextResponse.json({ error: "Server configuration error: CRON_SECRET is not configured." }, { status: 500 });
  }

  const providedSecret = secretParam || bearerSecret;
  if (!providedSecret || !safeCompare(providedSecret, expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sweepExpiredAttemptsAction(expectedSecret);
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to execute sweep"
    }, { status: 500 });
  }
}
