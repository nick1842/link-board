import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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
  title: "To Do App",
  description: "PWA To Do List",
  manifest: "/manifest.json",
  themeColor: "#000000",
};

export const viewport = {
  themeColor: "#184d26",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{
      children}
      <PWARegister />
      </body>
    </html>
  );
}