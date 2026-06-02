import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { savePaymentMethodAction } from "./actions";

type PageProps = {
  searchParams: Promise<{
    reservation_id?: string;
    message?: string;
    error?: string;
  }>;
};

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-700">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900"
      />
    </label>
  );
}

function Money({ amount, currency }: { amount: string | null; currency: string }) {
  if (!amount) {
    return <span className="text-slate-500">No disponible</span>;
  }

  return (
    <span>
      {currency} {Number(amount).toFixed(2)}
    </span>
  );
}

export default async function RiderPage({ searchParams }: PageProps) {
  const authContext = await requirePageRole(["rider"]);
  const params = await searchParams;
  const reservationId = params.reservation_id?.trim() || "";
  const paymentMethod = await prisma.paymentMethod.findFirst({
    where: {
      clerkUserId: authContext.clerkUserId,
      status: "ACTIVE",
    },
    orderBy: { id: "asc" },
  });
  const charge = reservationId
    ? await prisma.charge.findFirst({
        where: {
          reservationId,
          passengerUserId: authContext.clerkUserId,
        },
        include: {
          discounts: true,
          paymentMethod: true,
        },
      })
    : null;

  return (
    <AppShell
      role="rider"
      clerkUserId={authContext.clerkUserId}
      title="Mercado Pago y detalle de cobro"
      description="Gestiona tu medio de pago y consulta el resultado efectivo de tus reservas."
    >
      <div className="flex flex-col gap-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Rider Payments</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">Mercado Pago y detalle de cobro</h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                Vincula tu medio de pago y consulta el resultado efectivo de una reserva mediante su identificador.
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

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div id="payment-method">
            <InfoCard title="Tu medio de pago activo">
              {paymentMethod ? (
                <dl className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                  <div><dt className="font-semibold text-slate-900">Proveedor</dt><dd className="mt-1">{paymentMethod.provider}</dd></div>
                  <div><dt className="font-semibold text-slate-900">Titular</dt><dd className="mt-1">{paymentMethod.holderName}</dd></div>
                  <div><dt className="font-semibold text-slate-900">Tarjeta</dt><dd className="mt-1">{paymentMethod.cardBrand} terminada en {paymentMethod.cardLast4}</dd></div>
                  <div><dt className="font-semibold text-slate-900">Tipo</dt><dd className="mt-1">{paymentMethod.paymentType}</dd></div>
                  <div><dt className="font-semibold text-slate-900">BIN</dt><dd className="mt-1">{paymentMethod.cardBin}</dd></div>
                  <div><dt className="font-semibold text-slate-900">Estado</dt><dd className="mt-1">{paymentMethod.status}</dd></div>
                </dl>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                  No tienes un medio de pago activo cargado todavia.
                </p>
              )}

              <form action={savePaymentMethodAction} className="mt-6 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
                <input type="hidden" name="reservationId" value={reservationId} />
                <Field label="Titular" name="holderName" defaultValue={paymentMethod?.holderName} placeholder="Nombre y apellido" />
                <Field label="Token de Mercado Pago" name="providerToken" defaultValue={paymentMethod?.providerToken} placeholder="tok_test_mp_..." />
                <Field label="Marca" name="cardBrand" defaultValue={paymentMethod?.cardBrand} placeholder="VISA" />
                <Field label="BIN" name="cardBin" defaultValue={paymentMethod?.cardBin} placeholder="450995" />
                <Field label="Ultimos 4" name="cardLast4" defaultValue={paymentMethod?.cardLast4} placeholder="3704" />
                <label className="flex flex-col gap-2 text-sm text-slate-700">
                  <span className="font-medium">Tipo de tarjeta</span>
                  <select name="paymentType" defaultValue={paymentMethod?.paymentType ?? "CREDIT_CARD"} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900">
                    <option value="CREDIT_CARD">CREDIT_CARD</option>
                    <option value="DEBIT_CARD">DEBIT_CARD</option>
                  </select>
                </label>
                <div className="sm:col-span-2">
                  <button type="submit" className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
                    Guardar medio de pago
                  </button>
                </div>
              </form>
            </InfoCard>
          </div>

          <div id="reservation-detail">
            <InfoCard title="Detalle efectivo de una reserva">
              <form method="get" className="flex flex-col gap-3 sm:flex-row">
                <input name="reservation_id" defaultValue={reservationId} placeholder="res_100001" className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900" />
                <button type="submit" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                  Consultar
                </button>
              </form>

              {!reservationId ? (
                <p className="mt-5 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">Ingresa un `reservation_id` para ver el resultado del cobro.</p>
              ) : !charge ? (
                <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">No se encontro un cobro asociado a esa reserva para tu usuario.</p>
              ) : (
                <div className="mt-5 space-y-5">
                  <dl className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                    <div><dt className="font-semibold text-slate-900">Reserva</dt><dd className="mt-1 break-all">{charge.reservationId}</dd></div>
                    <div><dt className="font-semibold text-slate-900">Transaccion</dt><dd className="mt-1 break-all">{charge.transactionId}</dd></div>
                    <div><dt className="font-semibold text-slate-900">Precio maximo</dt><dd className="mt-1"><Money amount={charge.maxPrice.toString()} currency={charge.currency} /></dd></div>
                    <div><dt className="font-semibold text-slate-900">Precio efectivo</dt><dd className="mt-1"><Money amount={charge.effectivePrice?.toString() ?? null} currency={charge.currency} /></dd></div>
                    <div><dt className="font-semibold text-slate-900">Estado</dt><dd className="mt-1">{charge.status}</dd></div>
                    <div><dt className="font-semibold text-slate-900">Procesado</dt><dd className="mt-1">{charge.processedAt ? charge.processedAt.toISOString() : "Pendiente"}</dd></div>
                    <div className="sm:col-span-2"><dt className="font-semibold text-slate-900">Motivo de rechazo</dt><dd className="mt-1">{charge.rejectionReason ?? "Sin rechazo"}</dd></div>
                  </dl>

                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Descuentos aplicados</h3>
                    {charge.discounts.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">No se registraron descuentos para esta reserva.</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {charge.discounts.map((discount) => (
                          <div key={discount.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            <p className="font-semibold text-slate-900">{discount.type}</p>
                            <p className="mt-1">{charge.currency} {discount.amount.toNumber().toFixed(2)}</p>
                            <p className="mt-1">{discount.description ?? "Sin descripcion"}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </InfoCard>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
