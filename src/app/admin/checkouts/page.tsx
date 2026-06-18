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
      title="Pagos / Checkouts"
      description="Vista principal para seguir checkouts, estados de pago, cargos asociados y su relacion con reservas dentro de la demo."
    >
      <div className="flex flex-col gap-8">
        <AdminHero title="Centraliza el flujo de pago y checkout." description="Esta seccion funciona como punto principal de demo para relacionar reservas, checkouts, cargos y estados de pago." />
        <AdminCheckoutSessionsView searchParams={searchParams} />
      </div>
    </AppShell>
  );
}
