import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    user_id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const authResultPromise = requireApiRole(["rider", "driver", "admin"]);
  const { user_id: userId } = await context.params;

  if (!userId?.trim()) {
    return NextResponse.json(
      {
        error: "INVALID_USER_ID",
        message: "user_id es obligatorio.",
      },
      { status: 400 },
    );
  }

  const authResult = await authResultPromise;

  if (!authResult.ok) {
    return authResult.response;
  }

  const creditAccount = await prisma.creditAccount.findUnique({
    where: { userId: userId.trim() },
  });

  return NextResponse.json({
    user_id: userId.trim(),
    available_credit: creditAccount?.balance.toNumber() ?? 0,
    currency: creditAccount?.currency ?? "ARS",
  });
}
