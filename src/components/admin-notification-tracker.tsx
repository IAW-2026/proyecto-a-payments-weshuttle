"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { formatMoney } from "@/components/ui/format";

type PendingSettlement = {
  id: string;
  poolId: string;
  driverUserId: string;
  amount: number;
  currency: string;
  status: string;
  alias: string | null;
  cvu: string | null;
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

export function AdminNotificationTracker() {
  const [toasts, setToasts] = useState<(PendingSettlement & { visible: boolean })[]>([]);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    async function checkPendingSettlements() {
      try {
        const res = await fetch("/api/admin/settlements/pending");
        if (!res.ok) return;
        const data = (await res.json()) as { settlements: PendingSettlement[] };
        const settlements = data.settlements || [];

        if (isInitialLoadRef.current) {
          // On initial load, mark all current pending settlements as known
          settlements.forEach((s) => knownIdsRef.current.add(s.id));
          isInitialLoadRef.current = false;
          return;
        }

        // Check for any new pending settlements
        const newSettlements: PendingSettlement[] = [];
        settlements.forEach((s) => {
          if (!knownIdsRef.current.has(s.id)) {
            knownIdsRef.current.add(s.id);
            newSettlements.push(s);
          }
        });

        if (newSettlements.length > 0) {
          newSettlements.forEach((s) => {
            setToasts((prev) => [...prev, { ...s, visible: true }]);

            // Automatically hide toast after 8 seconds
            setTimeout(() => {
              setToasts((prev) =>
                prev.map((t) => (t.id === s.id ? { ...t, visible: false } : t))
              );
            }, 8000);
          });
        }
      } catch (err) {
        console.error("Tracker failed to poll settlements:", err);
      }
    }

    // Run immediately on mount, then poll every 5 seconds
    checkPendingSettlements();
    const interval = setInterval(checkPendingSettlements, 5000);

    return () => clearInterval(interval);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: false } : t)));
    setTimeout(() => removeToast(id), 300);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
      {toasts.map(
        (toast) =>
          toast.visible && (
            <div
              key={toast.id}
              className="flex w-full flex-col overflow-hidden rounded-xl border border-outline-custom bg-white/95 p-4 shadow-xl backdrop-blur-md transition-all duration-300 hover:shadow-2xl animate-in slide-in-from-top-4"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="h-5 w-5 animate-bounce"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">
                    Liquidación Pendiente
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 leading-normal">
                    Se reportó un fin de viaje. El chofer{" "}
                    <span className="font-semibold text-slate-900">
                      {getDriverName(toast.driverUserId)}
                    </span>{" "}
                    solicita liquidación de{" "}
                    <span className="font-bold text-sky-700">
                      {formatMoney(toast.amount, toast.currency)}
                    </span>
                    .
                  </p>
                  {toast.alias && (
                    <p className="mt-1 text-[10px] text-slate-400 font-mono">
                      Alias: {toast.alias}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                  aria-label="Cerrar notificación"
                >
                  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                    <path
                      d="M5 5l10 10M15 5L5 15"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>

              <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Link
                  href={`/admin/settlements?q=${encodeURIComponent(toast.poolId)}`}
                  onClick={() => dismissToast(toast.id)}
                  className="rounded-full bg-sky-700 px-3.5 py-1.5 text-center text-xs font-bold text-white shadow-md shadow-sky-700/10 hover:bg-sky-600 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                >
                  Ver liquidación
                </Link>
              </div>
            </div>
          )
      )}
    </div>
  );
}
