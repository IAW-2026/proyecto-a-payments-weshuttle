import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { AlertBanner } from "@/components/ui/alert-banner";
import { formatDateTime, formatMoney, humanizeStatus } from "@/components/ui/format";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";

type CheckoutStatus = "CREATED" | "PENDING" | "PAID" | "DENIED" | "CANCELED" | "EXPIRED";
type CheckoutResultKind = "success" | "failure" | "pending";

export type CheckoutViewData = {
  checkout: {
    id: string;
    reservationId: string;
    poolId: string;
    passengerUserId: string;
    maxPrice: number;
    availableCreditAtCreation: number;
    creditApplied: number;
    amountToCharge: number;
    currency: string;
    status: CheckoutStatus;
    checkoutUrl: string | null;
    mercadoPagoPreferenceId: string | null;
    mercadoPagoInitPoint: string | null;
    expiresAt: string | null;
  };
  isDemoMode: boolean;
};

function statusCopy(status: CheckoutStatus) {
  switch (status) {
    case "PAID":
      return {
        title: "¡Pago aprobado!",
        description: "Tu pago fue recibido correctamente y tu viaje ya está confirmado.",
        tone: "success" as const,
      };
    case "PENDING":
      return {
        title: "Pago en proceso",
        description: "Estamos verificando la transacción. Te avisaremos en cuanto se confirme.",
        tone: "warning" as const,
      };
    case "DENIED":
      return {
        title: "No pudimos cobrar tu pago",
        description: "Hubo un problema. Revisa los datos e inténtalo de nuevo.",
        tone: "danger" as const,
      };
    case "CANCELED":
      return {
        title: "Pago cancelado",
        description: "El pago se canceló antes de que pudiera completarse.",
        tone: "info" as const,
      };
    case "EXPIRED":
      return {
        title: "El pago expiró",
        description: "El tiempo límite para realizar el pago caducó sin confirmarse.",
        tone: "info" as const,
      };
    default:
      return {
        title: "Listo para pagar",
        description: "Revisa el detalle y confirma tu pago para continuar.",
        tone: "info" as const,
      };
  }
}

export function CheckoutLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen px-4 py-6 text-primary sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <SectionCard className="overflow-hidden bg-linear-to-br from-white via-white to-info-light/35">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Link href={process.env.NEXT_PUBLIC_RIDER_APP_URL?.trim() || "/rider"} className="inline-flex items-center justify-center rounded-lg border border-primary/20 bg-white px-4 py-2 font-medium text-primary shadow-sm hover:border-primary/50 hover:bg-primary/5 transition">
                Volver a la app del pasajero
              </Link>
              <Link href="/rider/checkouts" className="inline-flex items-center justify-center rounded-lg border border-primary/20 bg-white px-4 py-2 font-medium text-primary shadow-sm hover:border-primary/50 hover:bg-primary/5 transition">
                Ver mis pagos
              </Link>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Mi Pago de Viaje</p>
              <h1 className="mt-2 text-2xl font-bold text-primary sm:text-3xl">{title}</h1>
              <p className="mt-2 text-sm text-slate-gray leading-relaxed">{description}</p>
            </div>
          </div>
        </SectionCard>
        {children}
      </div>
    </main>
  );
}

