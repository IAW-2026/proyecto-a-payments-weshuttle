import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import { settlePool } from "@/lib/payments/settlements";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    pool_id: string;
  }>;
};

function isValidDate(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireApiRole(["driver", "admin"]);

  if (!authResult.ok) {
    return authResult.response;
  }

  const { pool_id: poolId } = await context.params;

  if (!poolId?.trim()) {
    return NextResponse.json(
      {
        error: "INVALID_POOL_ID",
        message: "pool_id es obligatorio.",
      },
      { status: 400 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "INVALID_JSON",
        message: "El cuerpo del request debe ser un JSON valido.",
      },
      { status: 400 },
    );
  }

  const driverUserId = typeof (body as { driver_user_id?: unknown }).driver_user_id === "string"
    ? (body as { driver_user_id: string }).driver_user_id.trim()
    : "";
  const completedAt = typeof (body as { completed_at?: unknown }).completed_at === "string"
    ? (body as { completed_at: string }).completed_at
    : null;

  if (!driverUserId || !isValidDate(completedAt)) {
    return NextResponse.json(
      {
        error: "INVALID_BODY",
        message: "driver_user_id y completed_at son obligatorios.",
      },
      { status: 400 },
    );
  }

  const validatedCompletedAt = completedAt as string;

  try {
    const result = await settlePool({
      poolId: poolId.trim(),
      driverUserId,
      completedAt: validatedCompletedAt,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          message: result.message,
        },
        { status: result.status },
      );
    }

    return NextResponse.json({
      pool_id: result.data.poolId,
      settlement_id: result.data.settlementId,
      settlement_status: result.data.settlementStatus,
      driver_user_id: result.data.driverUserId,
      amount: result.data.amount,
      currency: result.data.currency,
    });
  } catch {
    return NextResponse.json(
      {
        error: "SETTLEMENT_INTERNAL_ERROR",
        message: "Ocurrio un error interno al liquidar los fondos.",
      },
      { status: 500 },
    );
  }
}
