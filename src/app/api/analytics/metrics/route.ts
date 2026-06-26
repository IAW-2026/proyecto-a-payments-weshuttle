import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";



/**
 * Parses and returns UTC Date objects representing start and end of Argentina local dates.
 * Argentina is UTC-3 all year round.
 */
function getUtcRangeForArgentina(startDateStr?: string | null, endDateStr?: string | null) {
  // Find current time in Argentina (UTC-3)
  const now = new Date();
  const arTimeShifted = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const arYear = arTimeShifted.getUTCFullYear();
  const arMonth = String(arTimeShifted.getUTCMonth() + 1).padStart(2, "0");
  const arDay = String(arTimeShifted.getUTCDate()).padStart(2, "0");
  const defaultEndDateStr = `${arYear}-${arMonth}-${arDay}`;

  // 14 days before defaultEndDateStr (making a total of 15 days)
  const fallbackEnd = new Date(Date.UTC(arYear, arTimeShifted.getUTCMonth(), arTimeShifted.getUTCDate()));
  const fallbackStart = new Date(fallbackEnd.getTime() - 14 * 24 * 60 * 60 * 1000);
  const startYear = fallbackStart.getUTCFullYear();
  const startMonth = String(fallbackStart.getUTCMonth() + 1).padStart(2, "0");
  const startDay = String(fallbackStart.getUTCDate()).padStart(2, "0");
  const defaultStartDateStr = `${startYear}-${startMonth}-${startDay}`;

  const start = startDateStr || defaultStartDateStr;
  const end = endDateStr || defaultEndDateStr;

  // Validate format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(start) || !dateRegex.test(end)) {
    throw new Error("INVALID_DATE_FORMAT");
  }

  const startParts = start.split("-").map(Number);
  const endParts = end.split("-").map(Number);

  // Validate real dates
  const startVal = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));
  const endVal = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2]));

  if (isNaN(startVal.getTime()) || isNaN(endVal.getTime())) {
    throw new Error("INVALID_DATE_VALUES");
  }

  if (startVal > endVal) {
    throw new Error("START_DATE_AFTER_END_DATE");
  }

  // Argentina start: start_date 00:00:00 local = YYYY-MM-DDT03:00:00.000Z UTC
  const startUtc = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2], 3, 0, 0, 0));

  // Argentina end: end_date 23:59:59.999 local = (end_date + 1 day) 02:59:59.999Z UTC
  const endUtc = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2] + 1, 2, 59, 59, 999));

  return {
    startStr: start,
    endStr: end,
    startUtc,
    endUtc,
  };
}

