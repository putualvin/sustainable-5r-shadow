import { NextResponse } from "next/server";

import { appConfig } from "@/lib/app-config";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const startedAt = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        database: "connected",
        mode: appConfig.mode,
        responseTimeMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        database: "unavailable",
        mode: appConfig.mode,
        responseTimeMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
