import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(role: "investor" | "founder") {
  const user = await requireUser();
  const userRole = (user.user_metadata?.role as string | undefined) ?? null;
  if (userRole !== role) redirect("/app");
  return user;
}

