import type { HelpArticle } from "../types";

export const founderInvestorsArticles: HelpArticle[] = [
  {
    slug: "managing-investor-access",
    title: "Managing Investor Access",
    description:
      "How to approve or deny investor access requests and understand the access model.",
    role: "founder",
    category: "investor-access",
    icon: "shield",
    relatedPages: ["/portal/investors"],
    relatedArticles: [
      "welcome-founder",
      "understanding-activity-log",
      "responding-metric-requests",
    ],
    keywords: [
      "investors",
      "access",
      "approve",
      "deny",
      "pending",
      "bulk",
      "revoke",
      "permissions",
    ],
    heroVisual: "approval-flow",
    steps: [
      {
        title: "Open the Investors page",
        content:
          "Click \"Investors\" in the sidebar. The page shows all investors linked to your company, with status badges showing how many are approved, pending, and denied. Each investor appears as a card with their name, email, organization, and current access status.",
      },
      {
        title: "Understand the access model",
        content:
          "Access in PostSig is all-or-nothing. An approved investor can see all metrics you have submitted and all documents you have uploaded. There is no per-metric or per-document access control. The investor who originally invited you to the platform is auto-approved. All other investors start with a \"Pending\" status and must be approved by you.",
        warning:
          "Once you approve an investor, they immediately gain access to all your submitted data. Be sure you want to share before approving.",
      },
      {
        title: "Approve or deny individual investors",
        content:
          "On each investor card, you will see action buttons based on their current status. For pending investors, click \"Approve\" to grant access or \"Deny\" to block them. For approved investors, you can click \"Deny access\" to revoke their access. For denied investors, you can click \"Approve\" to restore access.",
      },
      {
        title: "Use bulk actions",
        content:
          "If you have two or more pending investors, bulk action buttons appear at the top of the page: \"Approve all\" and \"Deny all\" (with counts shown). These let you handle multiple requests at once. The \"Deny all\" button shows a confirmation dialog before proceeding to prevent accidental denials.",
        tip: "Bulk actions only affect investors with a \"Pending\" status. Already-approved or denied investors are not changed.",
      },
      {
        title: "Search and filter",
        content:
          "When you have four or more investors, a search bar appears. Type an investor name, email address, or organization name to filter the list. Status count badges at the top of the page show a quick summary of how many investors are in each state.",
      },
      {
        title: "Change access later",
        content:
          "You can change any investor's access status at any time. Denying a previously approved investor immediately removes their ability to view your data. Re-approving a denied investor restores their access. There is no limit on how many times you can change an investor's status.",
      },
    ],
  },
  {
    slug: "understanding-activity-log",
    title: "Understanding the Activity Log",
    description:
      "What the activity log shows and how to track investor interactions with your data.",
    role: "founder",
    category: "investor-access",
    icon: "activity",
    relatedPages: ["/portal/activity"],
    relatedArticles: [
      "managing-investor-access",
      "understanding-dashboard",
      "uploading-documents",
    ],
    keywords: [
      "activity",
      "log",
      "history",
      "investor interactions",
      "views",
      "access",
      "tracking",
    ],
    steps: [
      {
        title: "Open the Activity page",
        content:
          "Click \"Activity\" in the sidebar. The page displays a chronological log of events related to your company, showing when investors access your data and other notable interactions.",
      },
      {
        title: "Review activity entries",
        content:
          "Each entry in the activity log shows what happened, who was involved, and when it occurred. Activities can include investor access requests, metric views, document downloads, and status changes. Entries are displayed in reverse chronological order with the most recent activity at the top.",
      },
      {
        title: "Identify investor engagement",
        content:
          "Use the activity log to understand which investors are actively engaged with your data. Frequent views and downloads indicate strong interest. Investors who never access your data after being approved may warrant a direct conversation.",
        tip: "Regular activity from an investor often signals they are actively monitoring your progress, which can be a positive indicator for future fundraising conversations.",
      },
      {
        title: "Monitor for unusual patterns",
        content:
          "Keep an eye on the activity log for unexpected patterns, such as access from investors you do not recognize or an unusual spike in document downloads. If something looks off, review your investor access list and deny access for any investors you are unsure about.",
      },
    ],
  },
];
