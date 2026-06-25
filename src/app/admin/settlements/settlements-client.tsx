"use client";

import { useState, useTransition } from "react";
import { formatDateTime, formatMoney, humanizeStatus } from "@/components/ui/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { markSettlementCompletedAction, markSettlementFailedAction } from "../actions";

type PayoutAccount = {
  id: string;
  driverUserId: string;
  provider: string;
  accountReference: string;
  alias: string | null;
  status: string;
};

type SettlementItem = {
  id: string;
  poolId: string;
  driverUserId: string;
  payoutAccountId: string | null;
  amount: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  settledAt: string | null;
  payoutAccount: PayoutAccount | null;
};

function getDriverName(email: string) {
  if (email === "driver+clerk_test@iaw.com") return "Juan Pérez";
  if (email === "driver2+clerk_test@iaw.com") return "Pedro Gómez";
  
  if (email.includes("+")) {
    const part = email.split("+")[0];
    return part.charAt(0).toUpperCase() + part.slice(1);
  }
  if (email.includes("@")) {
    const part = email.split("@")[0];
    return part.charAt(0).toUpperCase() + part.slice(1);
  }
  return email;
}

export function SettlementsClient({ settlements }: { settlements: SettlementItem[] }) {
  const [activeSettlement, setActiveSettlement] = useState<SettlementItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const handleUpdateStatus = (id: string, status: "COMPLETED" | "FAILED") => {
    startTransition(async () => {
      try {
        if (status === "COMPLETED") {
          await markSettlementCompletedAction(id);
        } else {
          await markSettlementFailedAction(id);
        }
        setActiveSettlement(null);
      } catch (err) {
        console.error("Error updating settlement status:", err);
        alert("Ocurrió un error al actualizar la liquidación.");
      }
    });
  };

  return (
    <>
      {/* Mobile Card Layout */}
      <div className="mt-6 space-y-3 lg:hidden">
        {settlements.map((settlement) => (
          <article key={settlement.id} className="rounded-xl border border-outline-custom bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{getDriverName(settlement.driverUserId)}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Monto:{" "}
                  <span className="font-semibold text-slate-900">
                    {formatMoney(settlement.amount, settlement.currency)}
                  </span>
                </p>
              </div>
              <StatusBadge
                value={settlement.status}
                label={settlement.status === "COMPLETED" ? "Acreditado" : humanizeStatus(settlement.status)}
              />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                onClick={() => setActiveSettlement(settlement)}
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
              >
                Gestionar pago
              </button>
              <details className="text-xs text-slate-400">
                <summary className="cursor-pointer hover:text-slate-600 outline-none select-none">Ver ids</summary>
                <div className="mt-2 space-y-1 bg-white p-2.5 rounded-lg border border-slate-200 text-slate-600">
                  <p className="font-mono">ID: {settlement.id}</p>
                  <p className="font-mono">Pool: {settlement.poolId}</p>
                </div>
              </details>
            </div>
          </article>
        ))}
      </div>

      {/* Desktop Table Layout */}
      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200 lg:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <caption className="sr-only">Liquidaciones registradas</caption>
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Chofer / Destinatario</th>
              <th className="px-4 py-3 font-semibold">Monto</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold">Cuenta de destino</th>
              <th className="px-4 py-3 font-semibold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
            {settlements.map((settlement) => (
              <tr key={settlement.id} className="hover:bg-slate-50/50 transition">
                <td className="px-4 py-4 align-top">
                  <p className="font-semibold text-slate-900">{getDriverName(settlement.driverUserId)}</p>
                  <p className="mt-1 text-xs text-slate-400 truncate max-w-[200px]" title={settlement.driverUserId}>
                    {settlement.driverUserId}
                  </p>
                </td>
                <td className="px-4 py-4 align-top font-semibold text-slate-900">
                  {formatMoney(settlement.amount, settlement.currency)}
                </td>
                <td className="px-4 py-4 align-top">
                  <StatusBadge
                    value={settlement.status}
                    label={settlement.status === "COMPLETED" ? "Acreditado" : humanizeStatus(settlement.status)}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {settlement.settledAt ? formatDateTime(settlement.settledAt) : "Pendiente de acreditar"}
                  </p>
                </td>
                <td className="px-4 py-4 align-top text-xs text-slate-600 font-medium">
                  {settlement.payoutAccount ? (
                    <>
                      <p className="text-slate-800">{settlement.payoutAccount.alias ?? "Sin alias"}</p>
                      <p className="mt-1 text-slate-400 font-mono text-[10px] truncate max-w-[240px]">
                        {settlement.payoutAccount.accountReference}
                      </p>
                    </>
                  ) : (
                    <span className="text-slate-400">Sin cuenta asociada</span>
                  )}
                </td>
                <td className="px-4 py-4 align-top text-center">
                  <button
                    onClick={() => setActiveSettlement(settlement)}
                    className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
                  >
                    Gestionar pago
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modern Interactive Modal */}
      {activeSettlement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setActiveSettlement(null)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-outline-custom bg-white p-6 shadow-2xl transition-all animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Liquidación al chofer</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Viaje ID (Pool): <span className="font-mono text-slate-800 font-medium">{activeSettlement.poolId}</span>
                </p>
              </div>
              <button
                onClick={() => setActiveSettlement(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                aria-label="Cerrar modal"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4.5 w-4.5">
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Content Body */}
            <div className="mt-5 space-y-4">
              {/* UX Suggested Text Block */}
              <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4 text-xs leading-relaxed text-sky-800">
                <div className="flex gap-2">
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4.5 w-4.5 shrink-0"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1"
                    />
                  </svg>
                  <span>
                    La transferencia al chofer se realiza manualmente al alias/CVU indicado. Payments App calcula
                    y registra la liquidación, pero no ejecuta la transferencia automáticamente.
                  </span>
                </div>
              </div>

              {/* Driver and Payout Info Details */}
              <div className="grid gap-3 rounded-2xl border border-slate-150 bg-slate-50/50 p-4.5 text-sm">
                <div className="flex justify-between border-b border-slate-200/50 pb-2.5">
                  <span className="text-slate-500 font-medium">Chofer:</span>
                  <span className="font-bold text-slate-900">{getDriverName(activeSettlement.driverUserId)}</span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200/50 pb-2.5">
                  <span className="text-slate-500 font-medium">Monto a pagar:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-950">
                      {formatMoney(activeSettlement.amount, activeSettlement.currency)}
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(
                          activeSettlement.amount.toString(),
                          `amount-${activeSettlement.id}`
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:border-slate-300 hover:text-slate-900 cursor-pointer"
                    >
                      {copiedKey === `amount-${activeSettlement.id}` ? "¡Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/50 pb-2.5">
                  <span className="text-slate-500 font-medium">Alias/CVU:</span>
                  <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                    <span className="font-mono text-xs text-slate-900 break-all">
                      {activeSettlement.payoutAccount?.alias ??
                        activeSettlement.payoutAccount?.accountReference ??
                        "Sin cuenta vinculada"}
                    </span>
                    {activeSettlement.payoutAccount && (
                      <button
                        onClick={() =>
                          handleCopy(
                            activeSettlement.payoutAccount?.alias ??
                              activeSettlement.payoutAccount?.accountReference ??
                              "",
                            `alias-${activeSettlement.id}`
                          )
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:border-slate-300 hover:text-slate-900 cursor-pointer"
                      >
                        {copiedKey === `alias-${activeSettlement.id}` ? "¡Copiado!" : "Copiar"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-slate-500 font-medium">Referencia interna:</span>
                  <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                    <span className="font-mono text-xs text-slate-900 break-all">{activeSettlement.id}</span>
                    <button
                      onClick={() => handleCopy(activeSettlement.id, `ref-${activeSettlement.id}`)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:border-slate-300 hover:text-slate-900 cursor-pointer"
                    >
                      {copiedKey === `ref-${activeSettlement.id}` ? "¡Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status information banner */}
              {activeSettlement.status !== "PENDING" && (
                <div
                  className={`rounded-2xl border p-4 text-xs font-semibold ${
                    activeSettlement.status === "COMPLETED"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-rose-200 bg-rose-50 text-rose-800"
                  }`}
                >
                  {activeSettlement.status === "COMPLETED"
                    ? `Liquidación marcada como pagada con fecha ${formatDateTime(
                        activeSettlement.settledAt
                      )}.`
                    : "Esta liquidación ha sido marcada como Fallida."}
                </div>
              )}
            </div>

            {/* Footer Buttons Actions */}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end border-t border-slate-100 pt-4">
              <button
                onClick={() => setActiveSettlement(null)}
                className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                disabled={isPending}
              >
                Cerrar
              </button>

              {activeSettlement.status === "PENDING" && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(activeSettlement.id, "FAILED")}
                    className="rounded-full border border-rose-200 bg-rose-50 px-5 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                    disabled={isPending}
                  >
                    {isPending ? "Procesando..." : "Marcar como fallida"}
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(activeSettlement.id, "COMPLETED")}
                    className="rounded-full bg-sky-700 px-5 py-2 text-sm font-bold text-white shadow-md shadow-sky-700/10 hover:bg-sky-600 transition cursor-pointer"
                    disabled={isPending}
                  >
                    {isPending ? "Procesando..." : "Marcar como pagada"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
