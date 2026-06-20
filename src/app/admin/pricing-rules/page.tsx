import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AlertBanner } from "@/components/ui/alert-banner";
import { SectionCard } from "@/components/ui/section-card";
import { formatMoney } from "@/components/ui/format";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { savePricePerKmAction, saveOccupancyDiscountsAction } from "./actions";

type PageProps = {
  searchParams: Promise<{
    message?: string;
    error?: string;
  }>;
};

export default async function AdminPricingRulesPage({ searchParams }: PageProps) {
  const [authContext, params, pricePerKmSetting, dbRules] = await Promise.all([
    requirePageRole(["admin"]),
    searchParams,
    prisma.systemSetting.findUnique({
      where: { key: "price_per_km" },
    }),
    prisma.pricingRule.findMany({
      where: { destinationId: null },
      orderBy: { minPassengers: "asc" },
    }),
  ]);

  const pricePerKm = pricePerKmSetting ? parseFloat(pricePerKmSetting.value) : 35.00;

  // Build the list of 1 to 15 rules
  const rulesMap = new Map<number, number>();
  dbRules.forEach((r) => {
    rulesMap.set(r.minPassengers, r.discountValue.toNumber());
  });

  const passengerCounts = Array.from({ length: 15 }, (_, i) => i + 1);

  return (
    <AppShell
      role="admin"
      clerkUserId={authContext.clerkUserId}
      title="Tarifas y reglas"
      description="Configura los precios globales por kilómetro y las reglas de descuento según la cantidad de pasajeros en el pool."
    >
      <div className="flex flex-col gap-8">
        <SectionCard>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Configuración Global</p>
                <h2 className="mt-2 text-3xl font-bold text-primary sm:text-4xl">Tarifas y Descuentos</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-gray sm:text-base">
                  Ajusta el precio por kilómetro y los descuentos escalonados aplicables a todos los destinos de viaje de la plataforma.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/admin/pricing-rules/simulator"
                  className="inline-flex items-center justify-center rounded-lg border border-primary/20 bg-white px-4 py-2 text-sm font-medium text-primary shadow-sm hover:border-primary/50 hover:bg-primary/5 transition cursor-pointer"
                >
                  Probar estimador de tarifas
                </Link>
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center rounded-lg border border-primary/20 bg-white px-4 py-2 text-sm font-medium text-primary shadow-sm hover:border-primary/50 hover:bg-primary/5 transition"
                >
                  Volver a inicio
                </Link>
              </div>
            </div>

            {params.message ? <AlertBanner tone="success">{params.message}</AlertBanner> : null}
            {params.error ? <AlertBanner tone="danger">{params.error}</AlertBanner> : null}

            {/* Price Per Km Setting Form */}
            <form action={savePricePerKmAction} className="rounded-xl border border-outline-custom bg-surface p-6">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                  <label htmlFor="pricePerKm" className="text-sm font-semibold text-primary block mb-2">
                    Precio base por kilómetro (ARS)
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-gray font-medium">$</span>
                    <input
                      id="pricePerKm"
                      name="pricePerKm"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      defaultValue={pricePerKm.toFixed(2)}
                      className="w-full rounded-lg border border-outline-custom bg-white pl-8 pr-4 py-3 text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                      placeholder="35.00"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/15 hover:bg-primary-hover hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer"
                >
                  Guardar tarifa base
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-gray">
                Este valor se utiliza para calcular el precio base de cada viaje (Distancia en Km × Tarifa base).
              </p>
            </form>
          </div>
        </SectionCard>

        {/* Occupancy Discounts Table Form */}
        <SectionCard>
          <div className="mb-6">
            <h3 className="text-xl font-bold text-primary">Tabla General de Descuentos por Ocupación</h3>
            <p className="mt-2 text-sm text-slate-gray">
              Configura el porcentaje de descuento a aplicar sobre la tarifa base según la cantidad de pasajeros finales confirmados en el viaje.
            </p>
          </div>

          <form action={saveOccupancyDiscountsAction}>
            <div className="overflow-hidden rounded-xl border border-outline-custom bg-white">
              <table className="w-full border-collapse text-left text-sm text-slate-gray">
                <thead className="bg-surface text-xs font-bold uppercase tracking-wider text-primary">
                  <tr>
                    <th scope="col" className="px-6 py-4">Pasajeros en el Pool</th>
                    <th scope="col" className="px-6 py-4">Descuento (%)</th>
                    <th scope="col" className="px-6 py-4">Ejemplo (ARS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {passengerCounts.map((count) => {
                    const discount = rulesMap.get(count) ?? 0;
                    return (
                      <tr key={count} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4 font-semibold text-primary">
                          {count} {count === 1 ? "pasajero" : "pasajeros"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 max-w-[150px]">
                            <input
                              type="number"
                              name={`discount-${count}`}
                              min="0"
                              max="100"
                              step="0.1"
                              required
                              defaultValue={discount}
                              className="w-full rounded-lg border border-outline-custom bg-surface px-3 py-2 text-center font-bold text-primary focus:border-primary focus:bg-white focus:outline-none transition"
                            />
                            <span className="font-bold text-slate-gray">%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-gray leading-relaxed">
                          Para un viaje base de $5.000:{" "}
                          <span className="font-semibold text-primary">
                            {formatMoney(5000 * (1 - discount / 100), "ARS")}
                          </span>{" "}
                          (ahorro de {formatMoney((5000 * discount) / 100, "ARS")})
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                className="rounded-lg bg-primary px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/15 hover:bg-primary-hover hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer"
              >
                Guardar tabla de descuentos
              </button>
            </div>
          </form>
        </SectionCard>
      </div>
    </AppShell>
  );
}
