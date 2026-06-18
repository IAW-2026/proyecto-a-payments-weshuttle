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
