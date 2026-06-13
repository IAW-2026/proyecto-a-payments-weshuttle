import Link from "next/link";

type CheckoutStatus = "CREATED" | "PENDING" | "PAID" | "DENIED" | "CANCELED" | "EXPIRED";

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

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toFixed(2)}`;
}

function statusCopy(status: CheckoutStatus) {
  switch (status) {
    case "PAID":
      return {
        title: "Pago acreditado",
        description: "El pago fue confirmado y la reserva ya fue informada a Rider App.",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    case "PENDING":
      return {
        title: "Pago pendiente",
        description: "Mercado Pago informo una operacion pendiente. La reserva sigue a la espera de confirmacion.",
        tone: "border-amber-200 bg-amber-50 text-amber-800",
      };
    case "DENIED":
      return {
        title: "Pago rechazado",
        description: "El cobro fue rechazado. La reserva sigue en estado pendiente de pago.",
        tone: "border-rose-200 bg-rose-50 text-rose-800",
      };
    case "CANCELED":
      return {
        title: "Checkout cancelado",
        description: "El usuario abandono o cancelo el checkout. La reserva fue informada como cancelada.",
        tone: "border-slate-200 bg-slate-100 text-slate-800",
      };
    case "EXPIRED":
      return {
        title: "Checkout expirado",
        description: "El checkout expiro sin pago exitoso. Este estado se usa solo en modo demo.",
        tone: "border-slate-200 bg-slate-100 text-slate-800",
      };
    default:
      return {
        title: "Checkout listo para pagar",
        description: "Revisa el resumen y luego continua con Mercado Pago Checkout Pro.",
        tone: "border-sky-200 bg-sky-50 text-sky-800",
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
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">WeShuttle Payments</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">{title}</h1>
          <p className="mt-3 text-sm text-slate-600">{description}</p>
        </div>
        {children}
      </div>
    </main>
  );
}

export function CheckoutSummaryCard({ data }: { data: CheckoutViewData }) {
  const copy = statusCopy(data.checkout.status);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className={`rounded-2xl border px-4 py-3 text-sm ${copy.tone}`}>
        <p className="font-semibold">{copy.title}</p>
        <p className="mt-1">{copy.description}</p>
      </div>

      <dl className="mt-6 grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-slate-900">Checkout ID</dt>
          <dd className="mt-1 break-all">{data.checkout.id}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Estado</dt>
          <dd className="mt-1">{data.checkout.status}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Reserva</dt>
          <dd className="mt-1">{data.checkout.reservationId}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Pool</dt>
          <dd className="mt-1">{data.checkout.poolId}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Precio maximo</dt>
          <dd className="mt-1">{formatMoney(data.checkout.maxPrice, data.checkout.currency)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Saldo disponible al crear</dt>
          <dd className="mt-1">{formatMoney(data.checkout.availableCreditAtCreation, data.checkout.currency)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Credito aplicado</dt>
          <dd className="mt-1">{formatMoney(data.checkout.creditApplied, data.checkout.currency)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Monto a cobrar</dt>
          <dd className="mt-1">{formatMoney(data.checkout.amountToCharge, data.checkout.currency)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Preference ID</dt>
          <dd className="mt-1 break-all">{data.checkout.mercadoPagoPreferenceId ?? "No disponible"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">Expira</dt>
          <dd className="mt-1">{data.checkout.expiresAt ?? "No definido"}</dd>
        </div>
      </dl>
    </section>
  );
}

export function CheckoutResultActions({
  returnUrl,
  checkoutId,
}: {
  returnUrl?: string;
  checkoutId: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link
        href={`/checkout/${checkoutId}`}
        className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
      >
        Volver al checkout
      </Link>
      {returnUrl ? (
        <Link
          href={returnUrl}
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Volver a Rider App
        </Link>
      ) : null}
    </div>
  );
}
