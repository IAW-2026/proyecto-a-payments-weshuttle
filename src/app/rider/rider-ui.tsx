"use client";

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
    <label className="flex flex-col gap-2 text-sm text-slate-gray">
      <span className="font-semibold text-primary">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required
        className="rounded-lg border border-outline-custom bg-white px-4 py-3 text-primary shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
      />
      {helpText ? <span className="text-xs leading-5 text-slate-gray">{helpText}</span> : null}
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
            <p className="text-sm font-bold uppercase tracking-wider text-primary">Mi Cuenta</p>
            <h2 className="mt-2 text-3xl font-bold text-primary sm:text-4xl">{title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-gray sm:text-base">{description}</p>
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
      <Link href="/rider/balance" className="rounded-xl border border-outline-custom bg-white p-6 shadow-sm transition hover:border-primary/20 hover:bg-primary/5">
        <h3 className="font-semibold text-primary">Saldo y movimientos</h3>
        <p className="mt-2 text-sm text-slate-gray">Muestra cuanto saldo tiene el rider y que movimientos explican ese monto.</p>
      </Link>
      <Link href="/rider/checkout-demo" className="rounded-xl border border-outline-custom bg-white p-6 shadow-sm transition hover:border-primary/20 hover:bg-primary/5">
        <h3 className="font-semibold text-primary">Crear checkout</h3>
        <p className="mt-2 text-sm text-slate-gray">Dispara un flujo de demo y continua hacia Mercado Pago o hacia la simulacion interna.</p>
      </Link>
      <Link href="/rider/checkouts" className="rounded-xl border border-outline-custom bg-white p-6 shadow-sm transition hover:border-primary/20 hover:bg-primary/5">
        <h3 className="font-semibold text-primary">Checkouts recientes</h3>
        <p className="mt-2 text-sm text-slate-gray">Retoma pagos ya creados y explica en que estado quedo cada reserva.</p>
      </Link>
      <Link href="/rider/reservations" className="rounded-xl border border-outline-custom bg-white p-6 shadow-sm transition hover:border-primary/20 hover:bg-primary/5">
        <h3 className="font-semibold text-primary">Detalle de reserva</h3>
        <p className="mt-2 text-sm text-slate-gray">Relaciona reserva, checkout y charge en una sola consulta facil de mostrar.</p>
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
        <Link href={`/checkout/${checkoutId}`} className="mt-3 inline-flex text-sm font-semibold underline underline-offset-4 text-primary">
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
        <Link href={latestCheckoutHref} className="block rounded-xl border border-outline-custom bg-surface p-5 transition hover:border-primary/20 hover:bg-primary/5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-gray">Ultimo checkout</p>
          <p className="mt-3 text-lg font-semibold text-primary">{latestCheckoutDay ?? "Dia no disponible"}</p>
          <p className="mt-2 text-sm text-slate-gray">Precio: {latestCheckoutPrice ?? "No disponible"}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>{latestCheckoutStatus}</div>
            <span className="text-xs font-medium text-slate-gray">Abrir checkout</span>
          </div>
        </Link>
      ) : (
        <div className="rounded-xl border border-outline-custom bg-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-gray">Ultimo checkout</p>
          <p className="mt-3 text-lg font-semibold text-primary">Todavia no hay checkouts</p>
          <p className="mt-2 text-sm text-slate-gray">Crea uno desde el menu para mostrar el flujo de pago en la demo.</p>
        </div>
      )}
    </div>
  );
}

