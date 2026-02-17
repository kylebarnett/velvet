import type { Metadata } from "next";
import { HelpArticlePage } from "@/components/help/help-article-page";

export const metadata: Metadata = { title: "Help | Velvet" };

export default async function InvestorHelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <HelpArticlePage slug={slug} role="investor" helpBasePath="/help" />;
}
