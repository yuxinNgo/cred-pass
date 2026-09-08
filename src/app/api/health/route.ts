import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { database } from "@/services/database/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { await database().execute(sql`select 1`); return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