export function CheckoutSummaryCard({ data }: { data: CheckoutViewData }) {
  const copy = statusCopy(data.checkout.status);

  return (
    <SectionCard>
      <AlertBanner tone={copy.tone} title={copy.title}>
        {copy.description}
      </AlertBanner>

      <div className="mt-6 flex flex-col gap-2 border-b border-outline-custom pb-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-primary">Viaje #{data.checkout.reservationId}</h2>
          <StatusBadge value={data.checkout.status} label={humanizeStatus(data.checkout.status)} />
        </div>
        <p className="text-xs text-slate-gray">Servicio de transporte programado</p>
      </div>

      <div className="mt-6 bg-surface border border-outline-custom rounded-xl p-5">
        <h3 className="text-xs font-bold text-slate-gray uppercase tracking-wider mb-3">Detalle del pago</h3>
        <dl className="space-y-3.5 text-sm text-slate-gray">
          <div className="flex justify-between">
            <dt className="font-medium text-slate-gray">Monto del viaje:</dt>
            <dd className="font-semibold text-primary">{formatMoney(data.checkout.maxPrice, data.checkout.currency)}</dd>
          </div>
          {data.checkout.creditApplied > 0 && (
            <div className="flex justify-between text-primary">
              <dt className="font-medium">Saldo a favor aplicado:</dt>
              <dd className="font-bold">-{formatMoney(data.checkout.creditApplied, data.checkout.currency)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-outline-custom pt-3 text-base">
            <dt className="font-bold text-primary">Total a pagar:</dt>
            <dd className="font-extrabold text-primary text-lg">{formatMoney(data.checkout.amountToCharge, data.checkout.currency)}</dd>
          </div>
        </dl>
      </div>

      <details className="mt-6 border-t border-slate-100 pt-4">
        <summary className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer outline-none select-none">
          Detalles técnicos del pago
        </summary>
        <dl className="mt-4 grid gap-4 text-xs text-slate-500 sm:grid-cols-2 text-left">
          <div>
            <dt className="font-semibold">Código de Pago (Checkout ID):</dt>
            <dd className="mt-0.5 break-all">{data.checkout.id}</dd>
          </div>
          <div>
            <dt className="font-semibold">Código de Pasarela (Preference ID):</dt>
            <dd className="mt-0.5 break-all">{data.checkout.mercadoPagoPreferenceId ?? "No disponible"}</dd>
          </div>
          <div>
            <dt className="font-semibold">Expiración:</dt>
            <dd className="mt-0.5">{formatDateTime(data.checkout.expiresAt)}</dd>
          </div>
          <div>
            <dt className="font-semibold">Canal de Pago:</dt>
            <dd className="mt-0.5">{data.isDemoMode ? "Simulación de Demo" : "Mercado Pago Sandbox"}</dd>
          </div>
        </dl>
      </details>
    </SectionCard>
  );
}

export function CheckoutResultActions({
  checkoutId,
  paymentResult,
}: {
  checkoutId: string;
  paymentResult: CheckoutResultKind;
}) {
  const riderAppBaseUrl = process.env.NEXT_PUBLIC_RIDER_APP_URL?.trim();
  const riderAppUrl = riderAppBaseUrl
    ? `${riderAppBaseUrl.replace(/\/$/, "")}?payment=${paymentResult}&checkout_id=${checkoutId}`
    : `/rider?payment=${paymentResult}&checkout_id=${checkoutId}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <Link
          href={riderAppUrl}
          className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3 text-center text-sm font-bold text-white shadow-md hover:bg-primary-hover transition duration-200 cursor-pointer"
        >
          Volver a la app del pasajero
        </Link>

        <Link
          href="/rider/checkouts"
          className="inline-flex w-full items-center justify-center rounded-lg border border-primary/25 bg-white px-5 py-3 text-center text-sm font-semibold text-primary shadow-sm hover:border-primary/50 hover:bg-primary/5 transition duration-200"
        >
          Ver historial de pagos
        </Link>
      </div>

      {!riderAppBaseUrl && (
        <details className="border-t border-slate-100 pt-3 mt-4">
          <summary className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer outline-none select-none">
            Información de la App externa
          </summary>
          <div className="mt-2 text-xs text-slate-500 leading-relaxed text-left">
            La demo sigue dentro de Payments App. Si en el futuro configuras NEXT_PUBLIC_RIDER_APP_URL, aquí aparecerá el botón para retornar a la aplicación del pasajero.
          </div>
        </details>
      )}
    </div>
  );
}

export function AccountConflictView({ checkoutId }: { checkoutId: string }) {
  const riderAppBaseUrl = process.env.NEXT_PUBLIC_RIDER_APP_URL?.trim();
  const riderAppUrl = riderAppBaseUrl || "/rider";

  return (
    <CheckoutLayout
      title="Conflicto de Cuenta"
      description="El checkout al que intentas acceder pertenece a otra cuenta."
    >
      <SectionCard className="border-error-red/20 bg-linear-to-br from-white via-white to-error-light/10 shadow-lg">
        <div className="flex flex-col items-center text-center gap-5 py-4">
          <div className="rounded-full bg-error-light p-4 text-error-red border border-error-red/10 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-8 w-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
            </svg>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-primary">Este checkout pertenece a otra cuenta.</h2>
            <p className="text-sm text-slate-gray leading-relaxed max-w-md">
              Actualmente estás conectado en Payments con una cuenta distinta a la que creó esta reserva. Para continuar, cambiá de cuenta e ingresá con la cuenta correcta.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center pt-4">
            <SignOutButton redirectUrl={`/checkout/${checkoutId}`}>
              <button className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-primary-hover hover:scale-[1.01] active:scale-[0.99] transition duration-200 cursor-pointer">
                Cambiar cuenta
              </button>
            </SignOutButton>
            <Link
              href={riderAppUrl}
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-primary/20 bg-white px-6 py-3 text-sm font-medium text-primary shadow-sm hover:border-primary/40 hover:bg-primary/5 hover:scale-[1.01] active:scale-[0.99] transition duration-200 cursor-pointer"
            >
              Volver a la app del pasajero
            </Link>
          </div>
        </div>
      </SectionCard>
    </CheckoutLayout>
  );
}
