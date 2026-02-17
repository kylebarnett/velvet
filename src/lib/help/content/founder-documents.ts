import type { HelpArticle } from "../types";

export const founderDocumentsArticles: HelpArticle[] = [
  {
    slug: "uploading-documents",
    title: "Uploading Documents",
    description:
      "How to upload financial documents, board decks, and other files for your investors.",
    role: "founder",
    category: "documents",
    icon: "file-text",
    relatedPages: ["/portal/documents"],
    relatedArticles: [
      "welcome-founder",
      "managing-investor-access",
      "creating-tear-sheets-founder",
    ],
    keywords: [
      "upload",
      "documents",
      "files",
      "PDF",
      "financials",
      "board deck",
      "pitch deck",
      "size limit",
    ],
    steps: [
      {
        title: "Open the Documents page",
        content:
          "Click \"Documents\" in the sidebar to navigate to the documents page. Here you will see a list of all files you have previously uploaded, along with their type, upload date, and file size.",
      },
      {
        title: "Start an upload",
        content:
          "Click the \"Upload\" button in the top-right corner of the page. A modal dialog will appear where you can select a file from your computer, choose the document type (e.g. Financial Statement, Board Deck, Pitch Deck), and add an optional description.",
      },
      {
        title: "Choose your file",
        content:
          "Select the file you want to upload. Accepted file types include PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, CSV, and TXT. There is a file size limit enforced by the platform, so very large files may need to be compressed first.",
        warning:
          "SVG files are not accepted for security reasons. If you have a vector graphic, export it as PNG or PDF before uploading.",
        visual: "file-upload",
      },
      {
        title: "Select the document type",
        content:
          "Choose a document type from the dropdown in the upload form. Available types include Income Statement, Balance Sheet, Cash Flow Statement, Consolidated Financial Statements, 409A Valuation, Investor Update, Board Deck, Cap Table, and Other. Selecting the right type helps investors find documents quickly when filtering.",
        tip: "Use descriptive document types consistently so investors can filter and find what they need without scrolling through a long list.",
      },
      {
        title: "Upload and confirm",
        content:
          "Click the \"Upload\" or \"Save\" button to start the upload. Once the upload completes, the modal closes and your new document appears in the list. The document is immediately visible to all approved investors.",
      },
      {
        title: "Manage existing documents",
        content:
          "Your uploaded documents appear in a list on the Documents page. You can view documents inline or download them. If you need to replace a document, upload a new version with the same type and name. To remove a document, use the delete action on the document row.",
      },
    ],
  },
];
