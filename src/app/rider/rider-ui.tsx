import Link from "next/link";
import { AlertBanner } from "@/components/ui/alert-banner";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";

export function RiderField({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  helpText,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  helpText?: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-700">
      <span className="font-medium text-slate-900">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required
        className="rounded-2xl border border-slate-300/80 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
      />
      {helpText ? <span className="text-xs leading-5 text-slate-500">{helpText}</span> : null}
    </label>
  );
}

export function RiderHero({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <SectionCard>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-sky-600">Mi Cuenta</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">{title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">{actions}</div>
        </div>
      </div>
    </SectionCard>
  );
}

export function RiderQuickActions() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Link href="/rider/balance" className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/30">
        <h3 className="font-semibold text-slate-900">Saldo y movimientos</h3>
        <p className="mt-2 text-sm text-slate-600">Muestra cuanto saldo tiene el rider y que movimientos explican ese monto.</p>
      </Link>
      <Link href="/rider/checkout-demo" className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/30">
        <h3 className="font-semibold text-slate-900">Crear checkout</h3>
        <p className="mt-2 text-sm text-slate-600">Dispara un flujo de demo y continua hacia Mercado Pago o hacia la simulacion interna.</p>
      </Link>
      <Link href="/rider/checkouts" className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/30">
        <h3 className="font-semibold text-slate-900">Checkouts recientes</h3>
        <p className="mt-2 text-sm text-slate-600">Retoma pagos ya creados y explica en que estado quedo cada reserva.</p>
      </Link>
      <Link href="/rider/reservations" className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/30">
        <h3 className="font-semibold text-slate-900">Detalle de reserva</h3>
        <p className="mt-2 text-sm text-slate-600">Relaciona reserva, checkout y charge en una sola consulta facil de mostrar.</p>
      </Link>
    </section>
  );
}

export function RiderPaymentBanner({
  tone,
  title,
  description,
  checkoutId,
}: {
  tone: "success" | "danger" | "warning";
  title: string;
  description: string;
  checkoutId?: string;
}) {
  return (
    <AlertBanner tone={tone} title={title}>
      <p>{description}</p>
      {checkoutId ? (
        <Link href={`/checkout/${checkoutId}`} className="mt-3 inline-flex text-sm font-semibold underline underline-offset-4">
          Ver detalle del pago
        </Link>
      ) : null}
    </AlertBanner>
  );
}

export function RiderSummaryMetrics({
  availableCredit,
  latestCheckoutHref,
  latestCheckoutDay,
  latestCheckoutPrice,
  latestCheckoutStatus,
}: {
  availableCredit: string;
  latestCheckoutHref?: string;
  latestCheckoutDay?: string;
  latestCheckoutPrice?: string;
  latestCheckoutStatus?: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <MetricCard title="Saldo a favor" value={availableCredit} description="Disponible para cubrir parte del pago antes de pasar por Mercado Pago." tone="sky" />
      {latestCheckoutHref ? (
        <Link href={latestCheckoutHref} className="block rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 transition hover:border-sky-300 hover:bg-sky-50/40">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Ultimo checkout</p>
          <p className="mt-3 text-lg font-semibold text-slate-900">{latestCheckoutDay ?? "Dia no disponible"}</p>
          <p className="mt-2 text-sm text-slate-600">Precio: {latestCheckoutPrice ?? "No disponible"}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>{latestCheckoutStatus}</div>
            <span className="text-xs font-medium text-slate-500">Abrir checkout</span>
          </div>
        </Link>
      ) : (
        <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Ultimo checkout</p>
          <p className="mt-3 text-lg font-semibold text-slate-900">Todavia no hay checkouts</p>
          <p className="mt-2 text-sm text-slate-600">Crea uno desde el menu para mostrar el flujo de pago en la demo.</p>
        </div>
      )}
    </div>
  );
}
