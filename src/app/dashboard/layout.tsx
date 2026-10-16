import { requireAuth } from "@/lib/auth";
import { DashboardNav } from "@/components/DashboardNav";
import { prewarmAllDashboardCaches } from "@/lib/dashboard-cache";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAuth();
  let role = "CANDIDATE";
  let userName = "Administrator";
  if (!("error" in auth)) {
    role = auth.user.role;
    if (auth.user.name?.trim()) userName = auth.user.name;
  }
  const isOwner = role === "OWNER";

  return <DashboardNav isOwner={isOwner} userName={userName}>{children}</DashboardNav>;
}
