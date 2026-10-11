import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { DashboardNav } from "@/components/DashboardNav";
import { prewarmAllDashboardCaches } from "@/lib/dashboard-cache";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = cookies().get("token")?.value;
  let role = "CANDIDATE";
  let userName = "Administrator";
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      role = payload.role as string;
      if (typeof payload.name === "string" && payload.name.trim()) userName = payload.name;
    }
  }
  const isOwner = role === "OWNER";

  return <DashboardNav isOwner={isOwner} userName={userName}>{children}</DashboardNav>;
}
