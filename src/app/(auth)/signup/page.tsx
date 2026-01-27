import { AuthCard } from "@/components/auth/auth-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ invite?: string }>;
};

export default async function SignupPage({ searchParams }: Props) {
  const params = await searchParams;
  const inviteToken = params.invite;
  let companyName: string | undefined;

  if (inviteToken) {
    const supabase = await createSupabaseServerClient();
    const { data: invitation } = await supabase
      .from("portfolio_invitations")
      .select(`
        id,
        status,
        companies (
          name
        )
      `)
      .eq("invite_token", inviteToken)
      .single();

    if (invitation && invitation.status !== "accepted") {
      const companies = invitation.companies as { name: string }[] | { name: string } | null;
      if (Array.isArray(companies)) {
        companyName = companies[0]?.name;
      } else {
        companyName = companies?.name;
      }
    }
  }

  return (
    <AuthCard
      mode="signup"
      inviteToken={inviteToken}
      companyName={companyName}
    />
  );
}
