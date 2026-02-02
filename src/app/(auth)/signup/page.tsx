import { AuthCard } from "@/components/auth/auth-card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ invite?: string }>;
};

export default async function SignupPage({ searchParams }: Props) {
  const params = await searchParams;
  const inviteToken = params.invite;
  let companyName: string | undefined;
  let companyId: string | undefined;
  let inviteEmail: string | undefined;

  if (inviteToken) {
    try {
      const supabase = createSupabaseAdminClient();
      const { data: invitation } = await supabase
        .from("portfolio_invitations")
        .select(`
          id,
          status,
          company_id,
          email,
          companies (
            name
          )
        `)
        .eq("invite_token", inviteToken)
        .single();

      if (invitation && invitation.status !== "accepted") {
        companyId = invitation.company_id;
        inviteEmail = invitation.email;
        const companies = invitation.companies as { name: string }[] | { name: string } | null;
        if (Array.isArray(companies)) {
          companyName = companies[0]?.name;
        } else {
          companyName = companies?.name;
        }
      }
    } catch {
      // Ignore errors - just show normal signup page
    }
  }

  return (
    <AuthCard
      mode="signup"
      inviteToken={inviteToken}
      companyName={companyName}
      companyId={companyId}
      inviteEmail={inviteEmail}
    />
  );
}
