"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime, formatMoney } from "@/components/ui/format";
import { StatusBadge } from "@/components/ui/status-badge";

type PricingRuleInfo = {
  id: string;
  basePrice: number;
  discountType: string;
  discountValue: number;
};

type EligiblePool = {
  poolId: string;
  destinationId: string | null;
  departureTime: string;
  currency: string;
  passengerCount: number;
  maxPricePaid: number;
  pricingRule: PricingRuleInfo | null;
  hasJobCompleted: boolean;
  hasChargesFinalized: boolean;
  hasAdjustment: boolean;
};

type CreditGenerated = {
  reservation_id: string;
  passenger_user_id: string;
  max_price_paid: number;
  final_price: number;
  credit_granted: number;
  credit_balance_after: number;
};

type SimulationResult = {
  pool_id: string;
  reason: "POOL_LOCKED" | "NO_DRIVER_ASSIGNED";
  final_price: number;
  processed_reservations: number;
  currency: string;
  credits_generated: CreditGenerated[];
};

function getDestinationName(id: string | null) {
  if (!id) return "Ruta General / Por defecto";
  if (id === "dest_polo_petroquimico") return "Polo Petroquímico";
  if (id === "dest_parque_industrial") return "Parque Industrial";
  if (id === "dest_puerto_ingeniero_white") return "Puerto Ingeniero White";
  return id.replace("dest_", "").split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export function PoolsClient({ pools }: { pools: EligiblePool[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedPoolId, setSelectedPoolId] = useState<string>("");
  const [reason, setReason] = useState<"POOL_LOCKED" | "NO_DRIVER_ASSIGNED">("POOL_LOCKED");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedPool = pools.find((p) => p.poolId === selectedPoolId);

  const handleSimulate = async () => {
    if (!selectedPool) return;

    setErrorMsg(null);
    setResult(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/payments/pools/${selectedPool.poolId}/credit-adjustments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason,
            departure_time: selectedPool.departureTime,
            current_passengers: selectedPool.passengerCount,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setErrorMsg(data.message || `Error del servidor (${response.status})`);
          return;
        }

        setResult(data);
        
        // Refresh background server component state (recent jobs, metrics)
        router.refresh();
      } catch (err) {
        console.error("Simulation error:", err);
        setErrorMsg("Ocurrió un error inesperado al conectar con el servidor.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-outline-custom bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Herramientas Demo</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">Simular cierre T-1h</h3>
          <p className="mt-2 text-sm text-slate-600">
            Seleccioná un viaje (pool) con pagos confirmados para forzar el cierre una hora antes de la salida, calcular su precio final y devolver saldos a favor cuando corresponda.
          </p>
        </div>

        {pools.length === 0 ? (
          <div className="mt-6 rounded-xl border border-outline-custom bg-surface p-6 text-center text-slate-500 text-sm">
            Todavía no hay pools con pagos confirmados para procesar. Primero generá un checkout y completá un pago de prueba desde la sección del pasajero.
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Form Column */}
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="pool-select" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Seleccionar viaje (Pool)
                </label>
                <select
                  id="pool-select"
                  value={selectedPoolId}
                  onChange={(e) => {
                    setSelectedPoolId(e.target.value);
                    setResult(null);
                    setErrorMsg(null);
                  }}
                  className="mt-2 w-full rounded-lg border border-outline-custom bg-surface p-3.5 text-sm text-primary focus:border-primary focus:bg-white focus:outline-none transition duration-150"
                >
                  <option value="">-- Elige un pool disponible --</option>
                  {pools.map((pool) => (
                    <option key={pool.poolId} value={pool.poolId}>
                      {pool.poolId} ({getDestinationName(pool.destinationId)}) - {pool.passengerCount} pas.
                    </option>
                  ))}
                </select>
              </div>

              {selectedPool && (
                <>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                      Motivo de Cierre / Simulación
                    </span>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        id="reason-locked"
                        onClick={() => setReason("POOL_LOCKED")}
                        className={`rounded-lg border py-3 text-center text-xs font-bold transition duration-150 cursor-pointer ${
                          reason === "POOL_LOCKED"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-outline-custom bg-white text-slate-gray hover:bg-surface"
                        }`}
                      >
                        Cierre de Ocupación Normal
                      </button>
                      <button
                        type="button"
                        id="reason-no-driver"
                        onClick={() => setReason("NO_DRIVER_ASSIGNED")}
                        className={`rounded-lg border py-3 text-center text-xs font-bold transition duration-150 cursor-pointer ${
                          reason === "NO_DRIVER_ASSIGNED"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-outline-custom bg-white text-slate-gray hover:bg-surface"
                        }`}
                      >
                        Sin Conductor Asignado
                      </button>
                    </div>
                  </div>

                  <div className="mt-2">
                    <button
                      type="button"
                      id="btn-simulate-closure"
                      onClick={handleSimulate}
                      disabled={isPending || selectedPool.hasAdjustment}
                      className={`w-full rounded-lg py-3.5 text-sm font-bold text-white shadow-lg transition duration-200 cursor-pointer ${
                        selectedPool.hasAdjustment
                          ? "bg-slate-300 cursor-not-allowed shadow-none"
                          : "bg-primary shadow-primary/10 hover:bg-primary-hover hover:scale-[1.01] active:scale-[0.99]"
                      }`}
                    >
                      {isPending ? "Procesando Simulación..." : selectedPool.hasAdjustment ? "Cierre ya procesado" : "Simular cierre T-1h"}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Info Summary Column */}
            <div className="flex flex-col justify-between rounded-xl border border-outline-custom bg-surface p-5">
              {selectedPool ? (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 border-b border-slate-200/50 pb-2">
                    Resumen del Viaje Seleccionado
                  </h4>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium block">ID de Pool</span>
                      <span className="font-mono font-semibold text-slate-800 block truncate" title={selectedPool.poolId}>
                        {selectedPool.poolId}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Destino</span>
                      <span className="font-semibold text-slate-800 block">
                        {getDestinationName(selectedPool.destinationId)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Salida Programada</span>
                      <span className="font-semibold text-slate-800 block">
                        {formatDateTime(selectedPool.departureTime)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Estado de Ajuste</span>
                      <span className="block mt-0.5">
                        <StatusBadge
                          value={selectedPool.hasAdjustment ? "COMPLETED" : "PENDING"}
                          label={selectedPool.hasAdjustment ? "Procesado" : "Sin procesar"}
                        />
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-3 border border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pasajeros pagos detectados:</span>
                      <span className="font-bold text-slate-800">{selectedPool.passengerCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Monto máximo cobrado:</span>
                      <span className="font-semibold text-slate-800">
                        {formatMoney(selectedPool.maxPricePaid, selectedPool.currency)}
                      </span>
                    </div>
                    {reason === "POOL_LOCKED" && selectedPool.pricingRule && (
                      <div className="flex justify-between border-t border-slate-100 pt-2 mt-1">
                        <span className="text-slate-500 font-medium">Regla aplicada ({selectedPool.pricingRule.discountType === "PERCENTAGE" ? `${selectedPool.pricingRule.discountValue}% desc.` : "Desc. fijo"}):</span>
                        <span className="font-bold text-emerald-600">
                          {selectedPool.pricingRule.discountType === "PERCENTAGE" 
                            ? `${selectedPool.pricingRule.discountValue}%` 
                            : formatMoney(selectedPool.pricingRule.discountValue, selectedPool.currency)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-warning-amber/15 bg-warning-light p-3.5 text-xs text-warning-amber leading-relaxed">
                    <div className="flex gap-2">
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4.5 w-4.5 shrink-0 mt-0.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="font-bold">Advertencia Importante</p>
                        <p className="mt-0.5">
                          {reason === "POOL_LOCKED"
                            ? "Esta acción simula el cierre T-1h y puede generar créditos a favor si la ocupación califica para un descuento."
                            : "Simula cancelación sin chofer. Devolverá el 100% de la tarifa cobrada como crédito a favor de los pasajeros."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-center text-slate-400 text-sm py-12">
                  Elige un viaje del menú para ver su información y simular su cierre.
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Error Message banner */}
      {errorMsg && (
        <div id="sim-error-banner" className="rounded-xl border border-error-red/15 bg-error-light p-4 text-sm font-semibold text-error-red animate-in fade-in duration-200">
          <div className="flex gap-2.5">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14h.01M10 10V6m0 12a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Result Cards Display on Success */}
      {result && (
        <section id="sim-success-card" className="rounded-xl border border-success-emerald/20 bg-success-light/30 p-6 shadow-sm animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 border-b border-success-emerald/15 pb-4">
            <div className="rounded-full bg-success-light p-2 text-success-emerald border border-success-emerald/15">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h4 className="text-lg font-bold text-success-emerald">Simulación Completada</h4>
              <p className="text-xs text-success-emerald font-medium mt-0.5">
                Precio final calculado correctamente. Se actualizaron los cargos del pool y se generaron créditos a favor cuando correspondía.
              </p>
            </div>
          </div>
 
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="bg-white rounded-xl border border-success-emerald/15 p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Viaje (Pool)</span>
              <span className="text-base font-bold text-slate-800 mt-1 block truncate" title={result.pool_id}>{result.pool_id}</span>
            </div>
            <div className="bg-white rounded-xl border border-success-emerald/15 p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tarifa Final Calculada</span>
              <span className="text-base font-bold text-success-emerald mt-1 block">{formatMoney(result.final_price, result.currency)}</span>
            </div>
            <div className="bg-white rounded-xl border border-success-emerald/15 p-4 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pasajeros Procesados</span>
              <span className="text-base font-bold text-slate-800 mt-1 block">{result.processed_reservations}</span>
            </div>
          </div>
 
          <div className="mt-6 bg-white rounded-xl border border-success-emerald/15 overflow-hidden shadow-2xs">
            <h5 className="bg-slate-50 border-b border-emerald-100 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600">
              Desglose de Créditos Generados
            </h5>

            <div className="bg-slate-50 border-b border-slate-100 p-4 text-xs text-slate-650 leading-relaxed">
              <div className="flex gap-2">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4.5 w-4.5 shrink-0 text-sky-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 11.518 1.397l-.041.02-.041.02a.75.75 0 11-.518-1.397l.041-.02zm-3.5 0l.041-.02a.75.75 0 11.518 1.397l-.041.02-.041.02a.75.75 0 11-.518-1.397l.041-.02zM12 18.75h-3.75M9.75 1.5H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V6.75A5.625 5.625 0 0013.875 1.5H9.75z" />
                </svg>
                <span>
                  <strong>Fórmula de reembolso aplicada:</strong> Monto Cobrado (Precio Máx. de Reserva) − Tarifa Final de Ocupación = Crédito Devuelto.
                </span>
              </div>
            </div>

            {result.credits_generated.length === 0 ? (
              <p className="text-center text-slate-500 text-xs py-6">
                No se otorgaron créditos adicionales. La tarifa final coincidió con el monto total abonado por los pasajeros.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {result.credits_generated.map((credit) => (
                  <div key={credit.reservation_id} className="p-4 text-xs flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/50 transition">
                    <div>
                      <p className="font-bold text-slate-800">{credit.passenger_user_id}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Reserva: {credit.reservation_id}</p>
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600 border border-slate-100">
                        <span className="font-semibold text-slate-500">Cálculo:</span>
                        <span className="font-mono">{formatMoney(credit.max_price_paid, result.currency)} <span className="text-[9px] text-slate-400">(cobrado)</span></span>
                        <span>−</span>
                        <span className="font-mono">{formatMoney(credit.final_price, result.currency)} <span className="text-[9px] text-slate-400">(tarifa final)</span></span>
                        <span>=</span>
                        <span className="font-mono text-emerald-600 font-bold bg-emerald-50 px-1 py-0.2 rounded">{formatMoney(credit.credit_granted, result.currency)} <span className="text-[9px] text-emerald-500 font-normal">(devuelto)</span></span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-right">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-400 block">Precio Máx. Cobrado</span>
                        <span className="font-semibold text-slate-700">{formatMoney(credit.max_price_paid, result.currency)}</span>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-400 block">Tarifa Final</span>
                        <span className="font-semibold text-slate-700">{formatMoney(credit.final_price, result.currency)}</span>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-emerald-600 font-bold block">Crédito Devuelto</span>
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          +{formatMoney(credit.credit_granted, result.currency)}
                        </span>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-400 block">Nuevo Saldo</span>
                        <span className="font-bold text-slate-800">{formatMoney(credit.credit_balance_after, result.currency)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
