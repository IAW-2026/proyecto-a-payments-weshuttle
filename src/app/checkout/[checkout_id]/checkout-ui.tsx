"use client";

import { useState } from "react";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { AlertBanner } from "@/components/ui/alert-banner";
import { formatDateTime, formatMoney, humanizeStatus } from "@/components/ui/format";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";

type CheckoutStatus = "CREATED" | "PENDING" | "PAID" | "DENIED" | "CANCELED" | "EXPIRED";
type CheckoutResultKind = "success" | "failure" | "pending";

export type CheckoutViewData = {
  checkout: {
    id: string;
    reservationId: string;
    poolId: string;
    passengerUserId: string;
    maxPrice: number;
    availableCreditAtCreation: number;
    creditApplied: number;
    amountToCharge: number;
    currency: string;
    status: CheckoutStatus;
    checkoutUrl: string | null;
    mercadoPagoPreferenceId: string | null;
    mercadoPagoInitPoint: string | null;
    expiresAt: string | null;
    creditRefund?: number;
    destinationName?: string | null;
    departureTime?: string | null;
    processedAt?: string | null;
    finalTripPrice?: number | null;
    isFinalized?: boolean;
  };
  isDemoMode: boolean;
};

function statusCopy(status: CheckoutStatus) {
  switch (status) {
    case "PAID":
      return {
        title: "¡Pago aprobado!",
        description: "Tu pago fue recibido correctamente y tu viaje ya está confirmado.",
        tone: "success" as const,
      };
    case "PENDING":
      return {
        title: "Pago en proceso",
        description: "Estamos verificando la transacción. Te avisaremos en cuanto se confirme.",
        tone: "warning" as const,
      };
    case "DENIED":
      return {
        title: "No pudimos cobrar tu pago",
        description: "Hubo un problema. Revisa los datos e inténtalo de nuevo.",
        tone: "danger" as const,
      };
    case "CANCELED":
      return {
        title: "Pago cancelado",
        description: "El pago se canceló antes de que pudiera completarse.",
        tone: "info" as const,
      };
    case "EXPIRED":
      return {
        title: "El pago expiró",
        description: "El tiempo límite para realizar el pago caducó sin confirmarse.",
        tone: "info" as const,
      };
    default:
      return {
        title: "Listo para pagar",
        description: "Revisa el detalle y confirma tu pago para continuar.",
        tone: "info" as const,
      };
  }
}

export function CheckoutLayout({
  title,
  description,
  children,
  isAdmin = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  isAdmin?: boolean;
}) {
  const riderAppBaseUrl = process.env.NEXT_PUBLIC_RIDER_APP_URL?.trim();
  return (
    <main className="min-h-screen px-4 py-6 text-primary sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <SectionCard className="overflow-hidden bg-linear-to-br from-white via-white to-info-light/35 print:hidden">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {isAdmin ? (
                <Link href="/admin/checkouts" className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 font-medium text-white shadow-sm hover:bg-primary-hover transition">
                  Volver a Control de pagos
                </Link>
              ) : (
                <>
                  {riderAppBaseUrl ? (
                    <a href={riderAppBaseUrl} className="inline-flex items-center justify-center rounded-lg border border-primary/20 bg-white px-4 py-2 font-medium text-primary shadow-sm hover:border-primary/50 hover:bg-primary/5 transition">
                      Volver a Rider App
                    </a>
                  ) : null}
                  <Link href="/rider" className="inline-flex items-center justify-center rounded-lg border border-primary/20 bg-white px-4 py-2 font-medium text-primary shadow-sm hover:border-primary/50 hover:bg-primary/5 transition">
                    Volver a Payments
                  </Link>
                  <Link href="/rider/checkouts" className="inline-flex items-center justify-center rounded-lg border border-primary/20 bg-white px-4 py-2 font-medium text-primary shadow-sm hover:border-primary/50 hover:bg-primary/5 transition">
                    Ver mis pagos
                  </Link>
                </>
              )}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                {isAdmin ? "Vista de Administrador" : "Mi Pago de Viaje"}
              </p>
              <h1 className="mt-2 text-2xl font-bold text-primary sm:text-3xl">
                {isAdmin ? "Detalle del Pago de Reserva" : title}
              </h1>
              <p className="mt-2 text-sm text-slate-gray leading-relaxed">
                {isAdmin ? "Visualización del comprobante y estado de la transacción." : description}
              </p>
            </div>
          </div>
        </SectionCard>
        {children}
      </div>
    </main>
  );
}

