import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Pagination } from "@/components/pagination";
import { Search } from "@/components/search";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatMoney, humanizeStatus } from "@/components/ui/format";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

type PageSearchParams = {
  q?: string;
  page?: string;
};

function parsePage(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export async function AdminCheckoutSessionsView({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = parsePage(params.page);

  const where: Prisma.CheckoutSessionWhereInput = q
    ? {
        OR: [
          { id: { contains: q, mode: "insensitive" } },
          { poolId: { contains: q, mode: "insensitive" } },
          { reservationId: { contains: q, mode: "insensitive" } },
          { passengerUserId: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [checkoutSessions, totalCheckoutSessions, checkoutStats] = await Promise.all([
    prisma.checkoutSession.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.checkoutSession.count({ where }),
    prisma.checkoutSession.groupBy({
      by: ["status"],
      _count: { id: true },
      where,
    }),
  ]);

  const charges = checkoutSessions.length
    ? await prisma.charge.findMany({
        where: {
          checkoutSessionId: {
            in: checkoutSessions.map((checkout) => checkout.id),
          },
        },
        orderBy: [{ processedAt: "desc" }, { createdAt: "desc" }],
      })
    : [];

  const chargeByCheckoutId = new Map<string, (typeof charges)[number]>();

  for (const charge of charges) {
    if (charge.checkoutSessionId && !chargeByCheckoutId.has(charge.checkoutSessionId)) {
      chargeByCheckoutId.set(charge.checkoutSessionId, charge);
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCheckoutSessions / PAGE_SIZE));
  const countByStatus = new Map(checkoutStats.map((entry) => [entry.status, entry._count.id]));

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Checkouts visibles" value={String(totalCheckoutSessions)} description="Resultados para el filtro actual." tone="sky" />
        <MetricCard title="Creados" value={String(countByStatus.get("CREATED") ?? 0)} description="Listos para avanzar al pago." tone="amber" />
        <MetricCard title="Pagados" value={String(countByStatus.get("PAID") ?? 0)} description="Checkouts ya acreditados." tone="emerald" />
        <MetricCard
          title="Con friccion"
          value={String((countByStatus.get("DENIED") ?? 0) + (countByStatus.get("CANCELED") ?? 0) + (countByStatus.get("EXPIRED") ?? 0))}
          description="Rechazados, cancelados o expirados." tone="rose"
        />
      </div>

      <SectionCard>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Pagos y checkouts</h2>
            <p className="mt-2 text-sm text-slate-600">
              Sigue el estado del checkout, el monto a cobrar, el credito aplicado y la relacion con el cargo final.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            {totalCheckoutSessions} registros
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Search placeholder="Buscar por checkout, pool, reserva o pasajero..." />
          <Link href="/admin/transactions" className="text-sm font-semibold text-sky-700 hover:underline">
            Ver auditoria de cargos
          </Link>
        </div>

        {checkoutSessions.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No hay checkouts para este filtro" description="Prueba con otro termino de busqueda o vuelve a la lista completa." />
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-3 xl:hidden">
              {checkoutSessions.map((checkout) => {
                const charge = chargeByCheckoutId.get(checkout.id);

                return (
                  <article key={checkout.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">Reserva {checkout.reservationId}</p>
                        <p className="mt-1 text-xs text-slate-500">Checkout {checkout.id}</p>
                        <p className="mt-1 text-xs text-slate-500">Pool {checkout.poolId}</p>
                      </div>
                      <StatusBadge value={checkout.status} label={humanizeStatus(checkout.status)} />
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-slate-600">
                      <p>Total a cobrar: <span className="font-semibold text-slate-900">{formatMoney(checkout.amountToCharge.toNumber(), checkout.currency)}</span></p>
                      <p>Credito aplicado: {formatMoney(checkout.creditApplied.toNumber(), checkout.currency)}</p>
                      <p>Pasajero: {checkout.passengerUserId}</p>
                      <p>Cargo final: {charge ? humanizeStatus(charge.status) : "Sin cargo asociado"}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
                      <Link href={`/checkout/${checkout.id}`} className="text-sky-700 hover:underline">
                        Abrir checkout
                      </Link>
                      {charge ? (
                        <Link href="/admin/transactions" className="text-slate-700 hover:underline">
                          Ver cargo asociado
                        </Link>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200 xl:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <caption className="sr-only">Checkouts registrados</caption>
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Checkout</th>
                    <th className="px-4 py-3 font-semibold">Pasajero</th>
                    <th className="px-4 py-3 font-semibold">Montos</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Cargo asociado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                  {checkoutSessions.map((checkout) => {
                    const charge = chargeByCheckoutId.get(checkout.id);

                    return (
                      <tr key={checkout.id}>
                        <td className="px-4 py-4 align-top">
                          <Link href={`/checkout/${checkout.id}`} className="font-medium text-slate-900 hover:text-sky-700 hover:underline">
                            {checkout.id}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">Reserva {checkout.reservationId}</p>
                          <p className="mt-1 text-xs text-slate-500">Pool {checkout.poolId}</p>
                        </td>
                        <td className="px-4 py-4 align-top text-sm text-slate-600">{checkout.passengerUserId}</td>
                        <td className="px-4 py-4 align-top">
                          <p className="font-medium text-slate-900">Cobrar: {formatMoney(checkout.amountToCharge.toNumber(), checkout.currency)}</p>
                          <p className="mt-1 text-xs text-slate-500">Maximo: {formatMoney(checkout.maxPrice.toNumber(), checkout.currency)}</p>
                          <p className="mt-1 text-xs text-slate-500">Credito aplicado: {formatMoney(checkout.creditApplied.toNumber(), checkout.currency)}</p>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <StatusBadge value={checkout.status} label={humanizeStatus(checkout.status)} />
                          <p className="mt-2 text-xs text-slate-500">Creado: {formatDateTime(checkout.createdAt)}</p>
                          <p className="mt-1 text-xs text-slate-500">Expira: {formatDateTime(checkout.expiresAt)}</p>
                        </td>
                        <td className="px-4 py-4 align-top text-xs text-slate-500">
                          {charge ? (
                            <>
                              <p className="font-medium text-slate-900">{humanizeStatus(charge.status)}</p>
                              <p className="mt-1">Txn {charge.transactionId}</p>
                              <p className="mt-1">Cobrado: {formatMoney(charge.amountCharged.toNumber(), charge.currency)}</p>
                            </>
                          ) : (
                            <span>Sin cargo asociado</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
  );
}
