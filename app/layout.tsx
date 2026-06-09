import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vitality Tracker",
  description:
    "Mobile-first workout tracker for the Live Elevated / Vitality training philosophy.",
  applicationName: "Vitality Tracker",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vitality",
  },
  other: {
    // Modern standard replacing the deprecated apple-mobile-web-app-capable.
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#121316",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tree = (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <BottomNav />
      </body>
    </html>
  );

  // Fail-safe: only mount Clerk when its publishable key is present. If it's ever
  // missing in an environment, the core app + public /g/ pages still render
  // (only the trainer auth pages degrade) instead of white-screening.
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      {tree}
    </ClerkProvider>
  ) : (
    tree
  );
}
