/**
 * Next.js startup hook: runs the data-source precheck before the first
 * request is served. The same manifest is available from GET /api/health.
 *
 * This file is bundled for every runtime (nodejs + edge), so it must stay
 * free of Node APIs — all Node-specific work lives in startup-report.ts,
 * reached only through the dynamic import inside the nodejs guard.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { logDataSourceReport } = await import("@/lib/data/startup-report");
  await logDataSourceReport();
}
