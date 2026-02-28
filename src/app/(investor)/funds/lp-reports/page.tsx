import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AllReportsClient } from "@/components/lp/all-reports-client";

export const metadata: Metadata = { title: "All LP Reports | PostSig" };
export const dynamic = "force-dynamic";

export default async function AllLPReportsPage() {
  const user = await requireRole("investor");
  const supabase = await createSupabaseServerClient();

  const { data: funds } = await supabase
    .from("funds")
    .select("id, name")
    .eq("investor_id", user.id)
    .order("name");

  return <AllReportsClient funds={funds ?? []} />;
}
