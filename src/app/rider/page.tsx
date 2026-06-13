import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDemoCheckoutAction } from "./actions";

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
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-700">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-slate-900"
      />
    </label>
  );
}

function Money({ amount, currency }: { amount: string | null; currency: string }) {
  if (amount === null) {
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

  const [creditAccount, recentMovements, recentCheckouts, latestCheckout, latestCharge] = await Promise.all([
    prisma.creditAccount.findUnique({
      where: { userId: authContext.clerkUserId },
    }),
    prisma.creditMovement.findMany({
      where: { userId: authContext.clerkUserId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.checkoutSession.findMany({
      where: { passengerUserId: authContext.clerkUserId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    reservationId
      ? prisma.checkoutSession.findFirst({
          where: {
            reservationId,
            passengerUserId: authContext.clerkUserId,
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve(null),
    reservationId
      ? prisma.charge.findFirst({
          where: {
            reservationId,
            passengerUserId: authContext.clerkUserId,
          },
          orderBy: { processedAt: "desc" },
        })
      : Promise.resolve(null),
  ]);

  return (
    <AppShell
      role="rider"
      clerkUserId={authContext.clerkUserId}
      title="Checkouts y saldo a favor"
      description="Simula el pago de una reserva, consulta tu saldo disponible y revisa el estado financiero de tus viajes."
    >
      <div className="flex flex-col gap-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Rider Payments</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">Checkouts y saldo a favor</h2>
               <p className="mt-3 max-w-2xl text-sm text-slate-600">
                 Esta vista permite crear un checkout interno de Payments App, redirigir al usuario a su resumen y revisar el detalle financiero ya persistido.
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

        <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <div id="credit-balance" className="space-y-8">
            <InfoCard title="Tu saldo a favor disponible">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Balance actual</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {creditAccount?.currency ?? "ARS"} {(creditAccount?.balance.toNumber() ?? 0).toFixed(2)}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Este saldo se aplica automaticamente antes de cobrar por Mercado Pago.
                </p>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Ultimos movimientos</h3>
                <div className="mt-3 space-y-3">
                  {recentMovements.map((movement) => (
                    <div key={movement.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <p className="font-semibold text-slate-900">{movement.type}</p>
                      <p className="mt-1">{movement.currency} {movement.amount.toNumber().toFixed(2)}</p>
                      <p className="mt-1 text-xs text-slate-500">{movement.description ?? "Sin descripcion"}</p>
                    </div>
                  ))}
                  {recentMovements.length === 0 ? (
                    <p className="text-sm text-slate-500">Todavia no tienes movimientos de credito registrados.</p>
                  ) : null}
                </div>
              </div>
            </InfoCard>

            <InfoCard title="Tus ultimos checkouts">
              <div className="space-y-3">
                {recentCheckouts.map((checkout) => (
                  <div key={checkout.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">{checkout.reservationId}</p>
                    <p className="mt-1 text-xs text-slate-500">Pool: {checkout.poolId}</p>
                    <p className="mt-1 text-xs text-slate-500">Estado: {checkout.status}</p>
                    <p className="mt-1 text-xs text-slate-500">Cobro previsto: {checkout.currency} {checkout.amountToCharge.toNumber().toFixed(2)}</p>
                  </div>
                ))}
                {recentCheckouts.length === 0 ? (
                  <p className="text-sm text-slate-500">Todavia no tienes checkouts registrados.</p>
                ) : null}
              </div>
            </InfoCard>
          </div>

          <div className="space-y-8">
            <div id="checkout-demo">
              <InfoCard title="Simular checkout de una reserva">
                <p className="mb-4 text-sm text-slate-600">
                  Rider App debe redirigir al usuario a la URL interna del checkout. Desde alli, Payments App deriva a Mercado Pago Checkout Pro o permite simulacion demo si falta el token.
                </p>
                <form action={createDemoCheckoutAction} className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
                  <Field label="Reservation ID" name="reservationId" defaultValue={reservationId || "res_demo_new_001"} placeholder="res_demo_new_001" />
                  <Field label="Pool ID" name="poolId" defaultValue="pool_demo_checkout_new" placeholder="pool_demo_checkout_new" />
                  <Field label="Max price" name="maxPrice" type="number" defaultValue="5800" placeholder="5800" />
                  <Field label="Currency" name="currency" defaultValue="ARS" placeholder="ARS" />
                  <Field label="Success URL" name="successUrl" defaultValue="https://rider-app.local/success" placeholder="https://rider-app.local/success" />
                  <Field label="Failure URL" name="failureUrl" defaultValue="https://rider-app.local/failure" placeholder="https://rider-app.local/failure" />
                  <Field label="Pending URL" name="pendingUrl" defaultValue="https://rider-app.local/pending" placeholder="https://rider-app.local/pending" />
                  <div className="sm:col-span-2">
                    <button type="submit" className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
                      Crear checkout interno
                    </button>
                  </div>
                </form>
              </InfoCard>
            </div>

            <div id="reservation-detail">
              <InfoCard title="Detalle financiero de una reserva">
                <form method="get" className="flex flex-col gap-3 sm:flex-row">
                  <input name="reservation_id" defaultValue={reservationId} placeholder="res_paid_001" className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900" />
                  <button type="submit" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                    Consultar
                  </button>
                </form>

                {!reservationId ? (
                  <p className="mt-5 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">Ingresa un `reservation_id` para ver el estado del checkout y del cobro asociado.</p>
                ) : !latestCheckout && !latestCharge ? (
                  <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">No se encontro informacion asociada a esa reserva para tu usuario.</p>
                ) : (
                  <div className="mt-5 space-y-6">
                    {latestCheckout ? (
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Checkout</h3>
                        <dl className="mt-3 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                          <div><dt className="font-semibold text-slate-900">Checkout ID</dt><dd className="mt-1 break-all">{latestCheckout.id}</dd></div>
                          <div><dt className="font-semibold text-slate-900">Estado</dt><dd className="mt-1">{latestCheckout.status}</dd></div>
                           <div><dt className="font-semibold text-slate-900">Precio maximo</dt><dd className="mt-1"><Money amount={latestCheckout.maxPrice.toString()} currency={latestCheckout.currency} /></dd></div>
                           <div><dt className="font-semibold text-slate-900">Cobro previsto</dt><dd className="mt-1"><Money amount={latestCheckout.amountToCharge.toString()} currency={latestCheckout.currency} /></dd></div>
                           <div><dt className="font-semibold text-slate-900">Credito aplicado</dt><dd className="mt-1"><Money amount={latestCheckout.creditApplied.toString()} currency={latestCheckout.currency} /></dd></div>
                           <div><dt className="font-semibold text-slate-900">Checkout URL</dt><dd className="mt-1 break-all">{latestCheckout.checkoutUrl ?? "No definido"}</dd></div>
                            <div><dt className="font-semibold text-slate-900">Expira</dt><dd className="mt-1">{latestCheckout.expiresAt ? latestCheckout.expiresAt.toISOString() : "No definido"}</dd></div>
                         </dl>
                       </div>
                    ) : null}

                    {latestCharge ? (
                      <div>
                        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Charge</h3>
                        <dl className="mt-3 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                          <div><dt className="font-semibold text-slate-900">Transaccion</dt><dd className="mt-1 break-all">{latestCharge.transactionId}</dd></div>
                          <div><dt className="font-semibold text-slate-900">Estado</dt><dd className="mt-1">{latestCharge.status}</dd></div>
                          <div><dt className="font-semibold text-slate-900">Monto cobrado</dt><dd className="mt-1"><Money amount={latestCharge.amountCharged.toString()} currency={latestCharge.currency} /></dd></div>
                          <div><dt className="font-semibold text-slate-900">Credito aplicado</dt><dd className="mt-1"><Money amount={latestCharge.creditApplied.toString()} currency={latestCharge.currency} /></dd></div>
                          <div><dt className="font-semibold text-slate-900">Precio final del viaje</dt><dd className="mt-1"><Money amount={latestCharge.finalTripPrice?.toString() ?? null} currency={latestCharge.currency} /></dd></div>
                          <div><dt className="font-semibold text-slate-900">Credito generado</dt><dd className="mt-1"><Money amount={latestCharge.creditGranted.toString()} currency={latestCharge.currency} /></dd></div>
                          <div><dt className="font-semibold text-slate-900">Procesado</dt><dd className="mt-1">{latestCharge.processedAt ? latestCharge.processedAt.toISOString() : "Pendiente"}</dd></div>
                          <div><dt className="font-semibold text-slate-900">Finalizacion T-1h</dt><dd className="mt-1">{latestCharge.poolPriceFinalizationJobId ?? "Pendiente"}</dd></div>
                          <div className="sm:col-span-2"><dt className="font-semibold text-slate-900">Motivo de rechazo</dt><dd className="mt-1">{latestCharge.rejectionReason ?? "Sin rechazo"}</dd></div>
                        </dl>
                      </div>
                    ) : (
                      <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                        Esta reserva todavia no genero un charge persistido. Puede tratarse de un checkout cancelado, expirado o aun no procesado.
                      </p>
                    )}
                  </div>
                )}
              </InfoCard>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
