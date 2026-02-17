import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { HelpVisualKey } from "@/lib/help/types";

const registry: Record<HelpVisualKey, ComponentType> = {
  "sidebar-navigate": dynamic(
    () =>
      import("./scenes/sidebar-navigate-scene").then(
        (m) => m.SidebarNavigateScene,
      ),
    { ssr: false },
  ),
  "csv-import": dynamic(
    () => import("./scenes/csv-import-scene").then((m) => m.CsvImportScene),
    { ssr: false },
  ),
  "file-upload": dynamic(
    () => import("./scenes/file-upload-scene").then((m) => m.FileUploadScene),
    { ssr: false },
  ),
  "form-fill": dynamic(
    () => import("./scenes/form-fill-scene").then((m) => m.FormFillScene),
    { ssr: false },
  ),
  "cursor-click": dynamic(
    () => import("./scenes/cursor-click-scene").then((m) => m.CursorClickScene),
    { ssr: false },
  ),
  "approval-flow": dynamic(
    () =>
      import("./scenes/approval-flow-scene").then((m) => m.ApprovalFlowScene),
    { ssr: false },
  ),
  "metric-submission": dynamic(
    () =>
      import("./scenes/metric-submission-scene").then(
        (m) => m.MetricSubmissionScene,
      ),
    { ssr: false },
  ),
  "chart-build": dynamic(
    () => import("./scenes/chart-build-scene").then((m) => m.ChartBuildScene),
    { ssr: false },
  ),
  "table-populate": dynamic(
    () =>
      import("./scenes/table-populate-scene").then((m) => m.TablePopulateScene),
    { ssr: false },
  ),
  "status-change": dynamic(
    () =>
      import("./scenes/status-change-scene").then((m) => m.StatusChangeScene),
    { ssr: false },
  ),
  "share-link": dynamic(
    () => import("./scenes/share-link-scene").then((m) => m.ShareLinkScene),
    { ssr: false },
  ),
  "drag-drop": dynamic(
    () => import("./scenes/drag-drop-scene").then((m) => m.DragDropScene),
    { ssr: false },
  ),
};

export function getVisualComponent(
  key: HelpVisualKey,
): ComponentType | undefined {
  return registry[key];
}
