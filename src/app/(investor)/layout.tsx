import { AppShell } from "@/components/layouts/app-shell";
import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function InvestorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireRole("investor");

  return (
    <AppShell
      title="Investor"
      nav={[
        { href: "/dashboard", label: "Dashboards" },
        { href: "/portfolio", label: "Portfolio" },
        { href: "/requests", label: "Requests" },
        { href: "/templates", label: "Templates" },
      ]}
    >
      {children}
    </AppShell>
  );
}

