import Link from "next/link";
import { Prisma } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";
import { Search } from "@/components/search";
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

function StatusBadge({ value }: { value: string }) {
  const colors =
    value === "COMPLETED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : value === "PENDING"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-rose-200 bg-rose-50 text-rose-700";

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${colors}`}>{value}</span>;
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
  const [payoutAccount, settlements, totalSettlements] = await Promise.all([
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
  ]);
  const totalPages = Math.max(1, Math.ceil(totalSettlements / PAGE_SIZE));

  return (
    <AppShell
      role="driver"
      clerkUserId={authContext.clerkUserId}
      title="Cuenta de cobro y liquidaciones"
      description="Configura donde recibes pagos y revisa el historico de liquidaciones asociadas a tus pools."
    >
      <div className="flex w-full flex-col gap-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Driver Payments</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">Cuenta de cobro y liquidaciones</h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                Configura donde recibes pagos y revisa el historico de liquidaciones asociadas a tus pools.
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Usuario autenticado: {authContext.clerkUserId}
              </p>
            </div>

            <Link href="/" className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900">
              Volver al inicio
            </Link>
          </div>

          {params.message ? (
            <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{params.message}</p>
          ) : null}

          {params.error ? (
            <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p>
          ) : null}
        </section>

        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <section id="payout-account" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold text-slate-900">Cuenta de cobro activa</h2>

            {payoutAccount ? (
              <dl className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                <div><dt className="font-semibold text-slate-900">Proveedor</dt><dd className="mt-1">{payoutAccount.provider}</dd></div>
                <div><dt className="font-semibold text-slate-900">Estado</dt><dd className="mt-1">{payoutAccount.status}</dd></div>
                <div className="sm:col-span-2"><dt className="font-semibold text-slate-900">Referencia</dt><dd className="mt-1 break-all">{payoutAccount.accountReference}</dd></div>
                <div className="sm:col-span-2"><dt className="font-semibold text-slate-900">Alias</dt><dd className="mt-1">{payoutAccount.alias ?? "Sin alias"}</dd></div>
              </dl>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                No tienes una cuenta de cobro activa cargada todavia.
              </p>
            )}

            <form action={savePayoutAccountAction} className="mt-6 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <input type="hidden" name="q" value={q} />
              <input type="hidden" name="page" value={String(page)} />
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span className="font-medium">Referencia de cobro</span>
                <input name="accountReference" defaultValue={payoutAccount?.accountReference ?? ""} placeholder="mp_acc_driver_01" required className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900" />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span className="font-medium">Alias</span>
                <input name="alias" defaultValue={payoutAccount?.alias ?? ""} placeholder="driver01-cvu" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900" />
              </label>
              <button type="submit" className="rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
                Guardar cuenta de cobro
              </button>
            </form>
          </section>

          <section id="settlements" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Liquidaciones</h2>
                <p className="mt-2 text-sm text-slate-600">Busqueda por `pool_id` y paginacion por URL.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                {totalSettlements} registros
              </span>
            </div>

            <div className="mt-5">
              <Search placeholder="Buscar por pool_id..." />
            </div>

            {settlements.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">No hay liquidaciones para los filtros actuales.</p>
            ) : (
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
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
                        <td className="px-4 py-3 font-medium text-slate-900">{settlement.poolId}</td>
                        <td className="px-4 py-3">{settlement.currency} {settlement.amount.toNumber().toFixed(2)}</td>
                        <td className="px-4 py-3"><StatusBadge value={settlement.status} /></td>
                        <td className="px-4 py-3">{settlement.settledAt ? settlement.settledAt.toISOString() : "Pendiente"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-600">
              <Pagination totalPages={totalPages} />
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
