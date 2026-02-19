import type { HelpArticle } from "../types";

export const investorDocumentsArticles: HelpArticle[] = [
  {
    slug: "browsing-documents-investor",
    title: "Browsing & Downloading Documents",
    description:
      "Browse documents uploaded by your portfolio founders, filter by type, and download files for offline review.",
    role: "investor",
    category: "documents",
    icon: "file-text",
    relatedPages: ["/documents"],
    relatedArticles: [
      "viewing-company-detail",
      "company-cards-approval",
      "viewing-founder-tear-sheets",
    ],
    keywords: [
      "documents",
      "browse",
      "download",
      "files",
      "filter",
      "pitch deck",
      "financials",
      "board materials",
    ],
    steps: [
      {
        title: "Navigate to Documents",
        content:
          'Click "Documents" in the sidebar to open the documents page. This central hub shows all documents shared by founders across your portfolio companies.',
      },
      {
        title: "Browse available documents",
        content:
          "Documents are listed with the company name, document title, type (e.g., Income Statement, Balance Sheet, Board Deck, Investor Update, Cap Table), upload date, and file size. The most recently uploaded documents appear first by default.",
        tip: "Only documents from companies where you have approved access will appear. If you expect to see a document but it is missing, check that the founder has approved your access on the Companies page.",
        visual: "table-populate-documents",
      },
      {
        title: "Filter by document type",
        content:
          "Use the type filter dropdown to narrow the list to a specific category such as Income Statements, Board Decks, Cap Tables, or 409A Valuations. This is helpful when you are looking for a specific kind of document across multiple companies.",
      },
      {
        title: "Search for documents",
        content:
          "Use the search bar to find documents by filename. This is the fastest way to locate a specific file when you know what you are looking for.",
      },
      {
        title: "Download documents",
        content:
          "Click on a document to preview it in a modal, or use the download button to save the file to your computer. Supported file types include PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, CSV, and TXT.",
        warning:
          "Documents are confidential founder data. Handle downloaded files according to your organization's data handling policies and any agreements with the founder.",
      },
    ],
  },
];
