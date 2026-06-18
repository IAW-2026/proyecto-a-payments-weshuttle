import { prisma } from "@/lib/prisma";

export function paymentBanner(payment: string | undefined) {
  switch (payment) {
    case "success":
      return {
        tone: "success" as const,
        title: "Pago confirmado",
        description: "El checkout se resolvio correctamente. Puedes revisar el detalle y ver el impacto sobre tu saldo.",
      };
    case "failure":
      return {
        tone: "danger" as const,
        title: "Pago no completado",
        description: "La operacion no pudo acreditarse. Revisa el estado del checkout antes de volver a intentarlo.",
      };
    case "pending":
      return {
        tone: "warning" as const,
        title: "Pago en revision",
        description: "Mercado Pago informo un estado pendiente. La confirmacion final puede demorar unos minutos.",
      };
    default:
      return null;
  }
}

export function humanizeMovement(value: string) {
  switch (value) {
    case "CREDIT_GRANTED":
      return "Credito generado";
    case "CREDIT_APPLIED":
      return "Credito aplicado";
    default:
      return value;
  }
}

export async function getRiderPageData(clerkUserId: string, reservationId?: string) {
  const normalizedReservationId = reservationId?.trim() || "";

  const [creditAccount, recentMovements, recentCheckouts, latestCheckout, latestCharge] = await Promise.all([
    prisma.creditAccount.findUnique({
      where: { userId: clerkUserId },
    }),
    prisma.creditMovement.findMany({
      where: { userId: clerkUserId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.checkoutSession.findMany({
      where: { passengerUserId: clerkUserId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    normalizedReservationId
      ? prisma.checkoutSession.findFirst({
          where: {
            reservationId: normalizedReservationId,
            passengerUserId: clerkUserId,
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve(null),
    normalizedReservationId
      ? prisma.charge.findFirst({
          where: {
            reservationId: normalizedReservationId,
            passengerUserId: clerkUserId,
          },
          orderBy: { processedAt: "desc" },
        })
      : Promise.resolve(null),
  ]);

  return {
    reservationId: normalizedReservationId,
    creditAccount,
    recentMovements,
    recentCheckouts,
    latestCheckout,
    latestCharge,
    availableCredit: creditAccount?.balance.toNumber() ?? 0,
  };
}
