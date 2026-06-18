"use server";

import { revalidatePath } from "next/cache";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function markSettlementCompletedAction(settlementId: string) {
  // Ensure the user is authenticated as admin
  await requirePageRole(["admin"]);

  if (!settlementId) {
    throw new Error("ID de liquidación no proporcionado.");
  }

  await prisma.settlement.update({
    where: { id: settlementId },
    data: {
      status: "COMPLETED",
      settledAt: new Date(),
    },
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

  await prisma.settlement.update({
    where: { id: settlementId },
    data: {
      status: "FAILED",
      settledAt: null,
    },
  });

  revalidatePath("/admin/settlements");
  revalidatePath("/admin");
  revalidatePath("/driver/trips");
  revalidatePath("/driver");
}
