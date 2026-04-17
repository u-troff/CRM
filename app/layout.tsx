import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "U-Flow CRM",
  description: "Internal cold-call CRM for U-Flow Solutions — plumbing contractor outreach in Pasadena / San Gabriel Valley.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Sidebar />
          <div className="main-area">{children}</div>
        </div>
      </body>
    </html>
  );
}
