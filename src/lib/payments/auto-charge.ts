import { Prisma } from "@prisma/client";
import {
  getPoolPassengers,
  notifyPoolPaymentDenied,
  notifyReservationPaymentResult,
} from "@/lib/external-apis";
import { getMockDestinationById } from "@/lib/mock/destinations";
import { simulatePaymentCharge } from "@/lib/payments/provider";
import { buildPricingEstimate, findApplicablePricingRule } from "@/lib/pricing-rules";
import { prisma } from "@/lib/prisma";

type StartAutoChargeInput = {
  poolId: string;
  departureTime: string;
  currentPassengers: number;
};

type StartAutoChargeResult =
  | {
      ok: true;
      data: {
        poolId: string;
        autoChargeStatus: "STARTED";
        message: string;
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

export async function startAutoChargeForPool(
  input: StartAutoChargeInput,
): Promise<StartAutoChargeResult> {
  const existingJob = await prisma.autoChargeJob.findUnique({
    where: { poolId: input.poolId },
  });

  if (existingJob) {
    return {
      ok: false,
      status: 409,
      error: "AUTO_CHARGE_ALREADY_STARTED",
      message: "Ya existe un proceso de cobro automatico para este pool.",
    };
  }

  const manifest = await getPoolPassengers(input.poolId);

  if (!manifest || manifest.passengers.length === 0) {
    return {
      ok: false,
      status: 404,
      error: "POOL_PASSENGERS_NOT_FOUND",
      message: "No existe informacion suficiente para procesar los cobros del pool.",
    };
  }

  const startedAt = new Date();
  const job = await prisma.autoChargeJob.create({
    data: {
      poolId: input.poolId,
      requestedBy: "DRIVER_APP",
      currentPassengers: input.currentPassengers,
      status: "STARTED",
      startedAt,
    },
  });

  try {
    let paidCount = 0;
    let deniedCount = 0;

    for (const passenger of manifest.passengers) {
      const paymentMethod = await prisma.paymentMethod.findFirst({
        where: {
          clerkUserId: passenger.passengerUserId,
          status: "ACTIVE",
        },
        orderBy: { id: "asc" },
      });

      const rule = await findApplicablePricingRule(
        passenger.destinationId,
        input.currentPassengers,
      );
      const destination = getMockDestinationById(passenger.destinationId);

      if (!rule || !destination) {
        const processedAt = new Date();
        const transactionId = `txn_${crypto.randomUUID()}`;

        await prisma.charge.create({
          data: {
            transactionId,
            autoChargeJobId: job.id,
            poolId: input.poolId,
            reservationId: passenger.reservationId,
            passengerUserId: passenger.passengerUserId,
            paymentMethodId: paymentMethod?.id,
            maxPrice: toDecimal(0),
            effectivePrice: null,
            currency: "ARS",
            status: "DENIED",
            rejectionReason: !rule ? "PRICING_RULE_NOT_FOUND" : "DESTINATION_NOT_FOUND",
            processedAt,
          },
        });

        await notifyReservationPaymentResult({
          reservationId: passenger.reservationId,
          paymentStatus: "DENIED",
          transactionId,
          currency: "ARS",
          rejectionReason: !rule ? "PRICING_RULE_NOT_FOUND" : "DESTINATION_NOT_FOUND",
          processedAt: processedAt.toISOString(),
        });
        await notifyPoolPaymentDenied({
          poolId: input.poolId,
          reservationId: passenger.reservationId,
          passengerUserId: passenger.passengerUserId,
          reason: "PAYMENT_REJECTED",
        });

        deniedCount += 1;
        continue;
      }

      const estimate = buildPricingEstimate(rule, {
        origin: {
          lat: passenger.pickupPoint.lat,
          lng: passenger.pickupPoint.lng,
        },
        destination: {
          lat: destination.lat,
          lng: destination.lng,
        },
      });
      const chargeResult = await simulatePaymentCharge({
        paymentMethod: paymentMethod ?? null,
        amount: estimate.estimatedPrice,
        currency: estimate.currency,
      });

      const charge = await prisma.charge.create({
        data: {
          transactionId: chargeResult.transactionId,
          autoChargeJobId: job.id,
          poolId: input.poolId,
          reservationId: passenger.reservationId,
          passengerUserId: passenger.passengerUserId,
          paymentMethodId: paymentMethod?.id,
          maxPrice: toDecimal(estimate.maxPrice),
          effectivePrice:
            chargeResult.status === "PAID" ? toDecimal(chargeResult.effectivePrice) : null,
          currency: chargeResult.currency,
          status: chargeResult.status,
          rejectionReason:
            chargeResult.status === "DENIED" ? chargeResult.rejectionReason : null,
          processedAt: chargeResult.processedAt,
        },
      });

      if (chargeResult.status === "PAID") {
        if (estimate.pricingDetail.estimatedDiscount > 0) {
          await prisma.chargeDiscount.create({
            data: {
              chargeId: charge.id,
              type: estimate.pricingDetail.discountReason,
              amount: toDecimal(estimate.pricingDetail.estimatedDiscount),
              description: "Descuento aplicado por ocupacion al cierre del pool",
            },
          });
        }

        await notifyReservationPaymentResult({
          reservationId: passenger.reservationId,
          paymentStatus: "PAID",
          transactionId: chargeResult.transactionId,
          effectivePrice: chargeResult.effectivePrice,
          currency: chargeResult.currency,
          discountsApplied:
            estimate.pricingDetail.estimatedDiscount > 0
              ? [
                  {
                    type: estimate.pricingDetail.discountReason,
                    amount: estimate.pricingDetail.estimatedDiscount,
                  },
                ]
              : [],
          processedAt: chargeResult.processedAt.toISOString(),
        });

        paidCount += 1;
        continue;
      }

      await notifyReservationPaymentResult({
        reservationId: passenger.reservationId,
        paymentStatus: "DENIED",
        transactionId: chargeResult.transactionId,
        currency: chargeResult.currency,
        rejectionReason: chargeResult.rejectionReason,
        processedAt: chargeResult.processedAt.toISOString(),
      });
      await notifyPoolPaymentDenied({
        poolId: input.poolId,
        reservationId: passenger.reservationId,
        passengerUserId: passenger.passengerUserId,
        reason: "PAYMENT_REJECTED",
      });

      deniedCount += 1;
    }

    const finalStatus =
      paidCount === manifest.passengers.length
        ? "COMPLETED"
        : paidCount > 0 || deniedCount > 0
          ? "PARTIAL_FAILED"
          : "FAILED";

    await prisma.autoChargeJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        finishedAt: new Date(),
      },
    });

    return {
      ok: true,
      data: {
        poolId: input.poolId,
        autoChargeStatus: "STARTED",
        message: "El proceso de cobro automatico fue iniciado.",
      },
    };
  } catch {
    await prisma.autoChargeJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
      },
    });

    throw new Error(`AUTO_CHARGE_FAILED:${input.departureTime}`);
  }
}
