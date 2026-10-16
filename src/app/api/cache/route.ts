import { NextResponse } from "next/server";
import { invalidateAllDashboardCaches } from "@/lib/dashboard-cache";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Cache flush requires authorized POST request." },
    { status: 405 }
  );
}

export async function POST() {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) {
    const msg = auth.error || "Unauthorized";
    const status = msg.startsWith("Forbidden") ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }

  invalidateAllDashboardCaches();
  revalidatePath("/dashboard/owner");
  revalidatePath("/dashboard/setter/bank");
  revalidatePath("/dashboard/setter");
  return NextResponse.json({ success: true, message: "All in-memory dashboard caches flushed" });
}

