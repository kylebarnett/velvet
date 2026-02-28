import type { HelpArticle } from "../types";

export const sharedAccountArticles: HelpArticle[] = [
  {
    slug: "account-settings",
    title: "Account Settings & Preferences",
    description:
      "How to manage your theme and account settings.",
    role: "shared",
    category: "team",
    icon: "settings",
    relatedPages: ["/team", "/portal/team"],
    relatedArticles: ["managing-team", "welcome-founder"],
    keywords: [
      "account",
      "settings",
      "preferences",
      "theme",
      "dark mode",
      "light mode",
      "profile",
    ],
    steps: [
      {
        title: "Access your settings",
        content:
          "Click the settings gear icon in the sidebar footer to open the settings panel. Here you can switch themes, access Import Data, manage your team, and find help resources.",
      },
      {
        title: "Switch between light and dark mode",
        content:
          "PostSig supports both light and dark themes. Use the theme toggle in the sidebar settings panel to switch between modes. Your preference is saved to your account (not just your browser), so it follows you across devices. The default theme is dark mode.",
        tip: "The theme preference syncs across all devices where you are logged in. Change it once and it applies everywhere.",
      },
      {
        title: "Manage your team",
        content:
          "Navigate to the Team page via the sidebar to view and manage team members in your organization. You can invite new members or update roles from this page.",
      },
      {
        title: "Account security",
        content:
          "Your account is secured through Supabase Auth. To change your password, use the password reset flow from the login page. For account deletion, contact your organization owner or use the delete account option in settings. Deletion is permanent and removes all your data.",
        warning:
          "Account deletion is irreversible. All your data, submissions, and documents will be permanently removed. Make sure to export anything you need before proceeding.",
      },
    ],
  },
];
