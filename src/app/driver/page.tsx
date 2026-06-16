import Link from "next/link";
import { Prisma } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";
import { Search } from "@/components/search";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatMoney, humanizeStatus } from "@/components/ui/format";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { savePayoutAccountAction } from "./actions";

const PAGE_SIZE = 5;

type PageProps = {
  searchParams: Promise<{
    q?: string;
    page?: string;
    message?: string;
    error?: string;
  }>;
};

function parsePage(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function Field({
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

export default async function DriverPage({ searchParams }: PageProps) {
  const authContext = await requirePageRole(["driver"]);
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = parsePage(params.page);
  const where: Prisma.SettlementWhereInput = {
    driverUserId: authContext.clerkUserId,
    ...(q
      ? {
          poolId: {
            contains: q,
            mode: "insensitive",
          },
        }
      : {}),
  };

  const [
    payoutAccount,
    settlements,
    totalSettlements,
    completedSettlements,
    pendingSettlements,
    totalSettledAmount,
  ] = await Promise.all([
    prisma.payoutAccount.findFirst({
      where: {
        driverUserId: authContext.clerkUserId,
        status: "ACTIVE",
      },
      orderBy: { id: "asc" },
    }),
    prisma.settlement.findMany({
      where,
      orderBy: [{ settledAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.settlement.count({ where }),
    prisma.settlement.count({ where: { driverUserId: authContext.clerkUserId, status: "COMPLETED" } }),
    prisma.settlement.count({ where: { driverUserId: authContext.clerkUserId, status: "PENDING" } }),
    prisma.settlement.aggregate({
      _sum: { amount: true },
      where: { driverUserId: authContext.clerkUserId, status: "COMPLETED" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalSettlements / PAGE_SIZE));
  const settledAmount = totalSettledAmount._sum.amount?.toNumber() ?? 0;

  return (
    <AppShell
      role="driver"
      clerkUserId={authContext.clerkUserId}
      title="Cobros y liquidaciones"
      description="Configura la cuenta donde recibes pagos y revisa el estado operativo de tus liquidaciones de forma clara para la demo."
    >
      <div className="flex w-full flex-col gap-8">
        <SectionCard>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Driver Demo</p>
                <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
                  Controla donde cobras y cuanto ya fue liquidado.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                  Esta vista resume la cuenta activa, el historial de liquidaciones y el estado general de tus cobros para la presentacion.
                </p>
              </div>

              <Link
                href="/"
                className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-900 hover:text-slate-900 sm:w-auto"
              >
                Volver al inicio
              </Link>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-[24px] border border-emerald-100 bg-linear-to-br from-emerald-50 to-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Total liquidado</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">{formatMoney(settledAmount, "ARS")}</p>
                <p className="mt-2 text-sm text-slate-700">Fondos ya transferidos a tu cuenta activa.</p>
              </div>
              <div className="rounded-[24px] border border-sky-100 bg-linear-to-br from-sky-50 to-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Cuenta activa</p>
                <p className="mt-3 text-lg font-semibold text-slate-900">{payoutAccount?.alias ?? payoutAccount?.accountReference ?? "Sin configurar"}</p>
                <div className="mt-3">
                  <StatusBadge value={payoutAccount?.status ?? "INACTIVE"} label={payoutAccount ? humanizeStatus(payoutAccount.status) : "Pendiente"} />
                </div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Estado operativo</p>
                <p className="mt-3 text-lg font-semibold text-slate-900">
                  {completedSettlements} completadas, {pendingSettlements} pendientes
                </p>
                <p className="mt-2 text-sm text-slate-700">Ideal para explicar rapidamente si el conductor ya cobro o sigue a la espera.</p>
              </div>
            </div>

            {params.message ? <AlertBanner tone="success">{params.message}</AlertBanner> : null}
            {params.error ? <AlertBanner tone="danger">{params.error}</AlertBanner> : null}
          </div>
        </SectionCard>

        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard id="payout-account" className="scroll-mt-24">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Cuenta de cobro</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Define la referencia donde deben liquidarse tus viajes. No cambia el flujo financiero: solo organiza mejor la informacion para la demo.
                </p>
              </div>
              {payoutAccount ? <StatusBadge value={payoutAccount.status} label={humanizeStatus(payoutAccount.status)} /> : null}
            </div>

            {payoutAccount ? (
              <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                <dl className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-slate-900">Proveedor</dt>
                    <dd className="mt-1">{payoutAccount.provider}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-900">Estado</dt>
                    <dd className="mt-1">{humanizeStatus(payoutAccount.status)}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-slate-900">Referencia de cobro</dt>
                    <dd className="mt-1 break-all">{payoutAccount.accountReference}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-slate-900">Alias visible</dt>
                    <dd className="mt-1">{payoutAccount.alias ?? "Sin alias configurado"}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="mt-6">
                <EmptyState
                  title="Aun no hay una cuenta activa"
                  description="Carga una referencia de cobro para mostrar adonde deberian enviarse las liquidaciones del conductor."
                />
              </div>
            )}

            <form action={savePayoutAccountAction} className="mt-6 grid gap-4 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <input type="hidden" name="q" value={q} />
              <input type="hidden" name="page" value={String(page)} />
              <Field
                label="Referencia de cobro"
                name="accountReference"
                defaultValue={payoutAccount?.accountReference ?? ""}
                placeholder="mp_acc_driver_01"
                required
                helpText="Ejemplo: identificador de cuenta de Mercado Pago, CVU o referencia interna de pruebas."
              />
              <Field
                label="Alias"
                name="alias"
                defaultValue={payoutAccount?.alias ?? ""}
                placeholder="driver01-cvu"
                helpText="Nombre corto para que la cuenta sea facil de reconocer durante la demo."
              />
              <button type="submit" className="rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Guardar cuenta de cobro
              </button>
            </form>
          </SectionCard>

          <SectionCard id="settlements" className="scroll-mt-24">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Liquidaciones</h3>
                <p className="mt-2 text-sm text-slate-600">Busca por pool para ubicar rapidamente un viaje y explicar si ya fue liquidado o sigue pendiente.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                {totalSettlements} registros
              </span>
            </div>

            <div className="mt-5">
              <Search placeholder="Buscar por pool..." />
            </div>

            {settlements.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="No hay liquidaciones para este filtro"
                  description="Prueba con otro pool o elimina la busqueda para volver a ver el historial completo del conductor."
                />
              </div>
            ) : (
              <>
                <div className="mt-6 space-y-3 md:hidden">
                  {settlements.map((settlement) => (
                    <article key={settlement.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">Pool {settlement.poolId}</p>
                          <p className="mt-1 text-sm text-slate-600">{formatMoney(settlement.amount.toNumber(), settlement.currency)}</p>
                        </div>
                        <StatusBadge value={settlement.status} label={humanizeStatus(settlement.status)} />
                      </div>
                      <p className="mt-3 text-xs text-slate-500">{settlement.settledAt ? formatDateTime(settlement.settledAt) : "Aun no se registro fecha de liquidacion"}</p>
                    </article>
                  ))}
                </div>

                <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <caption className="sr-only">Liquidaciones del conductor</caption>
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Pool</th>
                        <th className="px-4 py-3 font-semibold">Monto</th>
                        <th className="px-4 py-3 font-semibold">Estado</th>
                        <th className="px-4 py-3 font-semibold">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                      {settlements.map((settlement) => (
                        <tr key={settlement.id}>
                          <td className="px-4 py-4 align-top font-medium text-slate-900">{settlement.poolId}</td>
                          <td className="px-4 py-4 align-top">{formatMoney(settlement.amount.toNumber(), settlement.currency)}</td>
                          <td className="px-4 py-4 align-top">
                            <StatusBadge value={settlement.status} label={humanizeStatus(settlement.status)} />
                          </td>
                          <td className="px-4 py-4 align-top">{settlement.settledAt ? formatDateTime(settlement.settledAt) : "Pendiente"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-600">
              <Pagination totalPages={totalPages} />
            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
