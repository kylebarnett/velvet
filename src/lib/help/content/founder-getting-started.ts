import type { HelpArticle } from "../types";

export const founderGettingStartedArticles: HelpArticle[] = [
  {
    slug: "welcome-founder",
    title: "Welcome & First Steps",
    description:
      "An overview of the founder portal and the key steps to get up and running quickly.",
    role: "founder",
    category: "getting-started",
    icon: "sparkles",
    relatedPages: ["/portal"],
    relatedArticles: [
      "setting-up-profile",
      "managing-investor-access",
      "responding-metric-requests",
      "uploading-documents",
    ],
    keywords: [
      "getting started",
      "onboarding",
      "welcome",
      "first steps",
      "setup",
      "founder portal",
    ],
    heroVisual: "sidebar-navigate",
    steps: [
      {
        title: "Complete your company profile",
        content:
          "Navigate to \"Company\" in the sidebar. Under the Dashboard, you will find the Company page where you can update your website, industry, stage, and business model. Upload a company logo so investors can easily identify you. A complete profile builds trust and helps investors understand your business at a glance.",
        tip: "You can return to your profile at any time to update details as your company evolves. Changes are saved automatically as you edit each field.",
      },
      {
        title: "Review investor access requests",
        content:
          "Go to \"Investors\" in the sidebar to see which investors have linked to your company. The investor who originally invited you is auto-approved. Any additional investors will appear as \"Pending\" and require your explicit approval before they can see your data. Click \"Approve\" or \"Deny\" on each investor card.",
        warning:
          "Access is all-or-nothing. Once approved, an investor can see all your submitted metrics and uploaded documents.",
      },
      {
        title: "Submit your first metrics",
        content:
          "Open \"Metric Requests\" in the sidebar. You will see a list of metrics your investors have requested, grouped by period. Click \"Submit\" on a period group to open the batch submission form, enter your values, and save. All approved investors will see the same submitted data.",
        visual: "cursor-click",
      },
      {
        title: "Upload key documents",
        content:
          "Visit the \"Documents\" page and click the \"Upload\" button in the top-right corner. You can upload financial statements, board decks, investor updates, cap tables, and other files. Supported formats include PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, CSV, and TXT. Approved investors will be able to view and download these documents.",
      },
      {
        title: "Explore the dashboard",
        content:
          "Your dashboard is the landing page of the portal. It shows three KPI cards -- Linked Investors, Pending Requests, and Submitted This Quarter -- along with a Getting Started checklist at the bottom. As you complete each step, the checklist updates automatically.",
        tip: "Click any KPI card to jump directly to the relevant page.",
      },
    ],
  },
  {
    slug: "setting-up-profile",
    title: "Setting Up Your Company Profile",
    description:
      "How to complete your company profile so investors have the context they need.",
    role: "founder",
    category: "getting-started",
    icon: "building-2",
    relatedPages: ["/portal/company", "/portal"],
    relatedArticles: [
      "welcome-founder",
      "managing-investor-access",
      "creating-tear-sheets-founder",
    ],
    keywords: [
      "profile",
      "company",
      "setup",
      "logo",
      "website",
      "industry",
      "stage",
      "description",
    ],
    steps: [
      {
        title: "Open the Company page",
        content:
          "Click \"Company\" under your company name in the left sidebar. This opens the company profile page where you can view and update all company details.",
      },
      {
        title: "Fill in basic information",
        content:
          "Enter your company name, website URL, and a short description. Select your industry from the dropdown (e.g. SaaS, Fintech, Healthcare) and choose your current stage (e.g. Seed, Series A, Series B). Pick your business model if applicable.",
        tip: "The industry and stage fields are used to match your company with relevant benchmarks. Filling them in accurately improves the reports your investors see.",
        visual: "form-fill",
      },
      {
        title: "Upload a company logo",
        content:
          "Click the logo area to upload an image. Accepted formats are PNG, JPG, and WebP. The logo appears on your dashboard header, tear sheets, and anywhere investors see your company in their portfolio.",
        warning:
          "SVG files are not allowed for security reasons. Use PNG or JPG instead.",
      },
      {
        title: "Add optional details",
        content:
          "You can also fill in your founding date, HQ location, headcount, total funding raised, last round amount, and last round date. These fields are optional but give investors a more complete picture of your company.",
      },
      {
        title: "Changes save automatically",
        content:
          "Your profile uses inline editing -- changes are saved automatically as you update each field. A \"Changes saved\" notification confirms each update. Your profile updates are immediately visible to all approved investors.",
      },
    ],
  },
];
