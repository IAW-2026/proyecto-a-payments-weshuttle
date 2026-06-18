import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPricingRuleAction, deletePricingRuleAction, updatePricingRuleAction } from "./actions";

type PageProps = {
  searchParams: Promise<{
    message?: string;
    error?: string;
  }>;
};

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  step,
  min,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  step?: string;
  min?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-700">
      <span className="font-medium text-slate-900">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        min={min}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="rounded-2xl border border-slate-300/80 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}

function DiscountSelect({ defaultValue }: { defaultValue: "PERCENTAGE" | "FIXED_AMOUNT" }) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-700">
      <span className="font-medium text-slate-900">Tipo de descuento</span>
      <select
        name="discountType"
        defaultValue={defaultValue}
        className="rounded-2xl border border-slate-300/80 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
      >
        <option value="PERCENTAGE">PERCENTAGE</option>
        <option value="FIXED_AMOUNT">FIXED_AMOUNT</option>
      </select>
    </label>
  );
}

export default async function AdminPricingRulesPage({ searchParams }: PageProps) {
  const [authContext, params, rules] = await Promise.all([
    requirePageRole(["admin"]),
    searchParams,
    prisma.pricingRule.findMany({
      orderBy: [{ active: "desc" }, { destinationId: "asc" }, { minPassengers: "asc" }],
    }),
  ]);

  return (
    <AppShell
      role="admin"
      clerkUserId={authContext.clerkUserId}
      title="Reglas de precio"
      description="Administra el pricing del demo manteniendo visibles las reglas activas, rangos y descuentos sin cambiar la logica existente."
    >
      <div className="flex flex-col gap-8">
        <SectionCard>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Admin Demo</p>
                <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Reglas que gobiernan el pricing.</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                  Crea y ajusta reglas para explicar como se define el precio base, los rangos de ocupacion y el descuento aplicado en los viajes.
                </p>
              </div>

              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-900 hover:text-slate-900"
              >
                Volver al inicio
              </Link>
            </div>

            {params.message ? <AlertBanner tone="success">{params.message}</AlertBanner> : null}
            {params.error ? <AlertBanner tone="danger">{params.error}</AlertBanner> : null}

            <form action={createPricingRuleAction} className="grid gap-4 rounded-[26px] border border-slate-200 bg-slate-50/80 p-5 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Destino externo" name="destinationId" required={false} />
              <Field label="Precio base" name="basePrice" type="number" min="0" step="0.01" />
              <Field label="Pasajeros minimos" name="minPassengers" type="number" min="1" step="1" />
              <Field label="Pasajeros maximos" name="maxPassengers" type="number" min="1" step="1" />
              <DiscountSelect defaultValue="PERCENTAGE" />
              <Field label="Valor de descuento" name="discountValue" type="number" min="0" step="0.01" />
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <input name="active" type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300" />
                Activa desde la creacion
              </label>
              <div className="flex items-end">
                <button type="submit" className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                  Crear regla
                </button>
              </div>
            </form>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Reglas persistidas</h3>
              <p className="mt-2 text-sm text-slate-600">Cada bloque representa una regla editable. La accion sigue usando las mismas server actions actuales.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              {rules.length} reglas
            </span>
          </div>

          <div className="grid gap-4">
            {rules.map((rule) => (
              <form key={rule.id} action={updatePricingRuleAction} className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5">
                <input type="hidden" name="id" value={rule.id} />

                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="text-lg font-semibold text-slate-900">{rule.destinationId || "Regla general"}</h4>
                      <StatusBadge value={rule.active ? "ACTIVE" : "INACTIVE"} label={rule.active ? "Activa" : "Inactiva"} />
                    </div>
                    <p className="mt-2 text-sm text-slate-600">Rango de ocupacion: {rule.minPassengers} a {rule.maxPassengers} pasajeros.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button type="submit" className="rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                      Guardar
                    </button>
                    <button
                      type="submit"
                      formAction={deletePricingRuleAction}
                      className="rounded-full border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Field label="Destino externo" name="destinationId" required={false} defaultValue={rule.destinationId} />
                  <Field label="Precio base" name="basePrice" type="number" min="0" step="0.01" defaultValue={rule.basePrice.toString()} />
                  <Field label="Pasajeros minimos" name="minPassengers" type="number" min="1" step="1" defaultValue={rule.minPassengers} />
                  <Field label="Pasajeros maximos" name="maxPassengers" type="number" min="1" step="1" defaultValue={rule.maxPassengers} />
                  <DiscountSelect defaultValue={rule.discountType} />
                  <Field label="Valor de descuento" name="discountValue" type="number" min="0" step="0.01" defaultValue={rule.discountValue.toString()} />
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                    <input name="active" type="checkbox" defaultChecked={rule.active} className="h-4 w-4 rounded border-slate-300" />
                    Mantener activa
                  </label>
                </div>
              </form>
            ))}

            {rules.length === 0 ? (
              <EmptyState title="No hay reglas cargadas" description="Crea la primera regla para mostrar como se determina el pricing del sistema." />
            ) : null}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
