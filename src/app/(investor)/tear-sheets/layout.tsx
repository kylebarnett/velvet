import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tear Sheets | Velvet" };

export default function TearSheetsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
