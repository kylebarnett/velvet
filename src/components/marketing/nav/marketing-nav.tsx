"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { MobileMenu } from "./mobile-menu";

const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/for-investors", label: "For Investors" },
  { href: "/for-founders", label: "For Founders" },
];

export function MarketingNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 10);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleOpenMobileMenu = useCallback(() => {
    setMobileMenuOpen(true);
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 transition-all duration-200",
          scrolled
            ? "border-b border-border-default bg-bg-primary/95 backdrop-blur-sm"
            : "border-b border-transparent bg-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-text-primary"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-btn-primary-bg text-btn-primary-text text-sm font-bold">
              V
            </span>
            <span className="text-lg font-semibold">Velvet</span>
          </Link>

          {/* Center nav links — hidden on mobile */}
          <nav className="hidden md:flex md:items-center md:gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "text-text-primary"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-text-primary" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side — hidden on mobile */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="rounded-md px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              Log in
            </Link>
            <Link href="/signup">
              <Button variant="primary" size="sm">
                Sign up
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleOpenMobileMenu}
            className="md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && <MobileMenu onClose={handleCloseMobileMenu} />}
      </AnimatePresence>
    </>
  );
}
