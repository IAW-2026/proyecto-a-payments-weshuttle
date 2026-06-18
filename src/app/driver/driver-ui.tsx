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
    <label className="flex flex-col gap-2 text-sm text-slate-700">
      <span className="font-medium text-slate-900">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        className="rounded-2xl border border-slate-300/80 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
      />
      {helpText ? <span className="text-xs leading-5 text-slate-500">{helpText}</span> : null}
    </label>
  );
}

export function DriverHero({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode }) {
  return (
    <SectionCard>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Driver Demo</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">{title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
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
      <MetricCard title="Total liquidado" value={settledAmount} description="Fondos ya transferidos a tu cuenta activa." tone="emerald" />
      <div className="rounded-[24px] border border-sky-100 bg-linear-to-br from-sky-50 to-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Cuenta activa</p>
        <p className="mt-3 text-lg font-semibold text-slate-900">{payoutAccountLabel}</p>
        <div className="mt-3">{payoutStatus}</div>
      </div>
      <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estado operativo</p>
        <p className="mt-3 text-lg font-semibold text-slate-900">{completedSettlements} completadas, {pendingSettlements} pendientes</p>
        <p className="mt-2 text-sm text-slate-700">Ideal para explicar rapidamente si el conductor ya cobro o sigue a la espera.</p>
      </div>
    </div>
  );
}

export function DriverQuickActions() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Link href="/driver/account" className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/30">
        <h3 className="font-semibold text-slate-900">Cuenta de cobro</h3>
        <p className="mt-2 text-sm text-slate-600">Explica donde deberian liquidarse los viajes del conductor.</p>
      </Link>
      <Link href="/driver/settlements" className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/30">
        <h3 className="font-semibold text-slate-900">Liquidaciones</h3>
        <p className="mt-2 text-sm text-slate-600">Busca por pool y muestra si el viaje ya fue liquidado o sigue pendiente.</p>
      </Link>
      <Link href="/driver/trips" className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/30">
        <h3 className="font-semibold text-slate-900">Pools y viajes</h3>
        <p className="mt-2 text-sm text-slate-600">Resume el estado operativo del viaje con los datos que hoy registra Payments App.</p>
      </Link>
    </section>
  );
}
