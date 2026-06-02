"use server";

import { PaymentMethodType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function fail(message: string, reservationId?: string) {
  const params = new URLSearchParams({ error: message });

  if (reservationId) {
    params.set("reservation_id", reservationId);
  }

  redirect(`/rider?${params.toString()}`);
}

function getTrimmedValue(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

export async function savePaymentMethodAction(formData: FormData) {
  const authContext = await requirePageRole(["rider"]);
  const reservationId = getTrimmedValue(formData, "reservationId") || undefined;
  const holderName = getTrimmedValue(formData, "holderName");
  const providerToken = getTrimmedValue(formData, "providerToken");
  const cardBrand = getTrimmedValue(formData, "cardBrand").toUpperCase();
  const cardBin = getTrimmedValue(formData, "cardBin");
  const cardLast4 = getTrimmedValue(formData, "cardLast4");
  const paymentType = getTrimmedValue(formData, "paymentType");

  if (!holderName || !providerToken || !cardBrand || !cardBin || !cardLast4) {
    fail("Todos los campos del medio de pago son obligatorios.", reservationId);
  }

  if (!/^[0-9]{6}$/.test(cardBin)) {
    fail("El BIN debe tener 6 digitos.", reservationId);
  }

  if (!/^[0-9]{4}$/.test(cardLast4)) {
    fail("Los ultimos 4 digitos son invalidos.", reservationId);
  }

  if (paymentType !== "CREDIT_CARD" && paymentType !== "DEBIT_CARD") {
    fail("El tipo de tarjeta es invalido.", reservationId);
  }

  const existingMethods = await prisma.paymentMethod.findMany({
    where: { clerkUserId: authContext.clerkUserId },
    orderBy: { id: "asc" },
  });

  await prisma.$transaction(async (tx) => {
    if (existingMethods.length > 0) {
      await tx.paymentMethod.updateMany({
        where: { clerkUserId: authContext.clerkUserId },
        data: { status: "INACTIVE" },
      });

      await tx.paymentMethod.update({
        where: { id: existingMethods[0].id },
        data: {
          provider: "MERCADO_PAGO",
          providerToken,
          holderName,
          cardBrand,
          cardBin,
          cardLast4,
          paymentType: paymentType as PaymentMethodType,
          status: "ACTIVE",
        },
      });

      return;
    }

    await tx.paymentMethod.create({
      data: {
        clerkUserId: authContext.clerkUserId,
        provider: "MERCADO_PAGO",
        providerToken,
        holderName,
        cardBrand,
        cardBin,
        cardLast4,
        paymentType: paymentType as PaymentMethodType,
        status: "ACTIVE",
      },
    });
  });

  revalidatePath("/rider");

  const params = new URLSearchParams({ message: "Medio de pago guardado" });

  if (reservationId) {
    params.set("reservation_id", reservationId);
  }

  redirect(`/rider?${params.toString()}`);
}
