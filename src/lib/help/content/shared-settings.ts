import type { HelpArticle } from "../types";

export const sharedSettingsArticles: HelpArticle[] = [
  {
    slug: "account-settings-page",
    title: "Account Settings",
    description:
      "How to update your profile, change your email or password, customize your theme, and delete your account from the Settings page.",
    role: "shared",
    category: "team",
    icon: "settings",
    relatedPages: ["/settings", "/portal/settings"],
    relatedArticles: ["account-settings"],
    keywords: [
      "settings",
      "account",
      "profile",
      "profile picture",
      "avatar",
      "display name",
      "email",
      "change email",
      "password",
      "change password",
      "theme",
      "appearance",
      "dark mode",
      "light mode",
      "delete account",
      "remove account",
    ],
    steps: [
      {
        title: "Upload or change your profile picture",
        content:
          "In the Profile section of the Settings page, click the camera icon on your avatar to upload a new profile picture. Only PNG, JPG, and WebP images are accepted. Your profile picture appears in the sidebar and anywhere your name is displayed across the platform.",
        visual: "file-upload",
        tip: "Use a square image for the best results. The image will be cropped to a circle.",
      },
      {
        title: "Edit your display name",
        content:
          "Click the edit icon next to your name in the Profile section to change your display name. Enter a new name and confirm to save. This name is shown to other users across the platform, including in investor/founder interactions.",
        visual: "form-fill",
      },
      {
        title: "Change your email address",
        content:
          "In the Email section, enter your new email address and click the update button. A confirmation email will be sent to the new address. You must verify the new email before the change takes effect. Your old email remains active until verification is complete.",
        visual: "form-fill",
        tip: "Make sure you have access to the new email address before starting the change, as you will need to click a verification link.",
      },
      {
        title: "Change your password",
        content:
          "In the Password section, enter your new password and confirm it by typing it again. Passwords must meet the minimum security requirements. Click the update button to save your new password. You will remain logged in after the change.",
        visual: "form-fill",
        warning:
          "Choose a strong, unique password that you do not use for other services. If you forget your password, you can reset it from the login page.",
      },
      {
        title: "Customize your theme and appearance",
        content:
          "The Appearance section lets you switch between light mode, dark mode, or match your system preference. Select your preferred theme and the change applies immediately. Your preference is saved to your account, so it syncs across all devices where you are logged in.",
        tip: "The default theme is dark mode. If you select the system option, Velvet will automatically follow your operating system's light or dark setting.",
      },
      {
        title: "Delete your account",
        content:
          "At the bottom of the Settings page, the Danger Zone section contains the option to permanently delete your account. Click the delete button and confirm in the dialog that appears. This action removes all your data, including submissions, documents, and organization membership.",
        warning:
          "Account deletion is permanent and cannot be undone. All your data, metric submissions, documents, and team associations will be permanently removed. Export anything you need before proceeding.",
      },
    ],
  },
];
