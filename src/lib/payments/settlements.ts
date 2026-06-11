import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type SettlePoolInput = {
  poolId: string;
  driverUserId: string;
  completedAt: string;
};

type SettlePoolResult =
  | {
      ok: true;
      data: {
        poolId: string;
        settlementId: string;
        settlementStatus: "COMPLETED";
        driverUserId: string;
        amount: number;
        currency: string;
      };
    }
  | {
      ok: false;
      status: number;
      error: string;
      message: string;
    };

function decimalToNumber(value: Prisma.Decimal | null) {
  return value ? value.toNumber() : 0;
}

export async function settlePool(input: SettlePoolInput): Promise<SettlePoolResult> {
  const existingSettlement = await prisma.settlement.findUnique({
    where: { poolId: input.poolId },
  });

  if (existingSettlement) {
    return {
      ok: false,
      status: 409,
      error: "SETTLEMENT_ALREADY_EXISTS",
      message: "La liquidacion de este pool ya fue realizada o iniciada previamente.",
    };
  }

  const charges = await prisma.charge.findMany({
    where: {
      poolId: input.poolId,
      status: "PAID",
    },
    orderBy: { processedAt: "asc" },
  });

  if (charges.length === 0) {
    return {
      ok: false,
      status: 404,
      error: "POOL_CHARGES_NOT_FOUND",
      message: "No existen cobros exitosos asociados al pool indicado.",
    };
  }

  const chargesWithoutFinalPrice = charges.filter((charge) => charge.finalTripPrice === null);

  if (chargesWithoutFinalPrice.length > 0) {
    return {
      ok: false,
      status: 409,
      error: "POOL_PRICE_NOT_FINALIZED",
      message: "El pool todavia no tiene precio final calculado para todas las reservas pagadas.",
    };
  }

  const payoutAccount = await prisma.payoutAccount.findFirst({
    where: {
      driverUserId: input.driverUserId,
      status: "ACTIVE",
    },
    orderBy: { id: "asc" },
  });

  if (!payoutAccount) {
    return {
      ok: false,
      status: 404,
      error: "PAYOUT_ACCOUNT_NOT_FOUND",
      message: "El conductor no tiene una cuenta de cobro activa.",
    };
  }

  const amount = charges.reduce(
    (total, charge) => total + decimalToNumber(charge.finalTripPrice),
    0,
  );
  const currency = charges[0]?.currency ?? "ARS";
  const settlement = await prisma.settlement.create({
    data: {
      poolId: input.poolId,
      driverUserId: input.driverUserId,
      payoutAccountId: payoutAccount.id,
      amount: new Prisma.Decimal(amount.toFixed(2)),
      currency,
      status: "COMPLETED",
      settledAt: new Date(input.completedAt),
    },
  });

  return {
    ok: true,
    data: {
      poolId: input.poolId,
      settlementId: settlement.id,
      settlementStatus: "COMPLETED",
      driverUserId: input.driverUserId,
      amount: settlement.amount.toNumber(),
      currency: settlement.currency,
    },
  };
}
