import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyProfile } from "@/components/founder/company-profile";

export const dynamic = "force-dynamic";

export default async function FounderCompanyPage() {
  const user = await requireRole("founder");
  const supabase = await createSupabaseServerClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, website, industry, stage, business_model")
    .eq("founder_id", user.id)
    .single();

  if (!company) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
        <div className="text-sm text-white/60">No company found for your account.</div>
      </div>
    );
  }

  return <CompanyProfile company={company} />;
}
