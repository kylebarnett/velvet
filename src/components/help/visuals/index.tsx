import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { HelpVisualKey } from "@/lib/help/types";

export type VisualEntry = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>;
  props?: Record<string, unknown>;
};

const FormFillDynamic = dynamic(
  () => import("./scenes/form-fill-scene").then((m) => m.FormFillScene),
  { ssr: false },
);

const TablePopulateDynamic = dynamic(
  () =>
    import("./scenes/table-populate-scene").then((m) => m.TablePopulateScene),
  { ssr: false },
);

const FileUploadDynamic = dynamic(
  () => import("./scenes/file-upload-scene").then((m) => m.FileUploadScene),
  { ssr: false },
);

const CursorClickDynamic = dynamic(
  () =>
    import("./scenes/cursor-click-scene").then((m) => m.CursorClickScene),
  { ssr: false },
);

const ShareLinkDynamic = dynamic(
  () => import("./scenes/share-link-scene").then((m) => m.ShareLinkScene),
  { ssr: false },
);

const registry: Record<HelpVisualKey, VisualEntry> = {
  "sidebar-navigate": {
    component: dynamic(
      () =>
        import("./scenes/sidebar-navigate-scene").then(
          (m) => m.SidebarNavigateScene,
        ),
      { ssr: false },
    ),
  },
  "csv-import": {
    component: dynamic(
      () =>
        import("./scenes/csv-import-scene").then((m) => m.CsvImportScene),
      { ssr: false },
    ),
  },
  "file-upload": { component: FileUploadDynamic },
  "file-upload-avatar": {
    component: FileUploadDynamic,
    props: { filename: "avatar.jpg", fileSize: "240 KB" },
  },
  "form-fill": { component: FormFillDynamic },
  "form-fill-contact": {
    component: FormFillDynamic,
    props: {
      fields: [
        { label: "Full Name", value: "Jane Smith" },
        { label: "Email", value: "jane@acme.co" },
        { label: "Phone", value: "+1 (555) 123-4567" },
      ],
    },
  },
  "form-fill-fund": {
    component: FormFillDynamic,
    props: {
      fields: [
        { label: "Fund Name", value: "Growth Fund III" },
        { label: "Vintage Year", value: "2025" },
        { label: "Target Size", value: "$50,000,000" },
      ],
    },
  },
  "form-fill-investment": {
    component: FormFillDynamic,
    props: {
      fields: [
        { label: "Company", value: "Acme Corp" },
        { label: "Amount Invested", value: "$2,500,000" },
        { label: "Date", value: "March 15, 2025" },
      ],
    },
  },
  "form-fill-team": {
    component: FormFillDynamic,
    props: {
      fields: [
        { label: "Email Address", value: "alex@company.co" },
        { label: "Role", value: "Member" },
      ],
    },
  },
  "form-fill-company": {
    component: FormFillDynamic,
    props: {
      fields: [
        { label: "Company Name", value: "Acme Corp" },
        { label: "Website", value: "acme.co" },
        { label: "Industry", value: "SaaS" },
      ],
    },
  },
  "form-fill-display-name": {
    component: FormFillDynamic,
    props: {
      fields: [{ label: "Display Name", value: "Jane Smith" }],
    },
  },
  "form-fill-email": {
    component: FormFillDynamic,
    props: {
      fields: [
        { label: "Current Email", value: "jane@old.co" },
        { label: "New Email", value: "jane@new.co" },
      ],
    },
  },
  "form-fill-password": {
    component: FormFillDynamic,
    props: {
      fields: [
        { label: "Current Password", value: "********" },
        { label: "New Password", value: "********" },
        { label: "Confirm", value: "********" },
      ],
    },
  },
  "form-fill-template": {
    component: FormFillDynamic,
    props: {
      fields: [
        { label: "Template Name", value: "Quarterly KPIs" },
        { label: "Metric 1", value: "Revenue" },
        { label: "Metric 2", value: "ARR" },
      ],
    },
  },
  "form-fill-tear-sheet": {
    component: FormFillDynamic,
    props: {
      fields: [
        { label: "Title", value: "Q4 2025 Summary" },
        { label: "Period", value: "Q4 2025" },
        { label: "Highlights", value: "Revenue up 24% QoQ" },
      ],
    },
  },
  "cursor-click": { component: CursorClickDynamic },
  "cursor-click-submit": {
    component: CursorClickDynamic,
    props: {
      buttonText: "Submit Metrics",
      successText: "Metrics submitted successfully",
    },
  },
  "approval-flow": {
    component: dynamic(
      () =>
        import("./scenes/approval-flow-scene").then(
          (m) => m.ApprovalFlowScene,
        ),
      { ssr: false },
    ),
  },
  "metric-submission": {
    component: dynamic(
      () =>
        import("./scenes/metric-submission-scene").then(
          (m) => m.MetricSubmissionScene,
        ),
      { ssr: false },
    ),
  },
  "chart-build": {
    component: dynamic(
      () =>
        import("./scenes/chart-build-scene").then((m) => m.ChartBuildScene),
      { ssr: false },
    ),
  },
  "table-populate": { component: TablePopulateDynamic },
  "table-populate-documents": {
    component: TablePopulateDynamic,
    props: {
      columns: ["Document", "Type", "Uploaded"],
      rows: [
        ["Q4 Financial Report.pdf", "Financial", "Jan 15, 2025"],
        ["Board Deck \u2014 Dec.pptx", "Board Deck", "Dec 20, 2024"],
        ["Cap Table \u2014 2024.xlsx", "Cap Table", "Nov 8, 2024"],
        ["Investor Update \u2014 Q3.pdf", "Update", "Oct 3, 2024"],
      ],
    },
  },
  "status-change": {
    component: dynamic(
      () =>
        import("./scenes/status-change-scene").then(
          (m) => m.StatusChangeScene,
        ),
      { ssr: false },
    ),
  },
  "share-link": { component: ShareLinkDynamic },
  "share-link-tear-sheet": {
    component: ShareLinkDynamic,
    props: {
      buttonText: "Share Tear Sheet",
      url: "velvet.app/ts/q4-summary",
    },
  },
  "drag-drop": {
    component: dynamic(
      () => import("./scenes/drag-drop-scene").then((m) => m.DragDropScene),
      { ssr: false },
    ),
  },
};

export function getVisualComponent(
  key: HelpVisualKey,
): VisualEntry | undefined {
  return registry[key];
}
