/**
 * Fire-and-forget activity logging for investor actions.
 * Logs are visible to founders on their Activity page.
 *
 * This intentionally never throws — a failed log should never
 * block the user's action.
 */

type ActivityAction =
  | "view_dashboard"
  | "download_document"
  | "export_metrics"
  | "view_tear_sheet";

type LogActivityParams = {
  companyId: string;
  action: ActivityAction;
  metadata?: Record<string, unknown>;
};

export function logActivity({ companyId, action, metadata }: LogActivityParams): void {
  fetch("/api/activity-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_id: companyId,
      action,
      metadata,
    }),
  }).catch(() => {
    // Silently swallow — logging must never interfere with user actions
  });
}
