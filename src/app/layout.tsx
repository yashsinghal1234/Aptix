import type { Metadata } from "next";
import "./globals.css";
import { AnimatedFavicon } from "@/components/AnimatedFavicon";

export const metadata: Metadata = {
  title: "Aptix Assessment • Enterprise Examination Platform",
  description: "High-integrity, secure online aptitude assessment and examination platform.",
  icons: {
    icon: [
      { url: "/aptix-favicon.gif", type: "image/gif" },
      { url: "/icon.png?v=3", type: "image/png" },
      { url: "/favicon.ico?v=3" }
    ],
    apple: "/apple-icon.png?v=3",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-black text-white selection:bg-white selection:text-black">
        <AnimatedFavicon />
        {children}
      </body>
    </html>
  );
}