// Helper to get Argentina date string for a UTC date (shifting back by 3 hours)
function getArDateStr(utcDate: Date): string {
  const shifted = new Date(utcDate.getTime() - 3 * 60 * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(request: Request) {
  // 1. Security check
  const context = await getAuthContext();

  if (context.type === "unauthenticated") {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message: context.error || "Authentication is required.",
      },
      { status: 401 }
    );
  }

  if (
    context.type !== "service" ||
    (context.service !== "analytics" && context.service !== "weshuttle-internal")
  ) {
    return NextResponse.json(
      {
        error: "FORBIDDEN",
        message: "You do not have access to this resource.",
      },
      { status: 403 }
    );
  }

  // 2. Query param parsing and validation
  const { searchParams } = new URL(request.url);
  const startDateParam = searchParams.get("start_date");
  const endDateParam = searchParams.get("end_date");

  let range;
  try {
    range = getUtcRangeForArgentina(startDateParam, endDateParam);
  } catch (err) {
    const error = err as Error;
    return NextResponse.json(
      {
        error: "BAD_REQUEST",
        message:
          error.message === "START_DATE_AFTER_END_DATE"
            ? "start_date no puede ser posterior a end_date."
            : "Formato de fecha inválido. Use YYYY-MM-DD con valores calendarios correctos.",
      },
      { status: 400 }
    );
  }

  const { startStr, endStr, startUtc, endUtc } = range;

  try {
    // 3. Database queries (only selecting required fields)
    const [charges, creditMovements, settlements] = await Promise.all([
      prisma.charge.findMany({
        where: {
          createdAt: {
            gte: startUtc,
            lte: endUtc,
          },
        },
        select: {
          status: true,
          amountCharged: true,
          creditApplied: true,
          creditGranted: true,
          createdAt: true,
        },
      }),
      prisma.creditMovement.findMany({
        where: {
          createdAt: {
            gte: startUtc,
            lte: endUtc,
          },
        },
        select: {
          type: true,
          amount: true,
          createdAt: true,
        },
      }),
      prisma.settlement.findMany({
        where: {
          OR: [
            {
              status: "PENDING",
            },
            {
              status: { in: ["COMPLETED", "FAILED"] },
              settledAt: {
                gte: startUtc,
                lte: endUtc,
              },
            },
          ],
        },
        select: {
          status: true,
          amount: true,
          settledAt: true,
        },
      }),
    ]);

    // 4. Compute Charge Stats
    let successfulPaymentsCount = 0;
    let rejectedPaymentsCount = 0;
    let pendingPaymentsCount = 0;
    let totalRevenue = 0;
    const transactionStats = {
      PAID: 0,
      DENIED: 0,
      PENDING: 0,
      CANCELED: 0,
      EXPIRED: 0,
      FAILED: 0,
    };

    for (const c of charges) {
      const status = c.status;
      if (status === "PAID") {
        successfulPaymentsCount++;
        totalRevenue += c.amountCharged.toNumber();
      } else if (status === "DENIED" || status === "FAILED") {
        rejectedPaymentsCount++;
      } else if (status === "PENDING") {
        pendingPaymentsCount++;
      }
      if (status in transactionStats) {
        transactionStats[status as keyof typeof transactionStats]++;
      }
    }

    totalRevenue = Math.round(totalRevenue * 100) / 100;

    const totalPaymentsCount = successfulPaymentsCount + rejectedPaymentsCount + pendingPaymentsCount;
    const paymentRejectionRate =
      totalPaymentsCount > 0
        ? Math.round((rejectedPaymentsCount / totalPaymentsCount) * 100 * 10) / 10
        : 0;

    const averageTicket =
      successfulPaymentsCount > 0 ? Math.round((totalRevenue / successfulPaymentsCount) * 100) / 100 : 0;

    // 5. Compute Credit Stats
    let totalCreditsApplied = 0;
    let totalCreditsGranted = 0;

    for (const m of creditMovements) {
      if (m.type === "CREDIT_APPLIED") {
        totalCreditsApplied += m.amount.toNumber();
      } else if (m.type === "CREDIT_GRANTED") {
        totalCreditsGranted += m.amount.toNumber();
      }
    }

    totalCreditsApplied = Math.round(totalCreditsApplied * 100) / 100;
    totalCreditsGranted = Math.round(totalCreditsGranted * 100) / 100;

    const creditsGrantedRate =
      totalRevenue > 0 ? Math.round((totalCreditsGranted / totalRevenue) * 100 * 10) / 10 : 0;

    const netRevenueAfterCredits = Math.round((totalRevenue - totalCreditsGranted) * 100) / 100;

    // 6. Compute Settlement Stats
    let settlementsPendingAmount = 0;
    let settlementsPaidAmount = 0;
    const settlementStats = {
      PENDING: 0,
      COMPLETED: 0,
      FAILED: 0,
    };

    for (const s of settlements) {
      if (s.status === "PENDING") {
        settlementsPendingAmount += s.amount.toNumber();
      } else if (s.status === "COMPLETED") {
        settlementsPaidAmount += s.amount.toNumber();
      }
      if (s.status in settlementStats) {
        settlementStats[s.status as keyof typeof settlementStats]++;
      }
    }

    settlementsPendingAmount = Math.round(settlementsPendingAmount * 100) / 100;
    settlementsPaidAmount = Math.round(settlementsPaidAmount * 100) / 100;

    // 7. Generate Daily Financial Trends (filling in zero-value placeholders for days with no activity)
    const trendsMap = new Map<
      string,
      {
        date: string;
        revenue: number;
        creditsGranted: number;
        successfulPayments: number;
        rejectedPayments: number;
      }
    >();

    const startParts = startStr.split("-").map(Number);
    const endParts = endStr.split("-").map(Number);
    const currentDate = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));
    const endDateObj = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2]));

    while (currentDate <= endDateObj) {
      const year = currentDate.getUTCFullYear();
      const month = String(currentDate.getUTCMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getUTCDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      trendsMap.set(dateStr, {
        date: dateStr,
        revenue: 0,
        creditsGranted: 0,
        successfulPayments: 0,
        rejectedPayments: 0,
      });
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    // Populate trends from charges
    for (const c of charges) {
      const dateStr = getArDateStr(c.createdAt);
      const trend = trendsMap.get(dateStr);
      if (trend) {
        if (c.status === "PAID") {
          trend.revenue += c.amountCharged.toNumber();
          trend.successfulPayments++;
        } else if (c.status === "DENIED" || c.status === "FAILED") {
          trend.rejectedPayments++;
        }
      }
    }

    // Populate trends from credits granted
    for (const m of creditMovements) {
      const dateStr = getArDateStr(m.createdAt);
      const trend = trendsMap.get(dateStr);
      if (trend && m.type === "CREDIT_GRANTED") {
        trend.creditsGranted += m.amount.toNumber();
      }
    }

    const financialTrends = Array.from(trendsMap.values()).map((t) => ({
      ...t,
      revenue: Math.round(t.revenue * 100) / 100,
      creditsGranted: Math.round(t.creditsGranted * 100) / 100,
    }));

    // 8. Generate Decision Signals
    const decisionSignals: {
      type: string;
      severity: "info" | "warning" | "danger";
      title: string;
      message: string;
      value: number;
      threshold: number;
    }[] = [];

    // Tasa alta de pagos rechazados
    if (paymentRejectionRate > 15) {
      decisionSignals.push({
        type: "PAYMENT_REJECTION_RATE_HIGH",
        severity: "warning",
        title: "Tasa alta de pagos rechazados",
        message: `El ${paymentRejectionRate}% de las transacciones fueron rechazadas en el período.`,
        value: paymentRejectionRate,
        threshold: 15,
      });
    }

    // Créditos otorgados elevados
    if (creditsGrantedRate > 25) {
      decisionSignals.push({
        type: "CREDITS_GRANTED_HIGH",
        severity: "warning",
        title: "Créditos otorgados elevados",
        message: `Los créditos otorgados equivalen al ${creditsGrantedRate}% de los ingresos cobrados.`,
        value: creditsGrantedRate,
        threshold: 25,
      });
    }

    // Liquidaciones pendientes elevadas
    if (settlementsPendingAmount > 150000) {
      decisionSignals.push({
        type: "PENDING_SETTLEMENTS_HIGH",
        severity: "warning",
        title: "Liquidaciones pendientes elevadas",
        message: `Hay $${settlementsPendingAmount.toLocaleString("es-AR")} pendientes de liquidación a conductores.`,
        value: settlementsPendingAmount,
        threshold: 150000,
      });
    }

    // Aumento de pagos pendientes
    if (pendingPaymentsCount > 10) {
      decisionSignals.push({
        type: "PENDING_PAYMENTS_HIGH",
        severity: "warning",
        title: "Aumento de pagos pendientes",
        message: `Hay ${pendingPaymentsCount} transacciones en estado pendiente.`,
        value: pendingPaymentsCount,
        threshold: 10,
      });
    }

    // Caída de ingresos en el período
    const midPoint = Math.floor(financialTrends.length / 2);
    if (midPoint > 0) {
      const firstHalfRevenue = financialTrends.slice(0, midPoint).reduce((sum, t) => sum + t.revenue, 0);
      const secondHalfRevenue = financialTrends.slice(midPoint).reduce((sum, t) => sum + t.revenue, 0);
      if (firstHalfRevenue > 0 && secondHalfRevenue < firstHalfRevenue) {
        const decreaseRate = Math.round(((firstHalfRevenue - secondHalfRevenue) / firstHalfRevenue) * 100 * 10) / 10;
        if (decreaseRate >= 20) {
          decisionSignals.push({
            type: "REVENUE_DROP",
            severity: "warning",
            title: "Caída de ingresos detectada",
            message: `Los ingresos de la segunda mitad del período disminuyeron un ${decreaseRate}% comparados con la primera mitad.`,
            value: decreaseRate,
            threshold: 20,
          });
        }
      }
    }

    // 9. Send success response
    return NextResponse.json({
      range: {
        startDate: startStr,
        endDate: endStr,
        timezone: "America/Argentina/Buenos_Aires",
      },
      generatedAt: new Date().toISOString(),
      metrics: {
        totalRevenue,
        successfulPaymentsCount,
        rejectedPaymentsCount,
        pendingPaymentsCount,
        paymentRejectionRate,
        averageTicket,
        totalCreditsApplied,
        totalCreditsGranted,
        creditsGrantedRate,
        netRevenueAfterCredits,
        transactionStats,
        settlementStats,
        settlementsPendingAmount,
        settlementsPaidAmount,
        financialTrends,
        decisionSignals,
      },
    });
  } catch (error) {
    console.error("Error generating metrics report for Analytics:", error);
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error interno al consultar las métricas financieras.",
      },
      { status: 500 }
    );
  }
}

// 10. Direct write methods return 403 Forbidden
export async function POST() {
  return NextResponse.json(
    {
      error: "FORBIDDEN",
      message: "Analytics API Key is read-only. Write operations are not permitted.",
    },
    { status: 403 }
  );
}

export async function PUT() {
  return POST();
}

export async function DELETE() {
  return POST();
}

export async function PATCH() {
  return POST();
}
