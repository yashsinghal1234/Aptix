import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aptix | Examination Portal",
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
      <head>
        <title>Aptix | Examination Portal</title>
        <link rel="icon" href="/favicon.ico?v=7" sizes="any" />
        <link rel="icon" href="/icon.png?v=7" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon.png?v=7" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-black text-white selection:bg-white selection:text-black">
        {children}
      </body>
    </html>
  );
}
