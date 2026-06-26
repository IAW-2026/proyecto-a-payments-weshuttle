import { prisma } from "@/lib/prisma";
import { getPoolPassengers } from "@/lib/external-apis";
import { getMockDestinationById } from "@/lib/mock/destinations";

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
      include: {
        charges: true,
      },
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

  // Enrich each checkout in recentCheckouts with destinationName and departureTime
  const enrichedCheckouts = await Promise.all(
    recentCheckouts.map(async (checkout) => {
      let destinationName: string | null = null;
      let departureTime: string | null = null;

      try {
        const manifest = await getPoolPassengers(checkout.poolId);
        const passenger = manifest?.passengers.find(
          (p) => p.reservationId === checkout.reservationId
        );
        if (passenger) {
          departureTime = passenger.departureTime;
          const dest = getMockDestinationById(passenger.destinationId);
          destinationName = dest ? dest.name : passenger.destinationId;
        }
      } catch (err) {
        console.error("Error fetching pool manifest for list item", err);
      }

      // Fallbacks if not found (e.g. for pending/simulated checkout sessions)
      if (!destinationName) {
        const lowerPoolId = checkout.poolId.toLowerCase();
        if (lowerPoolId.includes("white") || lowerPoolId.includes("puerto")) {
          destinationName = "Puerto Ingeniero White";
        } else if (lowerPoolId.includes("industrial") || lowerPoolId.includes("parque")) {
          destinationName = "Parque Industrial";
        } else {
          destinationName = "Polo Petroquimico";
        }
      }
      if (!departureTime) {
        const date = new Date(checkout.createdAt);
        date.setHours(date.getHours() + 1); // 1 hour after creation for realistic mock departure
        departureTime = date.toISOString();
      }

      return {
        ...checkout,
        destinationName,
        departureTime,
      };
    })
  );

  return {
    reservationId: normalizedReservationId,
    creditAccount,
    recentMovements,
    recentCheckouts: enrichedCheckouts,
    latestCheckout,
    latestCharge,
    availableCredit: creditAccount?.balance.toNumber() ?? 0,
  };
}
