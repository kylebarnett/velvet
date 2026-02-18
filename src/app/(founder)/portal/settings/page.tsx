import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AccountSettings } from "@/components/settings/account-settings";

export default async function FounderSettingsPage() {
  await requireRole("founder");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: freshUser },
  } = await supabase.auth.getUser();

  const { data: userData } = await supabase
    .from("users")
    .select("avatar_url")
    .eq("id", freshUser!.id)
    .single();

  return (
    <AccountSettings
      user={{
        fullName: freshUser?.user_metadata?.full_name ?? null,
        email: freshUser?.email ?? "",
        avatarUrl: (userData?.avatar_url as string | null) ?? null,
      }}
      role="founder"
    />
  );
}
