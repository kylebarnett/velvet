/**
 * Centralized logger that suppresses output in production.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.error("Failed to fetch:", error.message);
 *   logger.warn("Rate limit approaching");
 *
 * In production, logs are suppressed unless NEXT_PUBLIC_DEBUG=true.
 * Replace with a proper logging service (Sentry, Datadog) when ready.
 */

const isServer = typeof window === "undefined";
const isDev =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_DEBUG === "true";

function noop() {}

export const logger = {
  error: isDev ? console.error.bind(console) : noop,
  warn: isDev ? console.warn.bind(console) : noop,
  info: isDev ? console.info.bind(console) : noop,
  debug: isDev ? console.debug.bind(console) : noop,
};
