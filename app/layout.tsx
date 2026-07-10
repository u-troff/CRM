import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import Providers from "./providers";

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
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
