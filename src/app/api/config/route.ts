import { NextResponse } from "next/server";
import { isFallbackAdminConfigured } from "@/lib/auth/fallback-admin";
import { getOrchestratorLoginUrl } from "@/lib/auth/orchestrator";
import { version } from "../../../../package.json";

/**
 * @swagger
 * /api/config:
 *   get:
 *     tags: [System]
 *     summary: Get runtime configuration
 *     security: []
 *     responses:
 *       200:
 *         description: Public runtime configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authDisabled: { type: boolean, description: True when DISABLE_AUTH=true on the server }
 *                 fallbackAdminEnabled: { type: boolean, description: Whether emergency admin sign-in is configured }
 *                 orchestratorLoginUrl: { type: string, nullable: true, description: Configured BT Auth sign-in URL or null when configuration is invalid }
 *                 appName: { type: string }
 *                 version: { type: string, description: App version from package.json, example: 1.0.9 }
 */
export async function GET() {
  return NextResponse.json({
    authDisabled: process.env.DISABLE_AUTH === "true",
    fallbackAdminEnabled: isFallbackAdminConfigured(),
    orchestratorLoginUrl: getOrchestratorLoginUrl(),
    appName: process.env.NEXT_PUBLIC_APP_NAME || "Client Data Management",
    version,
  });
}
