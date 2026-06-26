import { AppShell } from "@/components/app-shell";
import { AlertBanner } from "@/components/ui/alert-banner";
import { SectionCard } from "@/components/ui/section-card";
import { requirePageRole } from "@/lib/auth";
import { getDriverSummaryData } from "../driver-data";
import { DriverHero } from "../driver-ui";
import { PayoutAccountForm } from "./payout-form";

type PageProps = {
  searchParams: Promise<{
    message?: string;
    error?: string;
  }>;
};

export default async function DriverAccountPage({ searchParams }: PageProps) {
  const authContext = await requirePageRole(["driver"]);
  const params = await searchParams;
  const data = await getDriverSummaryData(authContext.clerkUserId);

  return (
    <AppShell role="driver" clerkUserId={authContext.clerkUserId} title="" description="">
      <div className="flex flex-col gap-8">
        <DriverHero
          title="Datos de cobro"
          description="Configurá la cuenta bancaria o billetera digital de Mercado Pago donde querés recibir las ganancias de tus viajes finalizados."
        />

        {params.message ? <AlertBanner tone="success">{params.message}</AlertBanner> : null}
        {params.error ? <AlertBanner tone="danger">{params.error}</AlertBanner> : null}

        <SectionCard>
          <PayoutAccountForm initialAccount={data.payoutAccount} />
        </SectionCard>
      </div>
    </AppShell>
  );
}
