"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isRedirectError(error: unknown): boolean {
  if (error instanceof Error) {
    const digest = (error as Error & { digest?: unknown }).digest;
    return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
  }
  return false;
}

function fail(message: string) {
  redirect(`/admin/pricing-rules?error=${encodeURIComponent(message)}`);
}

export async function savePricePerKmAction(formData: FormData) {
  await requirePageRole(["admin"]);

  const pricePerKmStr = formData.get("pricePerKm")?.toString().trim();
  const pricePerKm = Number(pricePerKmStr);

  if (!pricePerKmStr || !Number.isFinite(pricePerKm) || pricePerKm < 0) {
    fail("El precio por kilómetro debe ser un número mayor o igual a 0.");
    return;
  }

  try {
    await prisma.systemSetting.upsert({
      where: { key: "price_per_km" },
      update: { value: pricePerKm.toFixed(2) },
      create: { key: "price_per_km", value: pricePerKm.toFixed(2) },
    });

    revalidatePath("/admin/pricing-rules");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("Save price_per_km error:", error);
    fail("Ocurrió un error al guardar la tarifa por kilómetro.");
    return;
  }

  redirect("/admin/pricing-rules?message=Tarifa%20base%20por%20kilómetro%20actualizada");
}

export async function saveOccupancyDiscountsAction(formData: FormData) {
  await requirePageRole(["admin"]);

  const updates: { count: number; discountValue: number }[] = [];

  for (let count = 1; count <= 15; count++) {
    const valueStr = formData.get(`discount-${count}`)?.toString().trim();
    const value = Number(valueStr);

    if (!valueStr || !Number.isFinite(value) || value < 0 || value > 100) {
      fail(`El descuento para ${count} pasajeros debe ser un número entre 0 y 100.`);
      return;
    }

    updates.push({ count, discountValue: value });
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        const existing = await tx.pricingRule.findFirst({
          where: {
            destinationId: null,
            minPassengers: update.count,
            maxPassengers: update.count,
          },
        });

        if (existing) {
          await tx.pricingRule.update({
            where: { id: existing.id },
            data: {
              discountValue: update.discountValue,
              basePrice: 0,
              discountType: "PERCENTAGE",
              active: true,
            },
          });
        } else {
          await tx.pricingRule.create({
            data: {
              destinationId: null,
              basePrice: 0,
              minPassengers: update.count,
              maxPassengers: update.count,
              discountType: "PERCENTAGE",
              discountValue: update.discountValue,
              active: true,
            },
          });
        }
      }
    });

    revalidatePath("/admin/pricing-rules");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("Save occupancy discounts error:", error);
    fail("Ocurrió un error al guardar los descuentos por ocupación.");
    return;
  }

  redirect("/admin/pricing-rules?message=Tabla%20de%20descuentos%20actualizada%20con%20éxito");
}