export function CheckoutSummaryCard({ data }: { data: CheckoutViewData }) {
  const [showBalanceBreakdown, setShowBalanceBreakdown] = useState(false);
  const copy = statusCopy(data.checkout.status);

  return (
    <div id="printable-receipt">
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            min-height: auto !important;
          }
          body > *:not(main),
          main > div > *:not(#printable-receipt),
          .print\\:hidden {
            display: none !important;
          }
          #printable-receipt {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 600px !important;
          }
          .text-primary, .text-primary * {
            color: black !important;
          }
          .text-slate-gray, .text-slate-gray * {
            color: #374151 !important;
          }
          .bg-surface {
            background-color: #f9fafb !important;
            border: 1px solid #e5e7eb !important;
          }
        }
      `}</style>

      <SectionCard className="relative">
        <div className="print:hidden">
          <AlertBanner tone={copy.tone} title={copy.title}>
            {copy.description}
          </AlertBanner>
        </div>

        {/* Print-only confirmation header */}
        <div className="hidden print:block border-b-2 border-slate-300 pb-4 mb-4 text-center">
          <h1 className="text-2xl font-bold text-black">WeShuttle</h1>
          <p className="text-sm text-slate-700">Comprobante de Pago Electrónico</p>
          <div className="mt-2 text-xs font-semibold text-emerald-800 bg-emerald-50 inline-block px-3 py-1 rounded-full border border-emerald-200">
            {copy.title}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-b border-outline-custom pb-4 print:border-b-2 print:border-slate-300">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-primary print:text-black">
                {data.checkout.destinationName ? `Destino: ${data.checkout.destinationName}` : `Viaje #${data.checkout.reservationId}`}
              </h2>
              {data.checkout.departureTime ? (
                <p className="text-xs text-slate-gray print:text-slate-700">
                  Horario de salida: <span suppressHydrationWarning className="font-semibold text-primary print:text-black">{formatDateTime(data.checkout.departureTime)}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-gray print:text-slate-700">Servicio de transporte programado</p>
              )}
              {data.checkout.destinationName && (
                <p className="text-[10px] text-slate-gray/70 print:text-slate-600 font-mono">
                  Código de reserva: #{data.checkout.reservationId}
                </p>
              )}
            </div>
            <StatusBadge value={data.checkout.status} label={humanizeStatus(data.checkout.status)} />
          </div>
        </div>

        <div className="mt-6 bg-surface border border-outline-custom rounded-xl p-5 print:bg-white print:border-slate-300 print:rounded-none">
          <h3 className="text-xs font-bold text-slate-gray uppercase tracking-wider mb-3 print:text-slate-800">Detalle del pago</h3>
          
          {data.checkout.status === "PAID" && data.checkout.processedAt && (
            <div className="mb-4 pb-3 border-b border-dashed border-outline-custom print:border-slate-300 flex justify-between text-xs text-slate-gray">
              <dt className="font-medium print:text-slate-700">Fecha y hora de pago:</dt>
              <dd suppressHydrationWarning className="font-semibold text-primary print:text-black">{formatDateTime(data.checkout.processedAt)}</dd>
            </div>
          )}

          <dl className="space-y-3.5 text-sm text-slate-gray">
            <div className="flex justify-between">
              <dt className="font-medium text-slate-gray print:text-slate-700">Monto del viaje:</dt>
              <dd className="font-semibold text-primary print:text-black">{formatMoney(data.checkout.maxPrice, data.checkout.currency)}</dd>
            </div>
            {data.checkout.creditApplied > 0 && (
              <div className="flex justify-between text-primary print:text-black">
                <dt className="font-medium">Saldo a favor aplicado:</dt>
                <dd className="font-bold">-{formatMoney(data.checkout.creditApplied, data.checkout.currency)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-outline-custom print:border-slate-300 pt-3 text-base">
              <dt className="font-bold text-primary print:text-black">
                {data.checkout.status === "PAID" ? "Total:" : "Total a pagar:"}
              </dt>
              <dd className="font-extrabold text-primary text-lg print:text-black">{formatMoney(data.checkout.amountToCharge, data.checkout.currency)}</dd>
            </div>
            {data.checkout.status === "PAID" && (
              <div className="flex justify-between border-t border-dashed border-outline-custom print:border-slate-300 pt-3 text-primary print:text-black">
                <dt className="font-semibold text-emerald-700 print:text-emerald-950 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse print:hidden" />
                  Saldo devuelto:
                </dt>
                <dd className="font-bold text-emerald-700 print:text-emerald-950">
                  +{formatMoney(data.checkout.creditRefund ?? 0, data.checkout.currency)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {data.checkout.status === "PAID" && (
          <div className="mt-4 flex flex-col gap-3 print:hidden">
            {/* Botón y Acordeón del Saldo Devuelto */}
            <div className="rounded-xl border border-outline-custom bg-surface p-1">
              <button
                onClick={() => setShowBalanceBreakdown(!showBalanceBreakdown)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-primary hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition"
              >
                <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4.5 w-4.5 text-emerald-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.546 1.16 3.699 1.16 5.245 0 .015-.011.03-.022.046-.035m-5.291-9.017c1.546-1.16 3.699-1.16 5.245 0 .015.011.03.022.046.035M12 3v3h0m0 12v3" />
                  </svg>
                  Ver detalle de saldo obtenido
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className={`h-4 w-4 transition-transform duration-200 ${showBalanceBreakdown ? "rotate-180" : ""}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {showBalanceBreakdown && (
                <div className="px-4 pb-4 pt-2 border-t border-outline-custom text-xs text-slate-gray space-y-3">
                  {data.checkout.isFinalized ? (
                    <>
                      <p className="leading-relaxed">
                        El precio final de tu viaje fue calculado en base a la ocupación del pool (cierre T-1h).
                      </p>
                      <div className="bg-surface-neutral p-3 rounded-lg border border-outline-custom space-y-2">
                        <div className="flex justify-between">
                          <span>Tarifa máxima de reserva:</span>
                          <span className="font-semibold text-primary">{formatMoney(data.checkout.maxPrice, data.checkout.currency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tarifa final calculada:</span>
                          <span className="font-semibold text-primary">{formatMoney(data.checkout.finalTripPrice ?? 0, data.checkout.currency)}</span>
                        </div>
                        <div className="flex justify-between border-t border-outline-custom pt-1.5 font-bold text-emerald-700">
                          <span>Saldo devuelto a tu cuenta:</span>
                          <span>+{formatMoney(data.checkout.creditRefund ?? 0, data.checkout.currency)}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-gray/90 italic">
                        * Este saldo a favor ya ha sido acreditado en tu cuenta y se aplicará automáticamente para reducir el costo de tu próximo viaje.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 shrink-0 mt-0.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                        </svg>
                        <div className="space-y-1">
                          <p className="font-bold">Tarifa final pendiente de cálculo</p>
                          <p className="leading-relaxed text-[11px]">
                            La tarifa definitiva de este viaje y el saldo a favor correspondiente se calcularán automáticamente 1 hora antes de la salida del pool, basándose en la cantidad de pasajeros confirmados.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Botón de Exportar Recibo a PDF */}
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-bold text-primary shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-primary/40 active:scale-[0.99] transition duration-150 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4.5 w-4.5 text-primary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              Exportar Recibo (PDF)
            </button>
          </div>
        )}

        <details className="mt-6 border-t border-slate-100 pt-4 print:border-t-2 print:border-slate-300">
          <summary className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer outline-none select-none print:hidden">
            Detalles técnicos del pago
          </summary>
          <div className="hidden print:block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Detalles Técnicos del Pago
          </div>
          <dl className="mt-4 grid gap-4 text-xs text-slate-500 sm:grid-cols-2 text-left print:grid-cols-1 print:gap-2">
            <div>
              <dt className="font-semibold print:text-slate-800">Código de Pago (Checkout ID):</dt>
              <dd className="mt-0.5 break-all print:text-black">{data.checkout.id}</dd>
            </div>
            <div>
              <dt className="font-semibold print:text-slate-800">Código de Pasarela (Preference ID):</dt>
              <dd className="mt-0.5 break-all print:text-black">{data.checkout.mercadoPagoPreferenceId ?? "No disponible"}</dd>
            </div>
            <div className="print:hidden">
              <dt className="font-semibold">Expiración:</dt>
              <dd suppressHydrationWarning className="mt-0.5">{formatDateTime(data.checkout.expiresAt)}</dd>
            </div>
            <div>
              <dt className="font-semibold print:text-slate-800">Canal de Pago:</dt>
              <dd className="mt-0.5 print:text-black">{data.isDemoMode ? "Simulación de Demo" : "Mercado Pago Sandbox"}</dd>
            </div>
          </dl>
        </details>
      </SectionCard>
    </div>
  );
}

export function CheckoutResultActions({
  checkoutId,
  paymentResult,
}: {
  checkoutId: string;
  paymentResult: CheckoutResultKind;
}) {
  const riderAppBaseUrl = process.env.NEXT_PUBLIC_RIDER_APP_URL?.trim();
  const riderAppUrl = riderAppBaseUrl
    ? `${riderAppBaseUrl.replace(/\/$/, "")}?payment=${paymentResult}&checkout_id=${checkoutId}`
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        {riderAppUrl ? (
          <a
            href={riderAppUrl}
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3 text-center text-sm font-bold text-white shadow-md hover:bg-primary-hover transition duration-200 cursor-pointer"
          >
            Volver a Rider App
          </a>
        ) : null}

        <Link
          href="/rider"
          className="inline-flex w-full items-center justify-center rounded-lg border border-primary/25 bg-white px-5 py-3 text-center text-sm font-semibold text-primary shadow-sm hover:border-primary/50 hover:bg-primary/5 transition duration-200"
        >
          Volver a Payments
        </Link>

        <Link
          href="/rider/checkouts"
          className="inline-flex w-full items-center justify-center rounded-lg border border-primary/25 bg-white px-5 py-3 text-center text-sm font-semibold text-primary shadow-sm hover:border-primary/50 hover:bg-primary/5 transition duration-200"
        >
          Ver mis pagos
        </Link>
      </div>

      {!riderAppBaseUrl && (
        <details className="border-t border-slate-100 pt-3 mt-4">
          <summary className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer outline-none select-none">
            Información de la App externa
          </summary>
          <div className="mt-2 text-xs text-slate-500 leading-relaxed text-left">
            La demo sigue dentro de Payments App. Si en el futuro configuras NEXT_PUBLIC_RIDER_APP_URL, aquí aparecerá el botón para retornar a la aplicación del pasajero.
          </div>
        </details>
      )}
    </div>
  );
}

export function AccountConflictView({ checkoutId }: { checkoutId: string }) {
  const riderAppBaseUrl = process.env.NEXT_PUBLIC_RIDER_APP_URL?.trim();
  const riderAppUrl = riderAppBaseUrl || "/rider";

  return (
    <CheckoutLayout
      title="Conflicto de Cuenta"
      description="El checkout al que intentas acceder pertenece a otra cuenta."
    >
      <SectionCard className="border-error-red/20 bg-linear-to-br from-white via-white to-error-light/10 shadow-lg">
        <div className="flex flex-col items-center text-center gap-5 py-4">
          <div className="rounded-full bg-error-light p-4 text-error-red border border-error-red/10 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-8 w-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
            </svg>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-primary">Este checkout pertenece a otra cuenta.</h2>
            <p className="text-sm text-slate-gray leading-relaxed max-w-md">
              Actualmente estás conectado en Payments con una cuenta distinta a la que creó esta reserva. Para continuar, cambiá de cuenta e ingresá con la cuenta correcta.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center pt-4">
            <SignOutButton redirectUrl={`/checkout/${checkoutId}`}>
              <button className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-primary-hover hover:scale-[1.01] active:scale-[0.99] transition duration-200 cursor-pointer">
                Cambiar cuenta
              </button>
            </SignOutButton>
            <Link
              href={riderAppUrl}
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-primary/20 bg-white px-6 py-3 text-sm font-medium text-primary shadow-sm hover:border-primary/40 hover:bg-primary/5 hover:scale-[1.01] active:scale-[0.99] transition duration-200 cursor-pointer"
            >
              Volver a la app del pasajero
            </Link>
          </div>
        </div>
      </SectionCard>
    </CheckoutLayout>
  );
}
