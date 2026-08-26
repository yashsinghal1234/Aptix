import { NextResponse } from "next/server";
import { sweepExpiredAttemptsAction } from "@/app/actions/exam";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get("secret");
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader ? authHeader.replace("Bearer ", "").trim() : null;

  const expectedSecret = process.env.CRON_SECRET || process.env.JWT_SECRET;

  // Verify authorization if CRON_SECRET is configured
  if (expectedSecret && secretParam !== expectedSecret && bearerSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sweepExpiredAttemptsAction();
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
