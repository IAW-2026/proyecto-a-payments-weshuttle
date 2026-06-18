import { prisma } from "@/lib/prisma";

export function paymentBanner(payment: string | undefined) {
  switch (payment) {
    case "success":
      return {
        tone: "success" as const,
        title: "¡Pago aprobado!",
        description: "Tu pago se acreditó correctamente y tu viaje ya está confirmado.",
      };
    case "failure":
      return {
        tone: "danger" as const,
        title: "No pudimos procesar tu pago",
        description: "Hubo un problema con la operación. Por favor, vuelve a intentarlo.",
      };
    case "pending":
      return {
        tone: "warning" as const,
        title: "Tu pago está en proceso",
        description: "Estamos esperando la confirmación. Te avisaremos en cuanto se resuelva.",
      };
    default:
      return null;
  }
}

export function humanizeMovement(value: string) {
  switch (value) {
    case "CREDIT_GRANTED":
      return "Saldo a favor recibido";
    case "CREDIT_APPLIED":
      return "Saldo utilizado en viaje";
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
