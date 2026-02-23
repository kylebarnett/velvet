import type { HelpArticle } from "../types";

export const sharedChatArticles: HelpArticle[] = [
  {
    slug: "team-chat",
    title: "Using Team Chat",
    description:
      "How to message your team members, create group conversations, share files, and manage your chat experience.",
    role: "shared",
    category: "communication",
    icon: "message-square",
    relatedPages: ["/companies", "/contacts", "/reports", "/documents", "/funds", "/settings"],
    relatedArticles: [
      "real-time-presence",
      "managing-team",
    ],
    keywords: [
      "chat",
      "message",
      "messaging",
      "conversation",
      "direct message",
      "DM",
      "group chat",
      "team chat",
      "file sharing",
      "reactions",
      "emoji",
      "unread",
      "favorites",
    ],
    steps: [
      {
        title: "Open the Messages panel",
        content:
          "Click \"Messages\" in the sidebar to open the chat panel. The panel slides out from the right side of the screen, showing your recent conversations. A badge on the Messages icon shows your total unread message count.",
        visual: "sidebar-navigate",
      },
      {
        title: "Start a new conversation",
        content:
          "Click the + button in the Messages panel header to create a new conversation. Search for team members by name or email, then select one or more people. Selecting a single person opens or resumes a 1:1 direct message. Selecting multiple people creates a group conversation -- you can optionally give it a title.",
        tip: "You can also start a conversation by clicking a teammate's presence avatar and selecting \"Send message\".",
      },
      {
        title: "Send messages",
        content:
          "Type your message in the input at the bottom of the conversation. Press Enter to send, or Shift+Enter to add a new line. Messages appear in real-time for all participants.",
      },
      {
        title: "Share files",
        content:
          "Click the paperclip icon next to the message input to attach a file. Supported file types include images (PNG, JPG, WebP), documents (PDF, Word, Excel), and text files. The maximum file size is 10 MB. Files appear inline in the conversation and can be downloaded by any participant.",
        warning: "SVG files are not allowed for security reasons.",
      },
      {
        title: "React to messages",
        content:
          "Hover over any message to reveal the reaction button. Click it to see the available emoji reactions, then click one to add your reaction. Click an existing reaction to toggle it on or off. Reactions show a count and are visible to all conversation participants.",
      },
      {
        title: "Manage favorites",
        content:
          "In the new conversation modal, click the star icon next to any team member to add them as a favorite. Favorited users appear in a dedicated section at the top of your Messages panel for quick access. Click a favorite to immediately open their direct message.",
      },
      {
        title: "Clear or leave conversations",
        content:
          "Click the overflow menu (three dots) in the conversation header. \"Clear conversation\" hides all previous messages from your view without affecting other participants. In group chats, \"Leave conversation\" removes you from the group. Cleared messages are not deleted -- other participants still see them.",
      },
    ],
  },
];
