import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import PWARegister from "./PWARegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Link Board",
  description: "A simple link and task manager app",
  manifest: "/manifest.json",
  themeColor: "#184d26",
};

export const viewport = {
  themeColor: "#184d26",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {children}

        {/* 🔔 Toast notifications */}
        <Toaster position="top-right" />

        {/* ⚡ Optional service worker register (safe even if empty) */}
        <PWARegister />
      </body>
    </html>
  );
}