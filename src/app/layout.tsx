import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aptix Assessment &bull; Enterprise Examination Platform",
  description: "High-integrity, secure online aptitude assessment and examination platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
