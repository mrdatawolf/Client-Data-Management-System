/**
 * Identity of the break-glass fallback admin (FALLBACK_ADMIN_USERNAME /
 * FALLBACK_ADMIN_PASSWORD). Kept free of database and bcrypt imports so the
 * proxy can use it.
 */

export const FALLBACK_ADMIN_ID = "fallback-admin-001";

/** True when both fallback admin variables are set. */
export function isFallbackAdminConfigured(): boolean {
  return Boolean(
    process.env.FALLBACK_ADMIN_USERNAME && process.env.FALLBACK_ADMIN_PASSWORD
  );
}
