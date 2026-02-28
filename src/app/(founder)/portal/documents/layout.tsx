import type { Metadata } from "next";

export const metadata: Metadata = { title: "Documents | PostSig" };

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
