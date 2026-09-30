import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Thinking Orbs - AI Status Indicator Components for React";
const description =
  "Thinking Orbs is a React component library of well-crafted, animated orbs for AI: thinking, searching, compacting and more status indicators. Free, open source.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.thinkingorbs.com"),
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: { title, description, url: "/", siteName: "Thinking Orbs", type: "website" },
  twitter: { card: "summary_large_image", title, description, creator: "@yogesharc" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
