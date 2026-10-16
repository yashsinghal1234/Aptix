import { NextResponse } from "next/server";
import { invalidateAllDashboardCaches } from "@/lib/dashboard-cache";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Cache flush requires authorized POST request." },
    { status: 405 }
  );
}

export async function POST() {
  const token = cookies().get("token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden: Only owners can flush system caches." }, { status: 403 });
  }

  invalidateAllDashboardCaches();
  revalidatePath("/dashboard/owner");
  revalidatePath("/dashboard/setter/bank");
  revalidatePath("/dashboard/setter");
  return NextResponse.json({ success: true, message: "All in-memory dashboard caches flushed" });
}

