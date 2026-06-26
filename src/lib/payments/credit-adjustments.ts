import { Prisma } from "@prisma/client";
import {
  getPoolPassengers,
  notifyReservationCreditAdjustment,
} from "@/lib/external-apis";
import { calculateDiscountAmount, findApplicablePricingRule } from "@/lib/pricing-rules";
import { prisma } from "@/lib/prisma";
import { logNotification } from "@/lib/notifications";

type CreditAdjustmentReason = "POOL_LOCKED" | "NO_DRIVER_ASSIGNED";

type CalculateCreditAdjustmentsInput = {
  poolId: string;
  reason: CreditAdjustmentReason;
  departureTime: string;
  currentPassengers: number;
};

type CreditGenerated = {
  reservationId: string;
  passengerUserId: string;
  maxPricePaid: number;
  finalPrice: number;
  creditGranted: number;
  creditBalanceAfter: number;
};

type CalculateCreditAdjustmentsResult =
  | {
      ok: true;
      data: {
        poolId: string;
        reason: CreditAdjustmentReason;
        finalPrice: number;
        processedReservations: number;
        currency: string;
        creditsGenerated: CreditGenerated[];
      };
    }
  | {
      ok: false;
      status: number;
      error: string;
      message: string;
    };

function toDecimal(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

function decimalToNumber(value: Prisma.Decimal | null) {
  return value ? value.toNumber() : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function calculateCreditAdjustments(
  input: CalculateCreditAdjustmentsInput,
): Promise<CalculateCreditAdjustmentsResult> {
  const existingJob = await prisma.poolPriceFinalizationJob.findFirst({
    where: {
      poolId: input.poolId,
      reason: input.reason,
      status: {
        in: ["STARTED", "COMPLETED"],
      },
    },
    orderBy: { startedAt: "desc" },
  });

  if (existingJob) {
    return {
      ok: false,
      status: 409,
      error: "POOL_PRICE_FINALIZATION_ALREADY_EXISTS",
      message: "Los ajustes de credito para este pool ya fueron procesados o iniciados.",
    };
  }

  const manifest = await getPoolPassengers(input.poolId, {
    paymentStatus: "PAID",
  });

  if (!manifest || manifest.passengers.length === 0) {
    return {
      ok: false,
      status: 404,
      error: "POOL_PASSENGERS_NOT_FOUND",
      message: "No existen reservas pagadas asociadas al pool indicado.",
    };
  }

  const currency = manifest.passengers[0]?.currency ?? "ARS";
  const destinationId = manifest.passengers[0]?.destinationId;
  const pricingRule =
    input.reason === "POOL_LOCKED" && destinationId
      ? await findApplicablePricingRule(destinationId, input.currentPassengers)
      : null;

  if (input.reason === "POOL_LOCKED" && !pricingRule) {
    return {
      ok: false,
      status: 404,
      error: "PRICING_RULE_NOT_FOUND",
      message: "No hay una regla de precio activa para calcular el precio final del pool.",
    };
  }

  const startedAt = new Date();
  const basePrice =
    input.reason === "POOL_LOCKED"
      ? manifest.passengers.reduce((sum, p) => sum + p.maxPrice, 0)
      : Math.max(...manifest.passengers.map((passenger) => passenger.maxPrice));

  const finalPriceForPool =
    input.reason === "POOL_LOCKED"
      ? roundMoney(
          manifest.passengers.reduce((sum, p) => {
            const finalPPrice = roundMoney(
              Math.max(
                p.maxPrice -
                  calculateDiscountAmount(
                    p.maxPrice,
                    pricingRule!.discountType,
                    decimalToNumber(pricingRule!.discountValue),
                  ),
                0,
              )
            );
            return sum + finalPPrice;
          }, 0)
        )
      : 0;

  const job = await prisma.poolPriceFinalizationJob.create({
    data: {
      poolId: input.poolId,
      reason: input.reason,
      currentPassengers: input.currentPassengers,
      pricingRuleId: pricingRule?.id ?? null,
      basePrice: toDecimal(basePrice),
      finalPrice: toDecimal(finalPriceForPool),
      discountType: input.reason === "POOL_LOCKED" ? "OCCUPANCY_DISCOUNT" : "NO_DRIVER_CREDIT",
      discountValue:
        input.reason === "POOL_LOCKED"
          ? toDecimal(Math.max(basePrice - finalPriceForPool, 0))
          : toDecimal(basePrice),
      currency,
      status: "STARTED",
      startedAt,
    },
  });

  try {
    const creditsGenerated: CreditGenerated[] = [];

    for (const passenger of manifest.passengers) {
      const charge = await prisma.charge.findFirst({
        where: {
          reservationId: passenger.reservationId,
          passengerUserId: passenger.passengerUserId,
          status: "PAID",
        },
        orderBy: { processedAt: "desc" },
      });

      if (!charge) {
        continue;
      }

      const chargedMaxPrice = decimalToNumber(charge.maxPrice);

      const finalTripPrice =
        input.reason === "NO_DRIVER_ASSIGNED"
          ? 0
          : roundMoney(
              Math.max(
                chargedMaxPrice -
                  calculateDiscountAmount(
                    chargedMaxPrice,
                    pricingRule!.discountType,
                    decimalToNumber(pricingRule!.discountValue),
                  ),
                0,
              ),
            );
      const creditGranted = roundMoney(Math.max(chargedMaxPrice - finalTripPrice, 0));

      const creditAccount = await prisma.creditAccount.upsert({
        where: { userId: passenger.passengerUserId },
        create: {
          userId: passenger.passengerUserId,
          balance: toDecimal(0),
          currency,
        },
        update: {},
      });

      let creditBalanceAfter = decimalToNumber(creditAccount.balance);

      await prisma.$transaction(async (tx) => {
        await tx.charge.update({
          where: { id: charge.id },
          data: {
            poolPriceFinalizationJobId: job.id,
            finalTripPrice: toDecimal(finalTripPrice),
            creditGranted: toDecimal(creditGranted),
          },
        });

        if (creditGranted > 0) {
          const updatedAccount = await tx.creditAccount.update({
            where: { id: creditAccount.id },
            data: {
              balance: {
                increment: toDecimal(creditGranted),
              },
            },
          });

          creditBalanceAfter = decimalToNumber(updatedAccount.balance);

          await tx.creditMovement.create({
            data: {
              creditAccountId: creditAccount.id,
              userId: passenger.passengerUserId,
              type: "CREDIT_GRANTED",
              amount: toDecimal(creditGranted),
              currency,
              reservationId: passenger.reservationId,
              poolId: input.poolId,
              chargeId: charge.id,
              poolPriceFinalizationJobId: job.id,
              description:
                input.reason === "POOL_LOCKED"
                  ? "Saldo a favor generado por ajuste de ocupacion del pool."
                  : "Saldo a favor total por pool cancelado sin conductor.",
            },
          });
        }
      });

      if (creditGranted > 0) {
        creditsGenerated.push({
          reservationId: passenger.reservationId,
          passengerUserId: passenger.passengerUserId,
          maxPricePaid: chargedMaxPrice,
          finalPrice: finalTripPrice,
          creditGranted,
          creditBalanceAfter,
        });

        await logNotification({
          type: "CREDIT_GENERATED",
          title: "Crédito Generado",
          message: `Se generó un crédito de $${creditGranted} a favor del pasajero por ajuste de tarifa (${input.reason === "POOL_LOCKED" ? "ajuste de ocupación" : "viaje cancelado sin chofer"}) en reserva #${passenger.reservationId}.`,
          userId: passenger.passengerUserId,
          role: "RIDER",
        });

        try {
          await notifyReservationCreditAdjustment({
            reservationId: passenger.reservationId,
            poolId: input.poolId,
            passengerUserId: passenger.passengerUserId,
            finalTripPrice: finalTripPrice,
            creditGranted,
            creditBalanceAfter,
            reason: input.reason,
            processedAt: new Date().toISOString(),
          });
        } catch (err) {
          console.error("Failed to notify rider app of credit adjustment", err);
          const errMsg = err instanceof Error ? err.message : "Error desconocido";
          await logNotification({
            type: "INTEGRATION_ERROR",
            title: "Error de integración con Rider App",
            message: `Fallo al notificar ajuste de crédito para reserva #${passenger.reservationId}. Error: ${errMsg}`,
            userId: passenger.passengerUserId,
            role: "RIDER",
          });
        }
      }
    }

    await prisma.poolPriceFinalizationJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
      },
    });

    await logNotification({
      type: "POOL_FINALIZATION_COMPLETED",
      title: "Cierre T-1h Procesado",
      message: `El proceso de cierre T-1h para el pool ${input.poolId} finalizó con éxito (${manifest.passengers.length} reservas procesadas).`,
      userId: "system",
      role: "ADMIN",
    });

    return {
      ok: true,
      data: {
        poolId: input.poolId,
        reason: input.reason,
        finalPrice: finalPriceForPool,
        processedReservations: manifest.passengers.length,
        currency,
        creditsGenerated,
      },
    };
  } catch {
    await prisma.poolPriceFinalizationJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
      },
    });

    await logNotification({
      type: "POOL_FINALIZATION_FAILED",
      title: "Cierre T-1h Fallido",
      message: `El proceso de cierre T-1h para el pool ${input.poolId} falló.`,
      userId: "system",
      role: "ADMIN",
    });

    throw new Error(`POOL_PRICE_FINALIZATION_FAILED:${input.poolId}:${input.departureTime}`);
  }
}
