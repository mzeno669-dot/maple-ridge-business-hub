import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Maple Ridge | Business Hub",
  description:
    "Private job management for Maple Ridge Home & Property Solutions LLC.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
