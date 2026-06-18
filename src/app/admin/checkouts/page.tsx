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
        <AdminCheckoutSessionsView searchParams={searchParams} />
      </div>
    </AppShell>
  );
}
