"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/for-investors", label: "For Investors" },
  { href: "/for-founders", label: "For Founders" },
];

interface MobileMenuProps {
  onClose: () => void;
}

export function MobileMenu({ onClose }: MobileMenuProps) {
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Auto-focus close button on mount
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Close on route change
  const prevPathname = useRef(pathname);
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      onClose();
    }
    prevPathname.current = pathname;
  }, [pathname, onClose]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Focus trap
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableElements = menuRef.current?.querySelectorAll<HTMLElement>(
        'a, button, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements || focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    []
  );

  return (
    <motion.div
      ref={menuRef}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      className="fixed inset-0 z-50 flex flex-col bg-bg-primary"
      initial={prefersReducedMotion ? { opacity: 0 } : { x: "100%" }}
      animate={prefersReducedMotion ? { opacity: 1 } : { x: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-2 text-text-primary"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-btn-primary-bg text-btn-primary-text text-sm font-bold">
            V
          </span>
          <span className="text-lg font-semibold">Velvet</span>
        </Link>
        <button
          ref={closeRef}
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          aria-label="Close menu"
          type="button"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex flex-1 flex-col px-6 pt-4">
        <ul className="space-y-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onClose}
                  className={cn(
                    "block rounded-lg px-4 py-3 text-base font-medium transition-colors",
                    isActive
                      ? "bg-bg-elevated text-text-primary"
                      : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Divider */}
        <div className="my-6 border-t border-border-default" />

        {/* Auth links */}
        <div className="space-y-3">
          <Link href="/login" onClick={onClose} className="block">
            <Button variant="secondary" className="w-full" size="lg">
              Log in
            </Button>
          </Link>
          <Link href="/signup" onClick={onClose} className="block">
            <Button variant="primary" className="w-full" size="lg">
              Sign up
            </Button>
          </Link>
        </div>

        {/* Theme toggle at bottom */}
        <div className="mt-auto pb-8 pt-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </motion.div>
  );
}
