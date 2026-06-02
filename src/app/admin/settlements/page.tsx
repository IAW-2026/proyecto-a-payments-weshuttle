import Link from "next/link";
import { Prisma } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

type PageProps = {
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
};

function parsePage(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function buildQueryString(input: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  return params.toString();
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

export default async function AdminSettlementsPage({ searchParams }: PageProps) {
  const authContext = await requirePageRole(["admin"]);
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = parsePage(params.page);
  const where: Prisma.SettlementWhereInput = q
    ? {
        OR: [
          { poolId: { contains: q, mode: "insensitive" } },
          { driverUserId: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const [settlements, totalSettlements] = await Promise.all([
    prisma.settlement.findMany({
      where,
      include: { payoutAccount: true },
      orderBy: [{ settledAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.settlement.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalSettlements / PAGE_SIZE));

  return (
    <AppShell
      role="admin"
      clerkUserId={authContext.clerkUserId}
      title="Liquidaciones"
      description="Consulta el historico de fondos liquidados a conductores y sus cuentas asociadas."
    >
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Liquidaciones registradas</h2>
            <p className="mt-2 text-sm text-slate-600">Busqueda por `pool_id` o `driver_user_id`.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{totalSettlements} registros</span>
        </div>

        <form method="get" className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input name="q" defaultValue={q} placeholder="Buscar liquidacion" className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900" />
          <button type="submit" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">Buscar</button>
        </form>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Pool</th>
                <th className="px-4 py-3 font-semibold">Conductor</th>
                <th className="px-4 py-3 font-semibold">Monto</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Cuenta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
              {settlements.map((settlement) => (
                <tr key={settlement.id}>
                  <td className="px-4 py-3 align-top font-medium text-slate-900">{settlement.poolId}</td>
                  <td className="px-4 py-3 align-top">{settlement.driverUserId}</td>
                  <td className="px-4 py-3 align-top">{settlement.currency} {settlement.amount.toNumber().toFixed(2)}</td>
                  <td className="px-4 py-3 align-top"><StatusBadge value={settlement.status} /><p className="mt-2 text-xs text-slate-500">{settlement.settledAt ? settlement.settledAt.toISOString() : "Pendiente"}</p></td>
                  <td className="px-4 py-3 align-top">{settlement.payoutAccount ? <><p className="break-all">{settlement.payoutAccount.accountReference}</p><p className="mt-1 text-xs text-slate-500">{settlement.payoutAccount.alias ?? "Sin alias"}</p></> : <span className="text-slate-500">Sin cuenta asociada</span>}</td>
                </tr>
              ))}
              {settlements.length === 0 ? <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No hay liquidaciones para los filtros actuales.</td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-600">
          <span>Pagina {page} de {totalPages}</span>
          <div className="flex items-center gap-3">
            {page > 1 ? <Link href={`/admin/settlements?${buildQueryString({ q, page: page - 1 })}`} className="rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900">Anterior</Link> : null}
            {page < totalPages ? <Link href={`/admin/settlements?${buildQueryString({ q, page: page + 1 })}`} className="rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900">Siguiente</Link> : null}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
