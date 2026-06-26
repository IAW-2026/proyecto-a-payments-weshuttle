"use server";

import { revalidatePath } from "next/cache";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logNotification } from "@/lib/notifications";

export async function markSettlementCompletedAction(settlementId: string) {
  // Ensure the user is authenticated as admin
  await requirePageRole(["admin"]);

  if (!settlementId) {
    throw new Error("ID de liquidación no proporcionado.");
  }

  const settlement = await prisma.settlement.update({
    where: { id: settlementId },
    data: {
      status: "COMPLETED",
      settledAt: new Date(),
    },
  });

  await logNotification({
    type: "SETTLEMENT_PAID",
    title: "Liquidación Pagada",
    message: `La liquidación del pool ${settlement.poolId} por $${settlement.amount.toString()} fue marcada como completada.`,
    userId: settlement.driverUserId,
    role: "DRIVER",
  });

  revalidatePath("/admin/settlements");
  revalidatePath("/admin");
  revalidatePath("/driver/trips");
  revalidatePath("/driver");
}

export async function markSettlementFailedAction(settlementId: string) {
  // Ensure the user is authenticated as admin
  await requirePageRole(["admin"]);

  if (!settlementId) {
    throw new Error("ID de liquidación no proporcionado.");
  }

  const settlement = await prisma.settlement.update({
    where: { id: settlementId },
    data: {
      status: "FAILED",
      settledAt: null,
    },
  });

  await logNotification({
    type: "SETTLEMENT_FAILED",
    title: "Liquidación Fallida",
    message: `La liquidación del pool ${settlement.poolId} por $${settlement.amount.toString()} falló o fue rechazada.`,
    userId: settlement.driverUserId,
    role: "DRIVER",
  });

  revalidatePath("/admin/settlements");
  revalidatePath("/admin");
  revalidatePath("/driver/trips");
  revalidatePath("/driver");
}
