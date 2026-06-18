"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function fail(message: string, q?: string, page?: string, path = "/driver") {
  const params = new URLSearchParams({ error: message });

  if (q) {
    params.set("q", q);
  }

  if (page) {
    params.set("page", page);
  }

  redirect(`${path}?${params.toString()}`);
}

function getTrimmedValue(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

export async function savePayoutAccountAction(formData: FormData) {
  const authContext = await requirePageRole(["driver"]);
  const q = getTrimmedValue(formData, "q") || undefined;
  const page = getTrimmedValue(formData, "page") || undefined;
  const path = getTrimmedValue(formData, "path") || "/driver";
  const accountReference = getTrimmedValue(formData, "accountReference");
  const alias = getTrimmedValue(formData, "alias");

  if (!accountReference) {
    fail("La referencia de cobro es obligatoria.", q, page, path);
  }

  const existingAccounts = await prisma.payoutAccount.findMany({
    where: { driverUserId: authContext.clerkUserId },
    orderBy: { id: "asc" },
  });

  await prisma.$transaction(async (tx) => {
    if (existingAccounts.length > 0) {
      await tx.payoutAccount.updateMany({
        where: { driverUserId: authContext.clerkUserId },
        data: { status: "INACTIVE" },
      });

      await tx.payoutAccount.update({
        where: { id: existingAccounts[0].id },
        data: {
          provider: "MERCADO_PAGO",
          accountReference,
          alias: alias || null,
          status: "ACTIVE",
        },
      });

      return;
    }

    await tx.payoutAccount.create({
      data: {
        driverUserId: authContext.clerkUserId,
        provider: "MERCADO_PAGO",
        accountReference,
        alias: alias || null,
        status: "ACTIVE",
      },
    });
  });

  revalidatePath("/driver");
  revalidatePath("/driver/account");

  const params = new URLSearchParams({ message: "Cuenta de cobro guardada" });

  if (q) {
    params.set("q", q);
  }

  if (page) {
    params.set("page", page);
  }

  redirect(`${path}?${params.toString()}`);
}

export async function simulateTripSettlementAction(formData: FormData) {
  const authContext = await requirePageRole(["driver"]);
  
  let poolId = getTrimmedValue(formData, "poolId");
  const amountStr = getTrimmedValue(formData, "amount");
  const amount = parseFloat(amountStr) || 15000;

  if (!poolId) {
    poolId = "pool_sim_" + Math.floor(100000 + Math.random() * 900000);
  }

  try {
    // 1. Ensure driver has an active payout account
    let payoutAccount = await prisma.payoutAccount.findFirst({
      where: {
        driverUserId: authContext.clerkUserId,
        status: "ACTIVE",
      },
    });

    if (!payoutAccount) {
      payoutAccount = await prisma.payoutAccount.create({
        data: {
          driverUserId: authContext.clerkUserId,
          provider: "MERCADO_PAGO",
          accountReference: "mp_acc_sim_" + Math.floor(100000 + Math.random() * 900000),
          alias: "driver.simulado.mp",
          status: "ACTIVE",
        },
      });
    }

    // 2. Ensure the pool has at least one PAID charge with finalTripPrice set
    // so settlePool logic can calculate the settlement amount
    const existingCharges = await prisma.charge.findMany({
      where: {
        poolId,
        status: "PAID",
      },
    });

    if (existingCharges.length === 0) {
      await prisma.charge.create({
        data: {
          transactionId: "txn_sim_" + Math.floor(100000 + Math.random() * 900000),
          poolId,
          reservationId: "res_sim_" + Math.floor(100000 + Math.random() * 900000),
          passengerUserId: "rider+clerk_test@iaw.com",
          maxPrice: amount,
          creditApplied: 0,
          amountCharged: amount,
          finalTripPrice: amount,
          creditGranted: 0,
          currency: "ARS",
          status: "PAID",
          provider: "MERCADO_PAGO",
          processedAt: new Date(),
        },
      });
    }

    // 3. Import dynamically or directly and call settlePool
    const { settlePool } = await import("@/lib/payments/settlements");
    const result = await settlePool({
      poolId,
      driverUserId: authContext.clerkUserId,
      completedAt: new Date().toISOString(),
    });

    if (!result.ok) {
      redirect(`/driver?error=${encodeURIComponent(result.message)}`);
    }

    revalidatePath("/driver");
    revalidatePath("/driver/trips");
    revalidatePath("/admin/settlements");
    revalidatePath("/admin");

    redirect("/driver?message=Liquidación%20generada.%20El%20Admin%20ya%20puede%20revisarla.");
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
      throw err; // Next.js redirects are handled using special errors under the hood
    }
    console.error("Simulation error:", err);
    const errMsg = err instanceof Error ? err.message : "Ocurrió un error en la simulación.";
    redirect(`/driver?error=${encodeURIComponent(errMsg)}`);
  }
}
