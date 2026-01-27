/**
 * Extract domain from a URL string
 */
function extractDomain(url: string): string | null {
  try {
    // Add protocol if missing
    const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(urlWithProtocol);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Get a high-quality logo URL using Clearbit Logo API
 */
export function getLogoUrl(websiteUrl: string | null | undefined): string | null {
  if (!websiteUrl) return null;
  const domain = extractDomain(websiteUrl);
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}`;
}

/**
 * Get a favicon URL using Google's favicon service (fallback)
 */
export function getFaviconUrl(websiteUrl: string | null | undefined): string | null {
  if (!websiteUrl) return null;
  const domain = extractDomain(websiteUrl);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}
