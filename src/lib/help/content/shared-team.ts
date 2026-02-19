import type { HelpArticle } from "../types";

export const sharedTeamArticles: HelpArticle[] = [
  {
    slug: "managing-team",
    title: "Managing Your Team",
    description:
      "How to invite team members, manage roles, and control who has access to your organization.",
    role: "shared",
    category: "team",
    icon: "users",
    relatedPages: ["/team", "/portal/team"],
    relatedArticles: [
      "account-settings",
      "managing-investor-access",
      "welcome-founder",
    ],
    keywords: [
      "team",
      "invite",
      "members",
      "roles",
      "permissions",
      "organization",
      "access",
      "collaborate",
    ],
    steps: [
      {
        title: "Open the Team page",
        content:
          "Click \"Team\" in the sidebar. The Team page shows all current members of your organization, their email addresses, roles, and when they joined. As the account owner, you have full control over team membership.",
      },
      {
        title: "Invite a new team member",
        content:
          "Click the invite button or \"Add Member\" action on the Team page. Enter the email address of the person you want to invite. They will receive an email invitation with a link to join your organization. Once they accept and create an account (or log in if they already have one), they appear in your team list.",
        tip: "Invite team members who need to view or contribute data. Each person gets their own login credentials and can access the platform independently.",
        visual: "form-fill-team",
      },
      {
        title: "Understand roles",
        content:
          "Team members share access to the same organization data. The account owner has full administrative privileges including the ability to invite and remove members, manage billing, and delete the account. Invited members can view and interact with data but may have limited administrative capabilities.",
      },
      {
        title: "Remove a team member",
        content:
          "To remove someone from your team, find their entry in the team list and click the remove or delete action. A confirmation dialog will appear before the removal is finalized. Removed members immediately lose access to your organization's data.",
        warning:
          "Removing a team member cannot be undone automatically. You would need to re-invite them if you want to restore their access.",
      },
      {
        title: "Best practices",
        content:
          "Keep your team list current by removing members who no longer need access. Use individual accounts rather than sharing login credentials -- this provides better security and a clear audit trail of who did what. Review your team roster periodically to ensure only the right people have access.",
      },
    ],
  },
];
