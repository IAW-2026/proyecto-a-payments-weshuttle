import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";

export function AdminHero({
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
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Admin Demo</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">{title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">{actions}</div>
        </div>
      </div>
    </SectionCard>
  );
}

export function AdminQuickActions() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Link href="/admin/checkouts" className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/30">
        <h3 className="font-semibold text-slate-900">Pagos / Checkouts</h3>
        <p className="mt-2 text-sm text-slate-600">Cuenta la historia completa del cobro: reserva, checkout, estado y cargo asociado.</p>
      </Link>
      <Link href="/admin/credits" className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/30">
        <h3 className="font-semibold text-slate-900">Creditos</h3>
        <p className="mt-2 text-sm text-slate-600">Explica saldo aplicado y credito generado sin irte al detalle tecnico del backend.</p>
      </Link>
      <Link href="/admin/pricing-rules" className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/30">
        <h3 className="font-semibold text-slate-900">Reglas de precios</h3>
        <p className="mt-2 text-sm text-slate-600">Muestra como impactan topes, descuentos y ocupacion sobre el dominio de Payments.</p>
      </Link>
      <Link href="/admin/settlements" className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/30">
        <h3 className="font-semibold text-slate-900">Liquidaciones</h3>
        <p className="mt-2 text-sm text-slate-600">Controla transferencias a conductores y su estado de ejecucion.</p>
      </Link>
      <Link href="/admin/pools" className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/30">
        <h3 className="font-semibold text-slate-900">Pools</h3>
        <p className="mt-2 text-sm text-slate-600">Resume el cierre operativo por pool y la finalizacion de precios.</p>
      </Link>
      <Link href="/admin/transactions" className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/30">
        <h3 className="font-semibold text-slate-900">Auditoria legacy</h3>
        <p className="mt-2 text-sm text-slate-600">Mantiene visible la auditoria detallada de cargos sin ser la ruta principal de la demo.</p>
      </Link>
    </section>
  );
}
