import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { AdminCheckoutSessionsView } from "@/components/admin-checkout-sessions-view";
import { requirePageRole } from "@/lib/auth";
import { AdminHero } from "../admin-ui";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
};

export default async function AdminCheckoutsPage({ searchParams }: PageProps) {
  const authContext = await requirePageRole(["admin"]);

  return (
    <AppShell
      role="admin"
      clerkUserId={authContext.clerkUserId}
      title="Control de pagos"
      description="Listado y control de transacciones de cobro en la plataforma."
    >
      <div className="flex flex-col gap-8">
        <AdminHero title="Monitorea las transacciones de cobro" description="Esta sección te permite buscar y revisar el estado de los cobros, crédito aplicado y la trazabilidad de cada viaje." />
        
        <Suspense fallback={<AdminCheckoutsSkeleton />}>
          <AdminCheckoutSessionsView searchParams={searchParams} />
        </Suspense>
      </div>
    </AppShell>
  );
}

/**
 * Skeleton matching the checkout sessions layout
 */
function AdminCheckoutsSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      {/* 4 Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-outline-custom bg-surface p-5 h-28">
            <div className="h-3 w-28 bg-slate-200 rounded mb-3"></div>
            <div className="h-6 w-16 bg-slate-200 rounded mb-2"></div>
            <div className="h-3 w-40 bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>

      {/* Main Section */}
      <div className="rounded-xl border border-outline-custom bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
          <div className="space-y-2">
            <div className="h-5 w-40 bg-slate-200 rounded"></div>
            <div className="h-4 w-72 bg-slate-100 rounded"></div>
          </div>
          <div className="h-6 w-24 bg-slate-100 rounded"></div>
        </div>

        <div className="h-10 bg-slate-100 rounded-lg w-full max-w-md mb-6"></div>

        {/* Skeleton list items */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-outline-custom bg-surface p-5 h-28">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                </div>
                <div className="h-6 bg-slate-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
