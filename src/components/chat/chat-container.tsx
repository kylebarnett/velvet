"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { useChatContext } from "@/contexts/chat-context";
import { ChatListPanel } from "./chat-list-panel";
import { ChatPanel } from "./chat-panel";
import { NewConversationModal } from "./new-conversation-modal";

type ChatContainerProps = {
  orgId: string;
  userId: string;
};

export function ChatContainer({ orgId, userId }: ChatContainerProps) {
  const chat = useChatContext();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !chat.isPanelOpen) return null;

  return createPortal(
    <>
      {/* List or conversation view */}
      {chat.activeConversationId ? (
        <ChatPanel
          conversationId={chat.activeConversationId}
          currentUserId={userId}
          onBack={chat.showConversationList}
          onClose={chat.closePanel}
        />
      ) : (
        <ChatListPanel
          onSelectConversation={chat.openConversation}
          onClose={chat.closePanel}
          onNewConversation={chat.openNewConversation}
        />
      )}

      {/* New conversation modal */}
      {chat.showNewConvoModal && (
        <NewConversationModal
          orgId={orgId}
          onCreated={(id) => {
            chat.closeNewConvoModal();
            chat.openConversation(id);
            chat.refreshConversations();
          }}
          onClose={chat.closeNewConvoModal}
        />
      )}
    </>,
    document.body,
  );
}
