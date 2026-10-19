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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@100..700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Playfair+Display+SC:wght@400;700&family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-black text-white selection:bg-white selection:text-black" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
