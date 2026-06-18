import Link from "next/link";
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
    <main className="min-h-screen px-4 py-6 text-slate-950 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <SectionCard className="overflow-hidden bg-linear-to-br from-white via-white to-sky-50/50">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Link href="/rider" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-950 transition">
                Volver a Rider
              </Link>
              <Link href="/rider/checkouts" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-950 transition">
                Ver mis pagos
              </Link>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-sky-600">Mi Pago de Viaje</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{description}</p>
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

      <div className="mt-6 flex flex-col gap-2 border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">Viaje #{data.checkout.reservationId}</h2>
          <StatusBadge value={data.checkout.status} label={humanizeStatus(data.checkout.status)} />
        </div>
        <p className="text-xs text-slate-400">Servicio de transporte programado</p>
      </div>

      <div className="mt-6 bg-slate-50/70 border border-slate-100 rounded-2xl p-5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detalle del pago</h3>
        <dl className="space-y-3.5 text-sm text-slate-600">
          <div className="flex justify-between">
            <dt className="font-medium text-slate-500">Monto del viaje:</dt>
            <dd className="font-semibold text-slate-800">{formatMoney(data.checkout.maxPrice, data.checkout.currency)}</dd>
          </div>
          {data.checkout.creditApplied > 0 && (
            <div className="flex justify-between text-sky-700">
              <dt className="font-medium">Saldo a favor aplicado:</dt>
              <dd className="font-bold">-{formatMoney(data.checkout.creditApplied, data.checkout.currency)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200/60 pt-3 text-base">
            <dt className="font-bold text-slate-900">Total a pagar:</dt>
            <dd className="font-extrabold text-slate-950 text-lg">{formatMoney(data.checkout.amountToCharge, data.checkout.currency)}</dd>
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
    : null;
  const demoRiderUrl = `/rider?payment=${paymentResult}&checkout_id=${checkoutId}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <Link
          href={demoRiderUrl}
          className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white shadow-md hover:bg-slate-800 transition duration-200 cursor-pointer"
        >
          Volver a Rider
        </Link>
        
        {riderAppUrl && (
          <Link
            href={riderAppUrl}
            className="inline-flex w-full items-center justify-center rounded-full bg-sky-500 px-5 py-3 text-center text-sm font-bold text-white shadow-md hover:bg-sky-400 transition duration-200 cursor-pointer"
          >
            Volver a la App del Pasajero
          </Link>
        )}

        <Link
          href="/rider/checkouts"
          className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition duration-200"
        >
          Ver historial de pagos
        </Link>
      </div>

      {!riderAppUrl && (
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
