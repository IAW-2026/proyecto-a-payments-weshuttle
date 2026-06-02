import { Prisma } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";
import { Search } from "@/components/search";
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

function StatusBadge({ value }: { value: string }) {
  const colors =
    value === "PAID"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : value === "PENDING"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-rose-200 bg-rose-50 text-rose-700";

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${colors}`}>{value}</span>;
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
      include: {
        discounts: true,
        paymentMethod: true,
      },
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
      description="Visualiza cobros individuales, descuentos asociados y su trazabilidad operativa."
    >
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Cobros registrados</h2>
            <p className="mt-2 text-sm text-slate-600">Busqueda por `pool_id`, `reservation_id` o `passenger_user_id`.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            {totalCharges} registros
          </span>
        </div>

        <div className="mt-5">
          <Search placeholder="Buscar por pool, reserva o pasajero..." />
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Reserva</th>
                <th className="px-4 py-3 font-semibold">Pasajero</th>
                <th className="px-4 py-3 font-semibold">Monto</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Metodo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
              {charges.map((charge) => (
                <tr key={charge.id}>
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium text-slate-900">{charge.reservationId}</p>
                    <p className="mt-1 text-xs text-slate-500">Pool: {charge.poolId}</p>
                    <p className="mt-1 text-xs text-slate-500">Txn: {charge.transactionId}</p>
                  </td>
                  <td className="px-4 py-3 align-top">{charge.passengerUserId}</td>
                  <td className="px-4 py-3 align-top">
                    <p>Max: {charge.currency} {charge.maxPrice.toNumber().toFixed(2)}</p>
                    <p className="mt-1 text-xs text-slate-500">Efectivo: {charge.effectivePrice ? `${charge.currency} ${charge.effectivePrice.toNumber().toFixed(2)}` : "No disponible"}</p>
                    <p className="mt-1 text-xs text-slate-500">Descuentos: {charge.discounts.length}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge value={charge.status} />
                    <p className="mt-2 text-xs text-slate-500">{charge.processedAt ? charge.processedAt.toISOString() : "Pendiente"}</p>
                    <p className="mt-1 text-xs text-slate-500">{charge.rejectionReason ?? "Sin rechazo"}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {charge.paymentMethod ? (
                      <>
                        <p>{charge.paymentMethod.cardBrand} {charge.paymentMethod.cardLast4}</p>
                        <p className="mt-1 text-xs text-slate-500">{charge.paymentMethod.paymentType}</p>
                      </>
                    ) : (
                      <span className="text-slate-500">Sin metodo</span>
                    )}
                  </td>
                </tr>
              ))}
              {charges.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No hay transacciones para los filtros actuales.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-600">
          <Pagination totalPages={totalPages} />
        </div>
      </section>
    </AppShell>
  );
}
