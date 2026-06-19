import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney } from "@/components/ui/format";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPricingRuleAction, deletePricingRuleAction, updatePricingRuleAction } from "./actions";
import { TableReportButtons } from "@/components/table-report-buttons";

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
        <option value="PERCENTAGE">Porcentaje (%)</option>
        <option value="FIXED_AMOUNT">Monto fijo ($)</option>
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
      title="Tarifas y reglas"
      description="Configura los precios base, descuentos y reglas de ocupación aplicados a los viajes."
    >
      <div className="flex flex-col gap-8">
        <SectionCard>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Configuración de Tarifas</p>
                <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Reglas de precios activas</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                  Crea y ajusta las reglas de tarifas para definir el precio base, rangos de pasajeros y los descuentos de los viajes compartidos.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/admin/pricing-rules/simulator"
                  className="inline-flex items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 shadow-sm hover:bg-sky-100 transition cursor-pointer"
                >
                  Probar estimador de tarifas
                </Link>
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-900 hover:text-slate-900"
                >
                  Volver a inicio
                </Link>
              </div>
            </div>

            {params.message ? <AlertBanner tone="success">{params.message}</AlertBanner> : null}
            {params.error ? <AlertBanner tone="danger">{params.error}</AlertBanner> : null}

            <form action={createPricingRuleAction} className="grid gap-4 rounded-[26px] border border-slate-200 bg-slate-50/80 p-5 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Ruta / Destino" name="destinationId" required={false} />
              <Field label="Precio base ($)" name="basePrice" type="number" min="0" step="0.01" />
              <Field label="Mínimo pasajeros" name="minPassengers" type="number" min="1" step="1" />
              <Field label="Máximo pasajeros" name="maxPassengers" type="number" min="1" step="1" />
              <DiscountSelect defaultValue="PERCENTAGE" />
              <Field label="Valor de descuento" name="discountValue" type="number" min="0" step="0.01" />
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <input name="active" type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300" />
                Activa desde la creación
              </label>
              <div className="flex items-end">
                <button type="submit" className="w-full rounded-full bg-sky-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-600/15 hover:bg-sky-500 hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer">
                  Crear nueva regla
                </button>
              </div>
            </form>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Listado de reglas</h3>
              <p className="mt-2 text-sm text-slate-600">Cada bloque resume una regla de precio. Presiona en &quot;Modificar regla&quot; para abrir el editor.</p>
            </div>
            <div className="flex items-center gap-3">
              <TableReportButtons role="admin" section="pricing-rules" />
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                {rules.length} reglas activas
              </span>
            </div>
          </div>

          <div className="grid gap-4">
            {rules.map((rule) => {
              const discountLabel = rule.discountType === "PERCENTAGE" ? `${rule.discountValue}%` : `$${rule.discountValue}`;
              const destinationLabel = rule.destinationId ? `Ruta exclusiva: ${rule.destinationId}` : "Regla general aplicable a todas las rutas";

              return (
                <details key={rule.id} className="group rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between cursor-pointer outline-none select-none list-none">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="text-lg font-semibold text-slate-900">{rule.destinationId || "Regla general"}</h4>
                        <StatusBadge value={rule.active ? "ACTIVE" : "INACTIVE"} label={rule.active ? "Activa" : "Inactiva"} />
                      </div>
                      <div className="mt-2 text-sm text-slate-600 space-y-1">
                        <p className="font-medium text-slate-500">{destinationLabel}</p>
                        <p>Precio base: <span className="font-semibold text-slate-900">{formatMoney(rule.basePrice.toNumber(), "ARS")}</span> | Descuento: <span className="font-semibold text-sky-700">{discountLabel}</span></p>
                        <p>Rango de ocupación: {rule.minPassengers} a {rule.maxPassengers} pasajeros</p>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition group-open:bg-sky-50 group-open:text-sky-900 group-open:border-sky-200">
                      <span>Modificar regla</span>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transform transition group-open:rotate-180">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </summary>

                  <form action={updatePricingRuleAction} className="mt-5 border-t border-slate-100 pt-5">
                    <input type="hidden" name="id" value={rule.id} />
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <Field label="Ruta / Destino" name="destinationId" required={false} defaultValue={rule.destinationId} />
                      <Field label="Precio base ($)" name="basePrice" type="number" min="0" step="0.01" defaultValue={rule.basePrice.toString()} />
                      <Field label="Mínimo pasajeros" name="minPassengers" type="number" min="1" step="1" defaultValue={rule.minPassengers} />
                      <Field label="Máximo pasajeros" name="maxPassengers" type="number" min="1" step="1" defaultValue={rule.maxPassengers} />
                      <DiscountSelect defaultValue={rule.discountType} />
                      <Field label="Valor de descuento" name="discountValue" type="number" min="0" step="0.01" defaultValue={rule.discountValue.toString()} />
                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                        <input name="active" type="checkbox" defaultChecked={rule.active} className="h-4 w-4 rounded border-slate-300" />
                        Mantener activa
                      </label>
                      <div className="flex items-end gap-2 justify-end sm:col-span-2 xl:col-span-1">
                        <button type="submit" className="rounded-full bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-600/15 hover:bg-sky-500 transition cursor-pointer">
                          Guardar cambios
                        </button>
                        <button
                          type="submit"
                          formAction={deletePricingRuleAction}
                          className="rounded-full border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </form>
                </details>
              );
            })}

            {rules.length === 0 ? (
              <EmptyState title="No hay reglas cargadas" description="Crea la primera regla para comenzar." />
            ) : null}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
