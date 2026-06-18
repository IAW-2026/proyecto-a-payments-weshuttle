import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AlertBanner } from "@/components/ui/alert-banner";
import { formatDateTime, formatMoney, humanizeStatus } from "@/components/ui/format";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { getRiderPageData, paymentBanner } from "./rider-data";
import { RiderHero, RiderPaymentBanner, RiderQuickActions, RiderSummaryMetrics } from "./rider-ui";

type PageProps = {
  searchParams: Promise<{
    message?: string;
    error?: string;
    payment?: string;
    checkout_id?: string;
  }>;
};

export default async function RiderPage({ searchParams }: PageProps) {
  const [authContext, params] = await Promise.all([
    requirePageRole(["rider"]),
    searchParams,
  ]);
  const data = await getRiderPageData(authContext.clerkUserId);
  const latestPaymentBanner = paymentBanner(params.payment);

  return (
    <AppShell
      role="rider"
      clerkUserId={authContext.clerkUserId}
      title="Pagos y reservas"
      description="Dashboard inicial del rider para entrar rapido a saldo, checkout, reservas y estado del pago."
    >
      <div className="flex flex-col gap-8">
        <RiderHero
          title="Gestiona el pago de tu viaje sin perder contexto."
          description="Esta vista ahora funciona como puerta de entrada: resume tu situacion actual y te deriva a secciones mas claras para la demo."
        />

        <RiderSummaryMetrics
          availableCredit={formatMoney(data.availableCredit, data.creditAccount?.currency ?? "ARS")}
          latestCheckoutHref={data.recentCheckouts[0] ? `/checkout/${data.recentCheckouts[0].id}` : undefined}
          latestCheckoutDay={data.recentCheckouts[0] ? formatDateTime(data.recentCheckouts[0].createdAt) : undefined}
          latestCheckoutPrice={data.recentCheckouts[0] ? formatMoney(data.recentCheckouts[0].amountToCharge.toNumber(), data.recentCheckouts[0].currency) : undefined}
          latestCheckoutStatus={
            data.recentCheckouts[0] ? (
              <StatusBadge value={data.recentCheckouts[0].status} label={humanizeStatus(data.recentCheckouts[0].status)} />
            ) : undefined
          }
        />

        {latestPaymentBanner ? (
          <RiderPaymentBanner
            tone={latestPaymentBanner.tone}
            title={latestPaymentBanner.title}
            description={latestPaymentBanner.description}
            checkoutId={params.checkout_id}
          />
        ) : null}
        {params.message ? <AlertBanner tone="success">{params.message}</AlertBanner> : null}
        {params.error ? <AlertBanner tone="danger">{params.error}</AlertBanner> : null}

        <RiderQuickActions />

        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Movimientos recientes</h3>
                <p className="mt-2 text-sm text-slate-600">Un vistazo rapido al credito aplicado o generado antes de entrar al detalle completo.</p>
              </div>
              <Link href="/rider/balance" className="text-sm font-semibold text-sky-700 hover:underline">
                Ver saldo completo
              </Link>
            </div>

            <div className="mt-6 space-y-3">
              {data.recentMovements.slice(0, 4).map((movement) => (
                <div key={movement.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{movement.type}</p>
                      <p className="mt-1 text-xs text-slate-500">{movement.description ?? "Movimiento registrado en tu cuenta de credito."}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-semibold text-slate-900">{formatMoney(movement.amount.toNumber(), movement.currency)}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDateTime(movement.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Checkouts recientes</h3>
                <p className="mt-2 text-sm text-slate-600">Retoma rapidamente el ultimo flujo creado o entra a la seccion completa para seguir la demo.</p>
              </div>
              <Link href="/rider/checkouts" className="text-sm font-semibold text-sky-700 hover:underline">
                Ver todos
              </Link>
            </div>

            <div className="mt-6 space-y-3">
              {data.recentCheckouts.slice(0, 4).map((checkout) => (
                <Link key={checkout.id} href={`/checkout/${checkout.id}`} className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm hover:border-sky-300 hover:bg-sky-50/40">
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
            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
