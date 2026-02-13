import { requireRole } from "@/lib/auth/require-role";
import { TemplatePicker } from "@/components/reports/template-picker";

export default async function NewReportPage() {
  await requireRole("investor");
  return <TemplatePicker />;
}
