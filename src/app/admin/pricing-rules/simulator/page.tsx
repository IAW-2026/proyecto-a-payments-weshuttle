import { AppShell } from "@/components/app-shell";
import { requirePageRole } from "@/lib/auth";
import { getMockDestinations } from "@/lib/mock/destinations";
import { PricingSimulatorClient } from "@/app/admin/pricing-rules/simulator/simulator-client";

export default async function PricingSimulatorPage() {
  const authContext = await requirePageRole(["admin"]);
  const destinations = getMockDestinations();

  return (
    <AppShell
      role="admin"
      clerkUserId={authContext.clerkUserId}
      title="Simulador de Tarifas"
      description="Herramienta para simular el cálculo de precio estimado y precio máximo de viaje llamando al endpoint real."
    >
      <PricingSimulatorClient destinations={destinations} />
    </AppShell>
  );
}
