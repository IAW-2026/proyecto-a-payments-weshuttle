import { Prisma } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";
import { Search } from "@/components/search";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatMoney, humanizeStatus } from "@/components/ui/format";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
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

export default async function AdminTransactionsPage({ searchParams }: PageProps) {
  const authContext = await requirePageRole(["admin"]);
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = parsePage(params.page);
  const where: Prisma.ChargeWhereInput = q
    ? {
        OR: [
          { poolId: { contains: q, mode: "insensitive" } },
          { reservationId: { contains: q, mode: "insensitive" } },
          { passengerUserId: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};
  const [charges, totalCharges] = await Promise.all([
    prisma.charge.findMany({
      where,
      orderBy: [{ processedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.charge.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCharges / PAGE_SIZE));

  return (
    <AppShell
      role="admin"
      clerkUserId={authContext.clerkUserId}
      title="Transacciones"
      description="Vista detallada de cobros para explicar que paso en cada reserva sin entrar en ruido innecesario."
    >
      <SectionCard>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Cobros registrados</h2>
            <p className="mt-2 text-sm text-slate-600">Busca por pool, reserva o pasajero para encontrar rapidamente una transaccion puntual.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            {totalCharges} registros
          </span>
        </div>

        <div className="mt-5">
          <Search placeholder="Buscar por pool, reserva o pasajero..." />
        </div>

        {charges.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No hay transacciones para este filtro" description="Prueba con otro termino de busqueda o vuelve a la lista completa para revisar el historial." />
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-3 lg:hidden">
              {charges.map((charge) => (
                <article key={charge.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">Reserva {charge.reservationId}</p>
                      <p className="mt-1 text-xs text-slate-500">Pool {charge.poolId}</p>
                    </div>
                    <StatusBadge value={charge.status} label={humanizeStatus(charge.status)} />
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600">
                    <p>Monto cobrado: <span className="font-semibold text-slate-900">{formatMoney(charge.amountCharged.toNumber(), charge.currency)}</span></p>
                    <p>Credito aplicado: {formatMoney(charge.creditApplied.toNumber(), charge.currency)}</p>
                    <p>Precio final: {charge.finalTripPrice !== null ? formatMoney(charge.finalTripPrice.toNumber(), charge.currency) : "Pendiente"}</p>
                    <p>Procesado: {formatDateTime(charge.processedAt)}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200 lg:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <caption className="sr-only">Cobros registrados</caption>
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Reserva</th>
                    <th className="px-4 py-3 font-semibold">Pasajero</th>
                    <th className="px-4 py-3 font-semibold">Montos</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Trazabilidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                  {charges.map((charge) => (
                    <tr key={charge.id}>
                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-slate-900">{charge.reservationId}</p>
                        <p className="mt-1 text-xs text-slate-500">Pool {charge.poolId}</p>
                        <p className="mt-1 text-xs text-slate-500">Txn {charge.transactionId}</p>
                      </td>
                      <td className="px-4 py-4 align-top text-sm text-slate-600">{charge.passengerUserId}</td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-medium text-slate-900">Cobrado: {formatMoney(charge.amountCharged.toNumber(), charge.currency)}</p>
                        <p className="mt-1 text-xs text-slate-500">Maximo: {formatMoney(charge.maxPrice.toNumber(), charge.currency)}</p>
                        <p className="mt-1 text-xs text-slate-500">Credito aplicado: {formatMoney(charge.creditApplied.toNumber(), charge.currency)}</p>
                        <p className="mt-1 text-xs text-slate-500">Precio final: {charge.finalTripPrice !== null ? formatMoney(charge.finalTripPrice.toNumber(), charge.currency) : "Pendiente"}</p>
                        <p className="mt-1 text-xs text-slate-500">Credito generado: {formatMoney(charge.creditGranted.toNumber(), charge.currency)}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <StatusBadge value={charge.status} label={humanizeStatus(charge.status)} />
                        <p className="mt-2 text-xs text-slate-500">{formatDateTime(charge.processedAt)}</p>
                        <p className="mt-1 text-xs text-slate-500">{charge.rejectionReason ?? "Sin rechazo"}</p>
                      </td>
                      <td className="px-4 py-4 align-top text-xs text-slate-500">
                        <p>Checkout: {charge.checkoutSessionId ?? "No aplica"}</p>
                        <p className="mt-1">Finalizacion: {charge.poolPriceFinalizationJobId ?? "Pendiente"}</p>
                        <p className="mt-1">Proveedor: {charge.provider}</p>
                      </td>
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
    </AppShell>
  );
}
