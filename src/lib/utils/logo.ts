/**
 * Get company logo URL
 * Returns the custom uploaded logo or null (UI should show initial letter)
 */
export function getCompanyLogoUrl(
  customLogoUrl: string | null | undefined,
): string | null {
  return customLogoUrl || null;
}
