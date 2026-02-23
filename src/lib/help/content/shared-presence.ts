import type { HelpArticle } from "../types";

export const sharedPresenceArticles: HelpArticle[] = [
  {
    slug: "real-time-presence",
    title: "Real-Time Presence",
    description:
      "See which team members are viewing the same page as you and quickly start conversations from presence avatars.",
    role: "shared",
    category: "communication",
    icon: "users",
    relatedPages: ["/companies", "/contacts", "/reports", "/documents", "/funds", "/settings"],
    relatedArticles: [
      "team-chat",
      "managing-team",
    ],
    keywords: [
      "presence",
      "online",
      "who's online",
      "avatars",
      "team",
      "real-time",
      "live",
      "viewing",
      "collaboration",
    ],
    steps: [
      {
        title: "See who's on the same page",
        content:
          "When other team members are viewing the same page as you, their avatars appear in a bar at the top of the main content area. Each avatar shows a green dot indicating the person is currently online. Up to five avatars are displayed; if more people are present, a \"+N\" indicator shows the additional count.",
      },
      {
        title: "View teammate details",
        content:
          "Hover over a presence avatar to see the person's name in a tooltip. Click the avatar to see a popover with their full name, email address, and a \"Send message\" button to quickly start a direct conversation.",
      },
      {
        title: "Start a conversation from presence",
        content:
          "Click \"Send message\" in a presence avatar's popover to immediately open a direct message with that teammate. If you already have an existing 1:1 conversation, it resumes that conversation. Otherwise, a new one is created automatically.",
        tip: "This is the fastest way to collaborate with someone who's looking at the same data as you.",
      },
      {
        title: "Organization-wide online status",
        content:
          "The chat system also tracks which team members are online across your entire organization, not just on the same page. Online teammates show a green indicator dot next to their name in the chat panel and new conversation modal.",
      },
    ],
  },
];
