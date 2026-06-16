import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatMoney, humanizeStatus } from "@/components/ui/format";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDemoCheckoutAction } from "./actions";

type PageProps = {
  searchParams: Promise<{
    reservation_id?: string;
    message?: string;
    error?: string;
    payment?: string;
    checkout_id?: string;
  }>;
};

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  helpText,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  helpText?: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-700">
      <span className="font-medium text-slate-900">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required
        className="rounded-2xl border border-slate-300/80 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
      />
      {helpText ? <span className="text-xs leading-5 text-slate-500">{helpText}</span> : null}
    </label>
  );
}

function paymentBanner(payment: string | undefined) {
  switch (payment) {
    case "success":
      return {
        tone: "success" as const,
        title: "Pago confirmado",
        description: "El checkout se resolvio correctamente. Puedes revisar el detalle y ver el impacto sobre tu saldo.",
      };
    case "failure":
      return {
        tone: "danger" as const,
        title: "Pago no completado",
        description: "La operacion no pudo acreditarse. Revisa el estado del checkout antes de volver a intentarlo.",
      };
    case "pending":
      return {
        tone: "warning" as const,
        title: "Pago en revision",
        description: "Mercado Pago informo un estado pendiente. La confirmacion final puede demorar unos minutos.",
      };
    default:
      return null;
  }
}

function humanizeMovement(value: string) {
  switch (value) {
    case "CREDIT_GRANTED":
      return "Credito generado";
    case "CREDIT_APPLIED":
      return "Credito aplicado";
    default:
      return value;
  }
}

