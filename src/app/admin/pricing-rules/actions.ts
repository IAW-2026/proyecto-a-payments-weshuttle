"use server";

import { PricingRuleDiscountType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasConflictingPricingRule } from "@/lib/pricing-rules";

type PricingRuleFormInput = {
  id?: string;
  destinationId: string | null;
  basePrice: string;
  minPassengers: string;
  maxPassengers: string;
  discountType: string;
  discountValue: string;
  active: boolean;
};

function getTrimmedValue(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

function parseFormData(formData: FormData): PricingRuleFormInput {
  const destinationId = getTrimmedValue(formData, "destinationId");
  const id = getTrimmedValue(formData, "id");

  return {
    id: id || undefined,
    destinationId: destinationId || null,
    basePrice: getTrimmedValue(formData, "basePrice"),
    minPassengers: getTrimmedValue(formData, "minPassengers"),
    maxPassengers: getTrimmedValue(formData, "maxPassengers"),
    discountType: getTrimmedValue(formData, "discountType"),
    discountValue: getTrimmedValue(formData, "discountValue"),
    active: formData.get("active") === "on",
  };
}

function fail(message: string) {
  redirect(`/admin/pricing-rules?error=${encodeURIComponent(message)}`);
}

async function savePricingRule(input: PricingRuleFormInput) {
  await requirePageRole(["admin"]);

  const basePrice = Number(input.basePrice);
  const minPassengers = Number(input.minPassengers);
  const maxPassengers = Number(input.maxPassengers);
  const discountValue = Number(input.discountValue);

  if (!Number.isFinite(basePrice) || basePrice < 0) {
    fail("El precio base debe ser un numero mayor o igual a 0.");
  }

  if (!Number.isInteger(minPassengers) || minPassengers < 1) {
    fail("La cantidad minima de pasajeros debe ser un entero mayor o igual a 1.");
  }

  if (!Number.isInteger(maxPassengers) || maxPassengers < minPassengers) {
    fail("La cantidad maxima de pasajeros debe ser un entero mayor o igual al minimo.");
  }

  if (!Number.isFinite(discountValue) || discountValue < 0) {
    fail("El valor de descuento debe ser un numero mayor o igual a 0.");
  }

  if (
    input.discountType !== "PERCENTAGE" &&
    input.discountType !== "FIXED_AMOUNT"
  ) {
    fail("El tipo de descuento es invalido.");
  }

  if (input.active) {
    const hasConflict = await hasConflictingPricingRule({
      id: input.id,
      destinationId: input.destinationId,
      minPassengers,
      maxPassengers,
    });

    if (hasConflict) {
      fail("Ya existe una regla activa con el mismo alcance y rango de pasajeros superpuesto.");
    }
  }

  const data = {
    destinationId: input.destinationId,
    basePrice,
    minPassengers,
    maxPassengers,
    discountType: input.discountType as PricingRuleDiscountType,
    discountValue,
    active: input.active,
  };

  if (input.id) {
    await prisma.pricingRule.update({
      where: { id: input.id },
      data,
    });

    revalidatePath("/admin/pricing-rules");
    redirect("/admin/pricing-rules?message=Regla%20actualizada");
  }

  await prisma.pricingRule.create({ data });

  revalidatePath("/admin/pricing-rules");
  redirect("/admin/pricing-rules?message=Regla%20creada");
}

export async function createPricingRuleAction(formData: FormData) {
  await savePricingRule(parseFormData(formData));
}

export async function updatePricingRuleAction(formData: FormData) {
  await savePricingRule(parseFormData(formData));
}

export async function deletePricingRuleAction(formData: FormData) {
  await requirePageRole(["admin"]);
  const id = formData.get("id")?.toString();

  if (!id) {
    fail("ID de regla no proporcionado.");
    return;
  }

  try {
    await prisma.pricingRule.delete({
      where: { id },
    });
  } catch (error) {
    console.error("Delete Pricing Rule Error:", error);
    fail("No se pudo eliminar la regla. Asegurate de que no este siendo referenciada.");
  }

  revalidatePath("/admin/pricing-rules");
  redirect("/admin/pricing-rules?message=Regla%20eliminada%20permanentemente");
}
