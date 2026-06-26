import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const authResult = await requireApiRole(["admin"]);

  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const pendingSettlements = await prisma.settlement.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        payoutAccount: true,
      },
      orderBy: {
        id: "desc",
      },
    });

    const mapped = pendingSettlements.map((s) => ({
      id: s.id,
      poolId: s.poolId,
      driverUserId: s.driverUserId,
      amount: s.amount.toNumber(),
      currency: s.currency,
      status: s.status,
      alias: s.payoutAccount?.alias || null,
      cvu: s.payoutAccount?.accountReference || null,
    }));

    return NextResponse.json({
      settlements: mapped,
    });
  } catch (error) {
    console.error("Error fetching pending settlements for tracker:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: "Ocurrió un error al obtener las liquidaciones pendientes.",
      },
      { status: 500 }
    );
  }
}
