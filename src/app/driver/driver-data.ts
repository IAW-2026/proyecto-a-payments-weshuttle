import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DRIVER_PAGE_SIZE = 5;

export function parseDriverPage(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export async function getDriverSummaryData(clerkUserId: string) {
  const [payoutAccount, recentSettlements, completedSettlements, pendingSettlements, totalSettledAmount] = await Promise.all([
    prisma.payoutAccount.findFirst({
      where: {
        driverUserId: clerkUserId,
        status: "ACTIVE",
      },
      orderBy: { id: "asc" },
    }),
    prisma.settlement.findMany({
      where: { driverUserId: clerkUserId },
      orderBy: [{ settledAt: "desc" }, { id: "desc" }],
      take: 5,
    }),
    prisma.settlement.count({ where: { driverUserId: clerkUserId, status: "COMPLETED" } }),
    prisma.settlement.count({ where: { driverUserId: clerkUserId, status: "PENDING" } }),
    prisma.settlement.aggregate({
      _sum: { amount: true },
      where: { driverUserId: clerkUserId, status: "COMPLETED" },
    }),
  ]);

  return {
    payoutAccount,
    recentSettlements,
    completedSettlements,
    pendingSettlements,
    settledAmount: totalSettledAmount._sum.amount?.toNumber() ?? 0,
  };
}

export async function getDriverSettlementsData(clerkUserId: string, q: string, page: number) {
  const where: Prisma.SettlementWhereInput = {
    driverUserId: clerkUserId,
    ...(q
      ? {
          poolId: {
            contains: q,
            mode: "insensitive",
          },
        }
      : {}),
  };

  const [settlements, totalSettlements] = await Promise.all([
    prisma.settlement.findMany({
      where,
      orderBy: [{ settledAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * DRIVER_PAGE_SIZE,
      take: DRIVER_PAGE_SIZE,
    }),
    prisma.settlement.count({ where }),
  ]);

  return {
    settlements,
    totalSettlements,
    totalPages: Math.max(1, Math.ceil(totalSettlements / DRIVER_PAGE_SIZE)),
  };
}

export async function getDriverTripsData(clerkUserId: string) {
  const settlements = await prisma.settlement.findMany({
    where: { driverUserId: clerkUserId },
    include: { payoutAccount: true },
    orderBy: [{ settledAt: "desc" }, { id: "desc" }],
    take: 8,
  });

  return settlements.map((settlement) => ({
    id: settlement.id,
    poolId: settlement.poolId,
    amount: settlement.amount,
    currency: settlement.currency,
    status: settlement.status,
    settledAt: settlement.settledAt,
    payoutReference: settlement.payoutAccount?.alias ?? settlement.payoutAccount?.accountReference ?? null,
  }));
}
