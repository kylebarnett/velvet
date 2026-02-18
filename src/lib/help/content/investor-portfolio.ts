import type { HelpArticle } from "../types";

export const investorPortfolioArticles: HelpArticle[] = [
  {
    slug: "importing-companies-csv",
    title: "Importing Companies via CSV",
    description:
      "Import multiple portfolio companies at once using a CSV file. Learn the required format, how to handle duplicates, and what happens after upload.",
    role: "investor",
    category: "portfolio",
    icon: "upload",
    relatedPages: ["/companies"],
    relatedArticles: [
      "adding-contacts",
      "company-cards-approval",
      "welcome-investor",
    ],
    keywords: [
      "import",
      "CSV",
      "upload",
      "bulk",
      "companies",
      "portfolio",
      "spreadsheet",
      "template",
    ],
    steps: [
      {
        title: "Open the Contacts page",
        content:
          'Navigate to Contacts in the sidebar under Portfolio. This is where you manage contacts and import companies via CSV.',
      },
      {
        title: "Click Import CSV",
        content:
          'Click the "Import CSV" button on the Contacts page. This takes you to the Import Portfolio Contacts page.',
      },
      {
        title: "Download the CSV template",
        content:
          "Before uploading, download the CSV template. The required columns are: Company Name, First Name, Last Name, and Email. Optional columns include Position and Company Website. Fill in one row per contact.",
        tip: "Column names are flexible (e.g. \"Company Name\", \"company_name\", or \"companyName\" all work). Velvet deduplicates companies by founder email, so if another investor has already added a company with the same founder email, the existing company record will be linked to your portfolio.",
      },
      {
        title: "Upload your completed CSV",
        content:
          "Drag and drop your filled CSV file into the upload area, or click to browse your files. Velvet will validate the data and show a preview of the contacts to be imported along with any errors or warnings.",
        warning:
          "Each row must have a valid email address. Rows with missing or invalid emails will be skipped.",
        visual: "csv-import",
      },
      {
        title: "Confirm and import",
        content:
          "Review the preview to make sure everything looks correct. Confirm the import to proceed. Velvet will create the company records and send invitation emails to founders who do not yet have Velvet accounts.",
      },
      {
        title: "Check import results",
        content:
          "After import, you will see a summary showing how many contacts and companies were created, how many were linked to existing records, and how many had errors. New companies will appear on your Companies page with a \"Pending approval\" status until founders accept your invitation.",
      },
    ],
  },
  {
    slug: "adding-contacts",
    title: "Adding Contacts Individually",
    description:
      "Add individual contacts and companies to your portfolio one at a time, ideal for adding a single new investment.",
    role: "investor",
    category: "portfolio",
    icon: "user-plus",
    relatedPages: ["/contacts"],
    relatedArticles: [
      "importing-companies-csv",
      "company-cards-approval",
      "viewing-company-detail",
    ],
    keywords: [
      "add",
      "contact",
      "individual",
      "single",
      "company",
      "founder",
      "email",
      "invite",
    ],
    steps: [
      {
        title: "Go to Contacts",
        content:
          "Click Contacts in the sidebar to open the contacts management page. Here you can view, add, and manage individual people associated with your portfolio companies.",
      },
      {
        title: "Click Add Contact",
        content:
          'Click the "Add Contact" button. A form will appear asking for the contact\'s name, email address, company name, and optionally their role or title.',
        visual: "form-fill",
      },
      {
        title: "Fill in the contact details",
        content:
          "Enter the founder or contact's full name and email address. If the company does not already exist in your portfolio, Velvet will create it automatically. If the company already exists (matched by founder email), the contact will be linked to the existing record.",
        tip: "You can add multiple contacts for the same company. Only the primary founder email is used for deduplication.",
      },
      {
        title: "Send the invitation",
        content:
          "After saving the contact, Velvet will send an invitation email to the founder if they do not already have a Velvet account. The email explains who you are and invites them to sign up and connect with your organization.",
      },
      {
        title: "Track the contact status",
        content:
          "The contact will appear in your list with a status indicator. You can see whether they have signed up, whether they have approved your access, and their last activity date.",
      },
    ],
  },
  {
    slug: "company-cards-approval",
    title: "Understanding Company Cards & Approval",
    description:
      "Learn what the different approval statuses mean on company cards and how the founder approval flow works.",
    role: "investor",
    category: "portfolio",
    icon: "shield-check",
    relatedPages: ["/companies"],
    relatedArticles: [
      "importing-companies-csv",
      "viewing-company-detail",
      "creating-metric-requests",
    ],
    keywords: [
      "approval",
      "status",
      "pending",
      "approved",
      "denied",
      "access",
      "company card",
      "permission",
    ],
    heroVisual: "approval-flow",
    steps: [
      {
        title: "Understand the approval model",
        content:
          "Velvet uses a founder-controlled access model. When you import a company, the founder must approve your access before you can see their submitted metrics and documents. This ensures founders have full control over who sees their data.",
        tip: "If a founder signed up through your invitation link, your access is automatically approved. Other investors requesting access to the same company start as pending.",
      },
      {
        title: "Identify approval statuses on company cards",
        content:
          'Each company card on the Companies page shows a status badge. "Approved" (green) means the founder has granted you access to their data. "Pending approval" (amber) means the founder has not yet responded. "Access denied" (red) means the founder has explicitly denied your access request.',
      },
      {
        title: "What you can do with each status",
        content:
          'When approved, you can view all metrics, documents, and reports for the company. When pending, you can see basic company information but not submitted data. When denied, the company card shows limited information with an "Access denied" message.',
        warning:
          "You cannot send metric requests to companies that have denied your access. Reach out to the founder directly if you believe this was a mistake.",
      },
      {
        title: "Monitor approval changes",
        content:
          "When a founder changes their approval decision, the company card status updates automatically on the Companies page. Check back periodically to see if pending approvals have been resolved.",
      },
    ],
  },
  {
    slug: "viewing-company-detail",
    title: "Viewing Company Detail & Metrics",
    description:
      "Drill into a specific company to see their submitted metrics, uploaded documents, historical trends, and more.",
    role: "investor",
    category: "portfolio",
    icon: "building-2",
    relatedPages: ["/companies/"],
    relatedArticles: [
      "company-cards-approval",
      "batch-submission-table",
      "browsing-documents-investor",
    ],
    keywords: [
      "company",
      "detail",
      "metrics",
      "documents",
      "history",
      "trends",
      "drill down",
      "view",
    ],
    steps: [
      {
        title: "Click on a company card",
        content:
          "From the Companies page, click on any company card to open its detail view. The detail page shows comprehensive information about the company including its profile, metrics, and documents.",
      },
      {
        title: "Review the company profile",
        content:
          "At the top of the detail page you will see the company name, logo (if uploaded by the founder), industry, stage, and your approval status badge. Breadcrumbs at the top let you navigate back to the Companies list.",
      },
      {
        title: "Browse submitted metrics",
        content:
          "The company detail page has two tabs: Metrics and Documents. The Metrics tab shows all values the founder has submitted, organized by period. Charts visualize trends over time when enough data points are available.",
        tip: "If you have uploaded historical data for this company, both founder-submitted and your investor-uploaded values will appear. Founder values take priority when both exist for the same period.",
        visual: "table-populate",
      },
      {
        title: "View uploaded documents",
        content:
          "Switch to the Documents tab to see files the founder has shared, such as board decks, financial statements, and investor updates. You can browse documents and download any file directly.",
      },
    ],
  },
  {
    slug: "inline-add-metrics",
    title: "Adding Metrics Inline",
    description:
      "Add metrics directly within the company metrics table using the inline editor. Includes smart similarity detection to prevent duplicate metrics.",
    role: "investor",
    category: "portfolio",
    icon: "plus-circle",
    relatedPages: ["/companies/"],
    relatedArticles: [
      "viewing-company-detail",
      "creating-metric-requests",
      "importing-historical-data",
    ],
    keywords: [
      "add",
      "metric",
      "inline",
      "table",
      "duplicate",
      "similar",
      "synonym",
      "manual",
      "enter",
      "value",
    ],
    steps: [
      {
        title: "Open a company detail page",
        content:
          "Navigate to a company in your portfolio and open its detail page. The Metrics tab shows the metrics table with all submitted and uploaded data.",
      },
      {
        title: "Click + Add Metric",
        content:
          'Below the last row of the metrics table, click the "+ Add Metric" button. A new inline row will appear at the bottom of the table with a search input for the metric name and empty cells for each period.',
      },
      {
        title: "Search and select a metric name",
        content:
          "Type in the metric name search box to filter from the list of predefined metrics. You can also type a custom name and select \"Add custom\" to create a new metric. The dropdown shows similarity warnings to help you avoid duplicates.",
        tip: "Metrics already tracked for this company are shown grayed out with an \"Already tracked\" badge. Synonyms (e.g. \"Net Burn Rate\" when \"Burn Rate\" exists) show an amber warning. Fuzzy matches show a lighter warning.",
      },
      {
        title: "Enter values for each period",
        content:
          "After selecting a metric name, focus automatically moves to the most recent period cell. Enter numeric values for each period. Use Tab or Arrow keys to navigate between cells. Placeholder hints show the expected format (e.g. currency vs percentage).",
      },
      {
        title: "Save your entries",
        content:
          "Click the checkmark button or press Cmd+Enter (Ctrl+Enter on Windows) to save. The new metric row will appear in the table. Press Escape or the X button to cancel without saving.",
        warning:
          "These values are stored as investor-private data. Founder-submitted values always take priority when both exist for the same metric and period.",
      },
    ],
  },
];
