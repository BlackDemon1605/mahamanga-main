/**
 * Returns the canonical site origin for redirects.
 * In production (Netlify), uses the configured VITE_SITE_URL or the Netlify URL.
 * Falls back to window.location.origin for local dev.
 */
export function getSiteUrl(): string {
  // Allow override via env var (set VITE_SITE_URL in Netlify env vars)
  if (import.meta.env.VITE_SITE_URL) {
    return import.meta.env.VITE_SITE_URL.replace(/\/$/, '');
  }
  // Auto-detect Netlify deploy URL
  if (typeof window !== 'undefined' && window.location.origin.includes('netlify.app')) {
    return window.location.origin;
  }
  // Hardcoded fallback for your production site
  return 'https://mahamanga22154.netlify.app';
}
