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
import { TableReportButtons } from "@/components/table-report-buttons";

import { buildCheckoutSummary, enrichCheckoutWithTripDetails } from "@/lib/payments/checkout";

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

  const enrichedCheckoutSessions = await Promise.all(
    checkoutSessions.map(async (session) => {
      const summary = buildCheckoutSummary(session);
      const enriched = await enrichCheckoutWithTripDetails(summary);
      return {
        ...session,
        ...enriched,
      };
    })
  );

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
      {/* 3 metric cards: remove "Transacciones encontradas" */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Pendientes de pago" value={String(countByStatus.get("CREATED") ?? 0)} description="Listos para avanzar al pago." tone="amber" />
        <MetricCard title="Aprobados" value={String(countByStatus.get("PAID") ?? 0)} description="Transacciones acreditadas con éxito." tone="emerald" />
        <MetricCard
          title="Cancelados o rechazados"
          value={String((countByStatus.get("DENIED") ?? 0) + (countByStatus.get("CANCELED") ?? 0) + (countByStatus.get("EXPIRED") ?? 0))}
          description="Pagos no completados o expirados." tone="rose"
        />
      </div>

      <SectionCard>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Historial de cobros</h2>
            <p className="mt-2 text-sm text-slate-600">
              Sigue el estado del cobro, el monto a cobrar y el crédito a favor aplicado.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TableReportButtons role="admin" section="checkouts" />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              {totalCheckoutSessions} registros
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Search placeholder="Buscar por reserva, pasajero o código..." />
          <Link href="/admin/transactions" className="text-sm font-semibold text-sky-700 hover:underline">
            Ver auditoría detallada de cargos (legacy)
          </Link>
        </div>

        {enrichedCheckoutSessions.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No hay checkouts para este filtro" description="Prueba con otro término de búsqueda o vuelve a la lista completa." />
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {enrichedCheckoutSessions.map((checkout) => {
              const charge = chargeByCheckoutId.get(checkout.id);
              const isPaid = checkout.status === "PAID";

              return (
                <article
                  key={checkout.id}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm hover:border-sky-300 hover:bg-sky-50/20 transition-all duration-200"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: icon + info */}
                    <div className="flex gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500 shrink-0">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17h5" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">
                          {checkout.destinationName
                            ? `Destino: ${checkout.destinationName}`
                            : `Reserva #${checkout.reservationId}`}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          Pasajero: <span className="font-mono">{checkout.passengerUserId}</span>
                        </p>
                        {checkout.departureTime ? (
                          <p className="text-xs text-slate-500">
                            Salida: <span className="font-semibold text-slate-700">{formatDateTime(checkout.departureTime)}</span>
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400">Creado: {formatDateTime(checkout.createdAt)}</p>
                        )}
                        <p className="mt-1 text-sm text-slate-600">
                          {isPaid ? "Total cobrado: " : "Total a cobrar: "}
                          <strong className="text-slate-900 font-bold">{formatMoney(checkout.amountToCharge, checkout.currency)}</strong>
                        </p>
                        {checkout.creditApplied > 0 && (
                          <p className="text-xs text-sky-600 font-semibold">
                            Saldo aplicado: -{formatMoney(checkout.creditApplied, checkout.currency)}
                          </p>
                        )}
                        {charge && (
                          <details className="mt-2 text-xs text-slate-400">
                            <summary className="cursor-pointer hover:text-slate-600 outline-none select-none">Ver detalles técnicos</summary>
                            <div className="mt-2 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-600">
                              <p>ID Pago: <span className="font-mono break-all">{checkout.id}</span></p>
                              <p>ID Pool: <span className="font-mono break-all">{checkout.poolId}</span></p>
                              <p>Estado cargo: {humanizeStatus(charge.status)}</p>
                              {charge.transactionId && (
                                <p>Transacción: <span className="font-mono break-all">{charge.transactionId}</span></p>
                              )}
                              <p>Cobrado: {formatMoney(charge.amountCharged.toNumber(), charge.currency)}</p>
                            </div>
                          </details>
                        )}
                      </div>
                    </div>

                    {/* Right: status + actions */}
                    <div className="flex flex-col items-start gap-2 sm:items-end shrink-0">
                      <StatusBadge value={checkout.status} label={humanizeStatus(checkout.status)} />
                      {isPaid && (
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/checkout/${checkout.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-sky-600 hover:underline"
                          >
                            Ver recibo
                          </Link>
                          <Link
                            href={`/checkout/${checkout.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Descargar recibo PDF (se abre en nueva pestaña)"
                            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:border-rose-200 hover:bg-rose-50/20 hover:text-rose-600 transition-all duration-150"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                            PDF
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-600">
          <Pagination totalPages={totalPages} />
        </div>
      </SectionCard>
    </div>
  );
}