export default async function RiderPage({ searchParams }: PageProps) {
  const authContext = await requirePageRole(["rider"]);
  const params = await searchParams;
  const reservationId = params.reservation_id?.trim() || "";
  const riderAppUrl = process.env.NEXT_PUBLIC_RIDER_APP_URL?.trim();
  const defaultSuccessUrl = riderAppUrl ? `${riderAppUrl.replace(/\/$/, "")}?payment=success` : "/rider?payment=success";
  const defaultFailureUrl = riderAppUrl ? `${riderAppUrl.replace(/\/$/, "")}?payment=failure` : "/rider?payment=failure";
  const defaultPendingUrl = riderAppUrl ? `${riderAppUrl.replace(/\/$/, "")}?payment=pending` : "/rider?payment=pending";

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

  const availableCredit = creditAccount?.balance.toNumber() ?? 0;
  const latestPaymentBanner = paymentBanner(params.payment);

  return (
    <AppShell
      role="rider"
      clerkUserId={authContext.clerkUserId}
      title="Pagos y reservas"
      description="Consulta tu saldo, inicia un checkout de demo y entiende rapido el estado de cada reserva."
    >
      <div className="flex flex-col gap-8">
        <SectionCard>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Rider Demo</p>
                <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
                  Gestiona el pago de tu viaje sin perder contexto.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                  Esta vista resume el saldo disponible, los ultimos checkouts y el detalle financiero de una reserva para la demo.
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
              <div className="rounded-[24px] border border-sky-100 bg-linear-to-br from-sky-50 to-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Saldo a favor</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {formatMoney(availableCredit, creditAccount?.currency ?? "ARS")}
                </p>
                <p className="mt-2 text-sm text-slate-600">Se aplica antes de cobrar por Mercado Pago.</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Ultimo checkout</p>
                <p className="mt-3 text-lg font-semibold text-slate-900">
                  {recentCheckouts[0]?.reservationId ?? "Todavia no hay checkouts"}
                </p>
                <div className="mt-3">
                  {recentCheckouts[0] ? (
                    <StatusBadge value={recentCheckouts[0].status} label={humanizeStatus(recentCheckouts[0].status)} />
                  ) : null}
                </div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Accion recomendada</p>
                <p className="mt-3 text-lg font-semibold text-slate-900">Iniciar o revisar un checkout</p>
                <p className="mt-2 text-sm text-slate-600">Usa la simulacion o abre uno de tus checkouts recientes.</p>
              </div>
            </div>

            {latestPaymentBanner ? (
              <AlertBanner tone={latestPaymentBanner.tone} title={latestPaymentBanner.title}>
                <p>{latestPaymentBanner.description}</p>
                {params.checkout_id ? (
                  <Link
                    href={`/checkout/${params.checkout_id}`}
                    className="mt-3 inline-flex text-sm font-semibold underline underline-offset-4"
                  >
                    Ver el detalle del checkout
                  </Link>
                ) : null}
              </AlertBanner>
            ) : null}

            {params.message ? <AlertBanner tone="success">{params.message}</AlertBanner> : null}
            {params.error ? <AlertBanner tone="danger">{params.error}</AlertBanner> : null}
          </div>
        </SectionCard>

        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <div id="credit-balance" className="space-y-8">
            <SectionCard>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Saldo y movimientos</h3>
                  <p className="mt-2 text-sm text-slate-600">Entiende rapidamente cuanto credito tienes disponible y de donde viene.</p>
                </div>
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  {recentMovements.length} recientes
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {recentMovements.map((movement) => (
                  <div key={movement.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{humanizeMovement(movement.type)}</p>
                        <p className="mt-1 text-xs text-slate-500">{movement.description ?? "Movimiento registrado en tu cuenta de credito."}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-semibold text-slate-900">{formatMoney(movement.amount.toNumber(), movement.currency)}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDateTime(movement.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {recentMovements.length === 0 ? (
                  <EmptyState
                    title="Aun no hay movimientos"
                    description="Cuando se aplique o genere credito en una reserva, lo veras reflejado aqui."
                  />
                ) : null}
              </div>
            </SectionCard>

            <SectionCard>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Tus ultimos checkouts</h3>
                  <p className="mt-2 text-sm text-slate-600">Cada tarjeta te lleva al resumen de pago para retomar el flujo.</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {recentCheckouts.map((checkout) => (
                  <Link
                    key={checkout.id}
                    href={`/checkout/${checkout.id}`}
                    className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm hover:border-sky-300 hover:bg-sky-50/40"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">Reserva {checkout.reservationId}</p>
                        <p className="mt-1 text-xs text-slate-500">Pool {checkout.poolId}</p>
                        <p className="mt-2 text-sm text-slate-600">Total pendiente: {formatMoney(checkout.amountToCharge.toNumber(), checkout.currency)}</p>
                      </div>
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <StatusBadge value={checkout.status} label={humanizeStatus(checkout.status)} />
                        <span className="text-xs font-medium text-slate-500">Abrir checkout</span>
                      </div>
                    </div>
                  </Link>
                ))}
                {recentCheckouts.length === 0 ? (
                  <EmptyState
                    title="Todavia no hay checkouts"
                    description="Crea un checkout de demo para empezar a mostrar el flujo de pago en la presentacion."
                  />
                ) : null}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-8">
            <div id="checkout-demo">
              <SectionCard>
                <h3 className="text-xl font-semibold text-slate-900">Crear un checkout de demo</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Genera un checkout interno para mostrar el paso previo a Mercado Pago y despues continuar con el resultado del pago.
                </p>

                <form action={createDemoCheckoutAction} className="mt-6 grid gap-4 rounded-[26px] border border-slate-200 bg-slate-50/80 p-5 sm:grid-cols-2">
                  <Field label="ID de reserva" name="reservationId" defaultValue={reservationId || "res_demo_new_001"} placeholder="res_demo_new_001" />
                  <Field label="ID del pool" name="poolId" defaultValue="pool_demo_checkout_new" placeholder="pool_demo_checkout_new" />
                  <Field label="Precio maximo" name="maxPrice" type="number" defaultValue="5800" placeholder="5800" helpText="Monto tope que el usuario acepto para la reserva." />
                  <Field label="Moneda" name="currency" defaultValue="ARS" placeholder="ARS" />
                  <Field label="URL de exito" name="successUrl" defaultValue={defaultSuccessUrl} placeholder={defaultSuccessUrl} helpText="Se usa al volver desde Mercado Pago o desde la simulacion de demo." />
                  <Field label="URL de error" name="failureUrl" defaultValue={defaultFailureUrl} placeholder={defaultFailureUrl} />
                  <Field label="URL pendiente" name="pendingUrl" defaultValue={defaultPendingUrl} placeholder={defaultPendingUrl} />
                  <div className="sm:col-span-2">
                    <button type="submit" className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                      Crear checkout interno
                    </button>
                  </div>
                </form>
              </SectionCard>
            </div>

            <div id="reservation-detail">
              <SectionCard>
                <h3 className="text-xl font-semibold text-slate-900">Consultar una reserva</h3>
                <p className="mt-2 text-sm text-slate-600">Busca una reserva para explicar rapidamente el estado del checkout y del cobro asociado.</p>

                <form method="get" className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <label htmlFor="reservation_id" className="sr-only">
                    ID de reserva
                  </label>
                  <input
                    id="reservation_id"
                    name="reservation_id"
                    defaultValue={reservationId}
                    placeholder="res_paid_001"
                    className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                  <button type="submit" className="rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                    Consultar reserva
                  </button>
                </form>

                {!reservationId ? (
                  <div className="mt-6">
                    <EmptyState
                      title="Ingresa una reserva para continuar"
                      description="Al consultar una reserva veras el estado del checkout, el monto cobrado y si hubo credito aplicado o generado."
                    />
                  </div>
                ) : !latestCheckout && !latestCharge ? (
                  <div className="mt-6">
                    <AlertBanner tone="warning">No se encontro informacion asociada a esa reserva para tu usuario.</AlertBanner>
                  </div>
                ) : (
                  <div className="mt-6 space-y-6">
                    {latestCheckout ? (
                      <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h4 className="text-lg font-semibold text-slate-900">Resumen del checkout</h4>
                            <p className="mt-1 text-sm text-slate-600">Lo que el usuario ve antes de ser derivado a Mercado Pago.</p>
                          </div>
                          <StatusBadge value={latestCheckout.status} label={humanizeStatus(latestCheckout.status)} />
                        </div>

                        <dl className="mt-5 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                          <div><dt className="font-semibold text-slate-900">Checkout</dt><dd className="mt-1 break-all">{latestCheckout.id}</dd></div>
                          <div><dt className="font-semibold text-slate-900">Expira</dt><dd className="mt-1">{formatDateTime(latestCheckout.expiresAt)}</dd></div>
                          <div><dt className="font-semibold text-slate-900">Precio maximo</dt><dd className="mt-1">{formatMoney(Number(latestCheckout.maxPrice), latestCheckout.currency)}</dd></div>
                          <div><dt className="font-semibold text-slate-900">Total a cobrar</dt><dd className="mt-1">{formatMoney(Number(latestCheckout.amountToCharge), latestCheckout.currency)}</dd></div>
                          <div><dt className="font-semibold text-slate-900">Credito aplicado</dt><dd className="mt-1">{formatMoney(Number(latestCheckout.creditApplied), latestCheckout.currency)}</dd></div>
                          <div><dt className="font-semibold text-slate-900">Preference / URL</dt><dd className="mt-1 break-all">{latestCheckout.checkoutUrl ?? "No disponible"}</dd></div>
                        </dl>

                        <Link
                          href={`/checkout/${latestCheckout.id}`}
                          className="mt-5 inline-flex items-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
                        >
                          Abrir resumen del checkout
                        </Link>
                      </div>
                    ) : null}

                    {latestCharge ? (
                      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h4 className="text-lg font-semibold text-slate-900">Resultado del cobro</h4>
                            <p className="mt-1 text-sm text-slate-600">Este bloque muestra como termino el pago y su impacto sobre el viaje.</p>
                          </div>
                          <StatusBadge value={latestCharge.status} label={humanizeStatus(latestCharge.status)} />
                        </div>

                        <dl className="mt-5 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                          <div><dt className="font-semibold text-slate-900">Monto cobrado</dt><dd className="mt-1">{formatMoney(Number(latestCharge.amountCharged), latestCharge.currency)}</dd></div>
                          <div><dt className="font-semibold text-slate-900">Credito aplicado</dt><dd className="mt-1">{formatMoney(Number(latestCharge.creditApplied), latestCharge.currency)}</dd></div>
                          <div><dt className="font-semibold text-slate-900">Precio final del viaje</dt><dd className="mt-1">{latestCharge.finalTripPrice !== null ? formatMoney(Number(latestCharge.finalTripPrice), latestCharge.currency) : "Pendiente"}</dd></div>
                          <div><dt className="font-semibold text-slate-900">Credito generado</dt><dd className="mt-1">{formatMoney(Number(latestCharge.creditGranted), latestCharge.currency)}</dd></div>
                          <div><dt className="font-semibold text-slate-900">Procesado</dt><dd className="mt-1">{formatDateTime(latestCharge.processedAt)}</dd></div>
                          <div><dt className="font-semibold text-slate-900">Transaccion</dt><dd className="mt-1 break-all">{latestCharge.transactionId}</dd></div>
                          <div className="sm:col-span-2"><dt className="font-semibold text-slate-900">Motivo de rechazo</dt><dd className="mt-1">{latestCharge.rejectionReason ?? "Sin rechazo"}</dd></div>
                        </dl>
                      </div>
                    ) : (
                      <EmptyState
                        title="El cobro aun no se registro"
                        description="Puede tratarse de un checkout cancelado, expirado o todavia pendiente de confirmacion."
                      />
                    )}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
