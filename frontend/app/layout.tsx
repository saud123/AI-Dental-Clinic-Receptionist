import type { Metadata } from "next";
import { Outfit, DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smile Dental — AI Dental Receptionist",
  description: "Modern dental clinic portal and AI receptionist",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-surface text-on-surface font-body">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
