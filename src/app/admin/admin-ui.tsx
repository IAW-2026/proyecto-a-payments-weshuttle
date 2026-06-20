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
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Admin Demo</p>
            <h2 className="mt-2 text-3xl font-bold text-primary sm:text-4xl">{title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-gray sm:text-base">{description}</p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">{actions}</div>
        </div>
      </div>
    </SectionCard>
  );
}

export function AdminQuickActions() {
  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Link href="/admin/checkouts" className="rounded-xl border border-outline-custom bg-white p-6 shadow-sm transition hover:border-primary/20 hover:bg-primary/5">
        <h3 className="font-semibold text-primary">Control de pagos</h3>
        <p className="mt-2 text-sm text-slate-gray">Revisa el estado de las transacciones, cargos y reservas generadas en la plataforma.</p>
      </Link>
      <Link href="/admin/credits" className="rounded-xl border border-outline-custom bg-white p-6 shadow-sm transition hover:border-primary/20 hover:bg-primary/5">
        <h3 className="font-semibold text-primary">Saldos y créditos</h3>
        <p className="mt-2 text-sm text-slate-gray">Controla los saldos a favor aplicados a los viajes y los créditos de devolución.</p>
      </Link>
      <Link href="/admin/pricing-rules" className="rounded-xl border border-outline-custom bg-white p-6 shadow-sm transition hover:border-primary/20 hover:bg-primary/5">
        <h3 className="font-semibold text-primary">Tarifas y reglas</h3>
        <p className="mt-2 text-sm text-slate-gray">Configura precios base, descuentos y reglas según la cantidad de pasajeros.</p>
      </Link>
      <Link href="/admin/settlements" className="rounded-xl border border-outline-custom bg-white p-6 shadow-sm transition hover:border-primary/20 hover:bg-primary/5">
        <h3 className="font-semibold text-primary">Pagos a choferes</h3>
        <p className="mt-2 text-sm text-slate-gray">Gestiona y audita las transferencias de ganancias derivadas a los conductores.</p>
      </Link>
      <Link href="/admin/pools" className="rounded-xl border border-outline-custom bg-white p-6 shadow-sm transition hover:border-primary/20 hover:bg-primary/5">
        <h3 className="font-semibold text-primary">Cierre de viajes</h3>
        <p className="mt-2 text-sm text-slate-gray">Consulta la liquidación final de la tarifa de cada viaje compartido al finalizar.</p>
      </Link>
      <Link href="/admin/pricing-rules/simulator" className="rounded-xl border border-outline-custom bg-white p-6 shadow-sm transition hover:border-primary/20 hover:bg-primary/5">
        <h3 className="font-semibold text-primary">Simulador de tarifas</h3>
        <p className="mt-2 text-sm text-slate-gray">Simula cotizaciones de viajes consultando el estimador en tiempo real según origen, destino y ocupación.</p>
      </Link>
    </section>
  );
}
