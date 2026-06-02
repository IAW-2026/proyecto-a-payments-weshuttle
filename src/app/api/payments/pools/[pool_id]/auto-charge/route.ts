import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import { startAutoChargeForPool } from "@/lib/payments/auto-charge";

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

  const departureTime =
    typeof (body as { departure_time?: unknown }).departure_time === "string"
      ? (body as { departure_time: string }).departure_time
      : null;
  const currentPassengersValue = (body as { current_passengers?: unknown }).current_passengers;
  const currentPassengers =
    typeof currentPassengersValue === "number" ? currentPassengersValue : null;

  if (
    !isValidDate(departureTime) ||
    currentPassengers === null ||
    !Number.isInteger(currentPassengers) ||
    currentPassengers < 1
  ) {
    return NextResponse.json(
      {
        error: "INVALID_BODY",
        message: "departure_time y current_passengers son obligatorios.",
      },
      { status: 400 },
    );
  }

  const validatedDepartureTime = departureTime as string;

  try {
    const result = await startAutoChargeForPool({
      poolId: poolId.trim(),
      departureTime: validatedDepartureTime,
      currentPassengers,
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

    return NextResponse.json(
      {
        pool_id: result.data.poolId,
        auto_charge_status: result.data.autoChargeStatus,
        message: result.data.message,
      },
      { status: 202 },
    );
  } catch {
    return NextResponse.json(
      {
        error: "AUTO_CHARGE_INTERNAL_ERROR",
        message: "Ocurrio un error interno al iniciar el proceso de cobro.",
      },
      { status: 500 },
    );
  }
}
