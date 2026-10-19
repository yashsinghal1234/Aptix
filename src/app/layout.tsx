import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "APTIX | Examination Portal",
  description: "High-integrity, secure online aptitude assessment and examination portal.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=7" },
      { url: "/icon.png?v=7", type: "image/png" }
    ],
    apple: "/apple-icon.png?v=7",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head />
      <body className="antialiased min-h-screen bg-black text-white selection:bg-white selection:text-black" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
