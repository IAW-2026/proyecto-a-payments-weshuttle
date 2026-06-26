"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logNotification } from "@/lib/notifications";

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

export async function savePayoutAccountActionClient({
  cbuCvu,
  alias,
}: {
  cbuCvu: string;
  alias: string;
}) {
  const authContext = await requirePageRole(["driver"]);

  let accountReference = "";
  let dbAlias: string | null = null;

  if (cbuCvu && alias) {
    accountReference = cbuCvu;
    dbAlias = alias;
  } else if (cbuCvu) {
    accountReference = cbuCvu;
    dbAlias = null;
  } else if (alias) {
    accountReference = alias;
    dbAlias = alias;
  } else {
    return { ok: false, error: "Debes proporcionar un CBU/CVU o un alias." };
  }

  try {
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
            alias: dbAlias,
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
          alias: dbAlias,
          status: "ACTIVE",
        },
      });
    });

    await logNotification({
      type: "METHOD_SAVED",
      title: "Método de Cobro Registrado",
      message: `El conductor configuró su método de cobro: ${alias || cbuCvu}.`,
      userId: authContext.clerkUserId,
      role: "DRIVER",
    });

    revalidatePath("/driver");
    revalidatePath("/driver/account");

    return { ok: true, message: "Datos de cobro guardados correctamente." };
  } catch (err: unknown) {
    console.error("Failed to save payout account:", err);
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return { ok: false, error: "El CBU/CVU o alias ingresado ya está registrado por otro conductor." };
    }
    return { ok: false, error: "Error en el servidor al intentar guardar los datos." };
  }
}

export async function deletePayoutAccountActionClient() {
  const authContext = await requirePageRole(["driver"]);

  try {
    const activeAccount = await prisma.payoutAccount.findFirst({
      where: {
        driverUserId: authContext.clerkUserId,
        status: "ACTIVE",
      },
    });

    if (!activeAccount) {
      return { ok: false, error: "No tienes un método de cobro activo para eliminar." };
    }

    await prisma.payoutAccount.update({
      where: { id: activeAccount.id },
      data: { status: "INACTIVE" },
    });

    await logNotification({
      type: "METHOD_DELETED",
      title: "Método de Cobro Eliminado",
      message: "El conductor eliminó su método de cobro activo.",
      userId: authContext.clerkUserId,
      role: "DRIVER",
    });

    revalidatePath("/driver");
    revalidatePath("/driver/account");

    return { ok: true, message: "Método de cobro eliminado correctamente." };
  } catch (err) {
    console.error("Failed to delete payout account:", err);
    return { ok: false, error: "Error en el servidor al intentar eliminar el método de cobro." };
  }
}
