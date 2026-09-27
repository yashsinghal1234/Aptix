import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { PracticeInterface } from "@/components/PracticeInterface";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Practice Arena • Aptix Assessment",
  description: "Self-study practice drill for aptitude, logical reasoning, and quantitative problem solving."
};

export default async function PracticePage() {
  let candidateName = "Candidate";

  try {
    const token = cookies().get("token")?.value;
    if (token) {
      const payload = await verifyToken(token);
      if (payload?.name) candidateName = payload.name as string;
    }
  } catch {
    // Graceful fallback to default candidate name
  }

  return <PracticeInterface candidateName={candidateName} />;
}
