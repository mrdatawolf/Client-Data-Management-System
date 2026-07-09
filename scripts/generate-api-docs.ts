#!/usr/bin/env tsx

/**
 * Generate API documentation.
 *
 * Compiles the @swagger JSDoc annotations in src/app/api into an OpenAPI 3
 * spec at public/openapi.json, and copies the self-hosted Swagger UI assets
 * into public/docs-assets/. Runs as part of `npm run build` (docs:generate)
 * so production builds ship current docs — the interactive viewer lives
 * at /docs (behind login).
 */

import * as fs from "fs";
import * as path from "path";
import { createSwaggerSpec } from "next-swagger-doc";

const ROOT = path.join(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

function getVersion(): string {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  return pkg.version;
}

function generateSpec() {
  const spec = createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.0.3",
      info: {
        title: "Client Data Management System API",
        version: getVersion(),
        description:
          "Internal API for client IT infrastructure data. " +
          "All endpoints require the httpOnly `session` cookie issued by `POST /api/auth/login` " +
          "unless marked otherwise (or the server runs with DISABLE_AUTH=true).",
      },
      components: {
        securitySchemes: {
          sessionCookie: {
            type: "apiKey",
            in: "cookie",
            name: "session",
            description: "Signed JWT set by POST /api/auth/login",
          },
        },
        schemas: {
          User: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              username: { type: "string" },
              email: { type: "string", nullable: true },
              role: { type: "string", enum: ["admin", "user"] },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          Company: {
            type: "object",
            description:
              "A row from companies.xlsx. Extra columns are passed through as-is.",
            properties: {
              "Company Name": { type: "string" },
              Abbrv: { type: "string" },
              Group: { type: "string" },
              Status: {
                type: "integer",
                description: "0=Good, 1=Billing Issue, 2=Must Contact Office",
              },
            },
            additionalProperties: true,
          },
        },
      },
      security: [{ sessionCookie: [] }],
    },
  });

  const outFile = path.join(PUBLIC_DIR, "openapi.json");
  fs.writeFileSync(outFile, JSON.stringify(spec, null, 2));

  const pathCount = Object.keys((spec as any).paths || {}).length;
  if (pathCount === 0) {
    console.error("✗ No annotated API paths found — check the @swagger JSDoc blocks");
    process.exit(1);
  }
  console.log(`✓ Wrote ${path.relative(ROOT, outFile)} (${pathCount} paths)`);
}

function copySwaggerUiAssets() {
  const srcDir = path.join(ROOT, "node_modules", "swagger-ui-dist");
  const destDir = path.join(PUBLIC_DIR, "docs-assets");
  const assets = [
    "swagger-ui.css",
    "swagger-ui-bundle.js",
    "favicon-32x32.png",
  ];

  fs.mkdirSync(destDir, { recursive: true });
  for (const asset of assets) {
    fs.copyFileSync(path.join(srcDir, asset), path.join(destDir, asset));
  }
  console.log(`✓ Copied Swagger UI assets to public/docs-assets/`);
}

generateSpec();
copySwaggerUiAssets();
console.log("✓ API docs generated — view at /docs when the server is running");
