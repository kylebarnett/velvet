/**
 * Centralized logger.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.error("Failed to fetch:", error.message);
 *   logger.warn("Rate limit approaching");
 *
 * In development: logs to console.
 * In production: error/warn are forwarded to Sentry. Info/debug are suppressed.
 */

import * as Sentry from "@sentry/nextjs";

const isDev =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_DEBUG === "true";

function noop() {}

function sentryError(...args: unknown[]) {
  const message = args.map(String).join(" ");
  Sentry.captureMessage(message, "error");
}

function sentryWarn(...args: unknown[]) {
  const message = args.map(String).join(" ");
  Sentry.captureMessage(message, "warning");
}

export const logger = {
  error: isDev ? console.error.bind(console) : sentryError,
  warn: isDev ? console.warn.bind(console) : sentryWarn,
  info: isDev ? console.info.bind(console) : noop,
  debug: isDev ? console.debug.bind(console) : noop,
};
