import Link from "next/link";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";

export function DriverField({
  label,
  name,
  defaultValue,
  placeholder,
  required = false,
  helpText,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-gray">
      <span className="font-semibold text-primary">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        className="rounded-lg border border-outline-custom bg-white px-4 py-3 text-primary shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
      />
      {helpText ? <span className="text-xs leading-5 text-slate-gray">{helpText}</span> : null}
    </label>
  );
}

export function DriverHero({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode }) {
  return (
    <SectionCard>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Panel del conductor</p>
            <h2 className="mt-2 text-3xl font-bold text-primary sm:text-4xl">{title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-gray sm:text-base">{description}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">{actions}</div>
        </div>
      </div>
    </SectionCard>
  );
}

export function DriverSummaryMetrics({
  settledAmount,
  payoutAccountLabel,
  payoutStatus,
  completedSettlements,
  pendingSettlements,
}: {
  settledAmount: string;
  payoutAccountLabel: string;
  payoutStatus?: React.ReactNode;
  completedSettlements: number;
  pendingSettlements: number;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <MetricCard title="Total cobrado" value={settledAmount} description="Ganancias transferidas con éxito a tu cuenta." tone="emerald" />
      <div className="rounded-xl border border-primary/15 bg-linear-to-br from-info-light to-white p-5 shadow-xs">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Cuenta de cobro activa</p>
        <p className="mt-3 text-lg font-semibold text-primary">{payoutAccountLabel}</p>
        <div className="mt-3">{payoutStatus}</div>
      </div>
      <div className="rounded-xl border border-outline-custom bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-gray">Estado de transferencias</p>
        <p className="mt-3 text-lg font-semibold text-primary">{completedSettlements} pagadas, {pendingSettlements} pendientes</p>
        <p className="mt-2 text-sm text-slate-gray">Resumen rápido de tus cobros registrados.</p>
      </div>
    </div>
  );
}

export function DriverQuickActions() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <Link href="/driver/account" className="rounded-xl border border-outline-custom bg-white p-6 shadow-sm transition hover:border-primary/20 hover:bg-primary/5">
        <h3 className="font-semibold text-primary">Datos de cobro</h3>
        <p className="mt-2 text-sm text-slate-gray">Configura la cuenta de Mercado Pago o CBU/CVU donde deseas recibir tus ganancias.</p>
      </Link>
      <Link href="/driver/trips" className="rounded-xl border border-outline-custom bg-white p-6 shadow-sm transition hover:border-primary/20 hover:bg-primary/5">
        <h3 className="font-semibold text-primary">Viajes y ganancias</h3>
        <p className="mt-2 text-sm text-slate-gray">Revisa el historial de viajes completados, tarifas estimadas y cobros recibidos.</p>
      </Link>
    </section>
  );
}
