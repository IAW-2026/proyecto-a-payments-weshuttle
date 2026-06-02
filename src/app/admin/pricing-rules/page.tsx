import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPricingRuleAction, updatePricingRuleAction } from "./actions";

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
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        min={min}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none ring-0 transition focus:border-slate-900"
      />
    </label>
  );
}

function DiscountSelect({ defaultValue }: { defaultValue: "PERCENTAGE" | "FIXED_AMOUNT" }) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-700">
      <span className="font-medium">Tipo de descuento</span>
      <select
        name="discountType"
        defaultValue={defaultValue}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900"
      >
        <option value="PERCENTAGE">PERCENTAGE</option>
        <option value="FIXED_AMOUNT">FIXED_AMOUNT</option>
      </select>
    </label>
  );
}

export default async function AdminPricingRulesPage({ searchParams }: PageProps) {
  const authContext = await requirePageRole(["admin"]);
  const params = await searchParams;
  const rules = await prisma.pricingRule.findMany({
    orderBy: [{ active: "desc" }, { destinationId: "asc" }, { minPassengers: "asc" }],
  });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Admin Payments
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Pricing Rules</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                Persisti reglas de precio para definir el maximo y el estimado de cada viaje segun destino y ocupacion.
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Admin authenticated: {authContext.clerkUserId}
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              Volver al inicio
            </Link>
          </div>

          {params.message ? (
            <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {params.message}
            </p>
          ) : null}

          {params.error ? (
            <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {params.error}
            </p>
          ) : null}

          <form action={createPricingRuleAction} className="mt-8 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Destino externo" name="destinationId" required={false} />
            <Field label="Precio base" name="basePrice" type="number" min="0" step="0.01" />
            <Field label="Pasajeros minimos" name="minPassengers" type="number" min="1" step="1" />
            <Field label="Pasajeros maximos" name="maxPassengers" type="number" min="1" step="1" />
            <DiscountSelect defaultValue="PERCENTAGE" />
            <Field label="Valor de descuento" name="discountValue" type="number" min="0" step="0.01" />
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
              <input name="active" type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300" />
              Activa
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Crear regla
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Reglas persistidas</h2>
              <p className="mt-2 text-sm text-slate-600">Cada fila se edita y guarda sin crear endpoints adicionales.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              {rules.length} reglas
            </span>
          </div>

          <div className="grid gap-4">
            {rules.map((rule) => (
              <form
                key={rule.id}
                action={updatePricingRuleAction}
                className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2 xl:grid-cols-[1.2fr_repeat(5,minmax(0,1fr))_auto_auto] xl:items-end"
              >
                <input type="hidden" name="id" value={rule.id} />
                <Field label="Destino externo" name="destinationId" required={false} defaultValue={rule.destinationId} />
                <Field label="Precio base" name="basePrice" type="number" min="0" step="0.01" defaultValue={rule.basePrice.toString()} />
                <Field label="Min" name="minPassengers" type="number" min="1" step="1" defaultValue={rule.minPassengers} />
                <Field label="Max" name="maxPassengers" type="number" min="1" step="1" defaultValue={rule.maxPassengers} />
                <DiscountSelect defaultValue={rule.discountType} />
                <Field label="Descuento" name="discountValue" type="number" min="0" step="0.01" defaultValue={rule.discountValue.toString()} />
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 xl:min-h-[46px]">
                  <input name="active" type="checkbox" defaultChecked={rule.active} className="h-4 w-4 rounded border-slate-300" />
                  {rule.active ? "Activa" : "Inactiva"}
                </label>
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Guardar
                </button>
              </form>
            ))}

            {rules.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                No hay reglas cargadas todavia.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
