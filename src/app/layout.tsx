import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import ProctoringWrapper from "@/components/ProctoringWrapper";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Aptitude Test Platform",
  description: "Secure online aptitude assessment platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies();
  const role = cookieStore.get("userRole")?.value;
  // Only enforce proctoring if they are actively taking the test (logged in as CANDIDATE)
  const isCandidate = role === "CANDIDATE";

  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
      <body className="antialiased min-h-screen">
        {isCandidate ? (
          <ProctoringWrapper>
            {children}
          </ProctoringWrapper>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
