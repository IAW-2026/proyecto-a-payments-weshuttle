import Link from "next/link";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyState } from "@/components/ui/empty-state";
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
        title: "Pago acreditado",
        description: "La operacion ya fue confirmada y el viaje puede continuar sin pasos adicionales.",
        tone: "success" as const,
      };
    case "PENDING":
      return {
        title: "Pago pendiente",
        description: "La operacion sigue en revision. Vuelve mas tarde para confirmar el resultado final del cobro.",
        tone: "warning" as const,
      };
    case "DENIED":
      return {
        title: "Pago rechazado",
        description: "El cobro no pudo acreditarse. Revisa el detalle y vuelve a intentarlo desde Rider si hace falta.",
        tone: "danger" as const,
      };
    case "CANCELED":
      return {
        title: "Checkout cancelado",
        description: "El flujo de pago se interrumpio antes de completarse.",
        tone: "info" as const,
      };
    case "EXPIRED":
      return {
        title: "Checkout expirado",
        description: "La ventana de pago caduco sin una confirmacion exitosa. Este estado se usa en modo demo.",
        tone: "info" as const,
      };
    default:
      return {
        title: "Listo para pagar",
        description: "Revisa el resumen y continua con Mercado Pago Checkout Pro cuando quieras avanzar.",
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
    <main className="min-h-screen px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <SectionCard className="overflow-hidden bg-linear-to-br from-white via-white to-sky-50/70">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">WeShuttle Payments</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
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

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">Reserva {data.checkout.reservationId}</h2>
            <StatusBadge value={data.checkout.status} label={humanizeStatus(data.checkout.status)} />
          </div>
          <p className="mt-2 text-sm text-slate-600">Pool {data.checkout.poolId}</p>
        </div>

        {data.isDemoMode ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            Modo demo
          </span>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Precio maximo</p>
          <p className="mt-3 text-2xl font-bold text-slate-900">{formatMoney(data.checkout.maxPrice, data.checkout.currency)}</p>
        </div>
        <div className="rounded-[24px] border border-sky-100 bg-linear-to-br from-sky-50 to-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Credito aplicado</p>
          <p className="mt-3 text-2xl font-bold text-slate-900">{formatMoney(data.checkout.creditApplied, data.checkout.currency)}</p>
          <p className="mt-2 text-sm text-slate-700">Saldo disponible al crear: {formatMoney(data.checkout.availableCreditAtCreation, data.checkout.currency)}</p>
        </div>
        <div className="rounded-[24px] border border-emerald-100 bg-linear-to-br from-emerald-50 to-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Total a pagar</p>
          <p className="mt-3 text-2xl font-bold text-slate-900">{formatMoney(data.checkout.amountToCharge, data.checkout.currency)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-slate-900">Checkout ID</dt>
          <dd className="mt-1 break-all">{data.checkout.id}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Preference ID</dt>
          <dd className="mt-1 break-all">{data.checkout.mercadoPagoPreferenceId ?? "No disponible"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Expiracion</dt>
          <dd className="mt-1">{formatDateTime(data.checkout.expiresAt)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Canal de pago</dt>
          <dd className="mt-1">{data.isDemoMode ? "Simulacion interna de demo" : "Mercado Pago Checkout Pro"}</dd>
        </div>
      </div>
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
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Siguientes pasos</h2>
        <p className="mt-2 text-sm text-slate-600">
          Vuelve a la vista Rider para continuar la demo o regresa a la aplicacion del pasajero si esta configurada.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href={demoRiderUrl}
          className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-900 hover:text-slate-900 sm:w-auto"
        >
          Volver a Rider en Payments
        </Link>
        {riderAppUrl ? (
          <Link
            href={riderAppUrl}
            className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
          >
            Volver a Rider App
          </Link>
        ) : null}
      </div>

      {!riderAppUrl ? (
        <EmptyState
          title="Rider App externa no configurada"
          description="La demo seguira dentro de Payments App. Si luego defines NEXT_PUBLIC_RIDER_APP_URL, aqui aparecera el retorno externo."
        />
      ) : null}
    </div>
  );
}
