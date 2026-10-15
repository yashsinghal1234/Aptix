import { NextResponse } from "next/server";
import { invalidateAllDashboardCaches } from "@/lib/dashboard-cache";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  invalidateAllDashboardCaches();
  revalidatePath("/dashboard/owner");
  revalidatePath("/dashboard/setter/bank");
  revalidatePath("/dashboard/setter");
  return NextResponse.json({ success: true, message: "All in-memory dashboard caches flushed" });
}

export async function POST() {
  invalidateAllDashboardCaches();
  revalidatePath("/dashboard/owner");
  revalidatePath("/dashboard/setter/bank");
  revalidatePath("/dashboard/setter");
  return NextResponse.json({ success: true, message: "All in-memory dashboard caches flushed" });
}
