import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.connectionTest.count();

    return NextResponse.json({ ok: true, db: "connected" }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, db: "disconnected" }, { status: 500 });
  }
}
