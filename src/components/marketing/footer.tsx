import Link from "next/link";

const PRODUCT_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/for-investors", label: "For Investors" },
  { href: "/for-founders", label: "For Founders" },
];

const ACCOUNT_LINKS = [
  { href: "/login", label: "Log in" },
  { href: "/signup", label: "Sign up" },
];

export function Footer() {
  return (
    <footer className="border-t border-border-default bg-bg-primary">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 text-text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-btn-primary-bg text-btn-primary-text text-sm font-bold">
                V
              </span>
              <span className="text-lg font-semibold">Velvet</span>
            </div>
            <p className="mt-3 text-sm text-text-secondary">
              Portfolio metrics, connected.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Product
            </h3>
            <ul className="mt-3 space-y-2">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Account
            </h3>
            <ul className="mt-3 space-y-2">
              {ACCOUNT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright bar */}
      <div className="border-t border-border-default">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="text-xs text-text-muted">
            &copy; 2026 Velvet. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
