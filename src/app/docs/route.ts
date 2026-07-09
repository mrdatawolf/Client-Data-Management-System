import { NextResponse } from "next/server";

/**
 * Interactive API documentation (Swagger UI, self-hosted).
 * The spec (/openapi.json) and viewer assets (/docs-assets/*) are generated
 * by `npm run docs:generate`. This page sits behind the normal login like
 * every other route, so the API docs stay internal.
 */
const DOCS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>API Docs — Client Data Management System</title>
  <link rel="icon" href="/docs-assets/favicon-32x32.png" />
  <link rel="stylesheet" href="/docs-assets/swagger-ui.css" />
  <style>body { margin: 0; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/docs-assets/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: "#swagger-ui",
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout",
        withCredentials: true,
        tryItOutEnabled: true,
        displayRequestDuration: true,
      });
    };
  </script>
</body>
</html>`;

export async function GET() {
  return new NextResponse(DOCS_HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
