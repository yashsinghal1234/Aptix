import { LoginForm } from "@/components/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff Login",
  description: "Secure login for Aptix examination administrators, setters, and proctors.",
};

export default function StaffLoginPage() {
  return <LoginForm initialMode="staff" />;
}
