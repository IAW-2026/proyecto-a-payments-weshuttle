import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    driver_user_id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  // Validate authorization. The client must be driver or admin
  const authResult = await requireApiRole(["driver", "admin"]);

  if (!authResult.ok) {
    return authResult.response;
  }

  // Restrict service accounts exclusively to weshuttle-internal
  if (authResult.context.type === "service" && authResult.context.service !== "weshuttle-internal") {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "Only internal services have access to this resource.",
      },
      { status: 403 }
    );
  }

  const { driver_user_id: driverUserId } = await context.params;

  if (!driverUserId?.trim()) {
    return NextResponse.json(
      {
        error: "INVALID_DRIVER_USER_ID",
        message: "driver_user_id es obligatorio.",
      },
      { status: 400 }
    );
  }

  try {
    // Query database for an active payout account for this driver
    const payoutAccount = await prisma.payoutAccount.findFirst({
      where: {
        driverUserId: driverUserId.trim(),
        status: "ACTIVE",
      },
    });

    if (payoutAccount) {
      return NextResponse.json({
        driver_user_id: driverUserId.trim(),
        has_payout_account: true,
        payout_account_id: payoutAccount.id,
      });
    }

    return NextResponse.json({
      driver_user_id: driverUserId.trim(),
      has_payout_account: false,
      payout_account_id: null,
    });
  } catch (error) {
    console.error(`Error querying payout account for driver ${driverUserId}:`, error);
    return NextResponse.json(
      {
        error: "PAYOUT_ACCOUNT_QUERY_FAILED",
        message: "Error al consultar la base de datos de Payments.",
      },
      { status: 500 }
    );
  }
}
