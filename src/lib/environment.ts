/**
 * Detect whether the app is running on the published production site
 * vs. the Lovable sandbox/preview.
 */
const PRODUCTION_HOSTS = [
  'atlastools.lovable.app',
  // Add custom domains here as they're configured
];

export function isProduction(): boolean {
  return PRODUCTION_HOSTS.includes(window.location.hostname);
}

export function isSandbox(): boolean {
  return !isProduction();
}
