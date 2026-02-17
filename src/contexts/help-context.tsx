"use client";

import * as React from "react";
import { HelpPanel } from "@/components/help/help-panel";

type HelpContextValue = {
  openHelp: () => void;
  closeHelp: () => void;
  openArticle: (slug: string) => void;
  isOpen: boolean;
};

const HelpContext = React.createContext<HelpContextValue | null>(null);

export function useHelp() {
  const context = React.useContext(HelpContext);
  if (!context) {
    throw new Error("useHelp must be used within HelpProvider");
  }
  return context;
}

export function HelpProvider({
  children,
  role,
}: {
  children: React.ReactNode;
  role: "investor" | "founder";
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [articleSlug, setArticleSlug] = React.useState<string | undefined>();

  const openHelp = React.useCallback(() => {
    setArticleSlug(undefined);
    setIsOpen(true);
  }, []);

  const closeHelp = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const openArticle = React.useCallback((slug: string) => {
    setArticleSlug(slug);
    setIsOpen(true);
  }, []);

  const value = React.useMemo(
    () => ({ openHelp, closeHelp, openArticle, isOpen }),
    [openHelp, closeHelp, openArticle, isOpen],
  );

  return (
    <HelpContext.Provider value={value}>
      {children}
      <HelpPanel
        open={isOpen}
        onClose={closeHelp}
        role={role}
        initialArticle={articleSlug}
      />
    </HelpContext.Provider>
  );
}
