import { AppShell } from "@/components/app-shell";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { humanizeStatus } from "@/components/ui/format";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePageRole } from "@/lib/auth";
import { savePayoutAccountAction } from "../actions";
import { getDriverSummaryData } from "../driver-data";
import { DriverField, DriverHero } from "../driver-ui";

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
    <AppShell role="driver" clerkUserId={authContext.clerkUserId} title="Cuenta de cobro" description="Configura la referencia donde deben liquidarse los viajes del conductor.">
      <div className="flex flex-col gap-8">
        <DriverHero title="Define donde cobras tus viajes." description="No cambia el flujo financiero: solo organiza mejor la informacion para que la demo sea mas clara." />

        {params.message ? <AlertBanner tone="success">{params.message}</AlertBanner> : null}
        {params.error ? <AlertBanner tone="danger">{params.error}</AlertBanner> : null}

        <SectionCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Cuenta activa</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Referencia visible para explicar donde se liquidarian los fondos del conductor.</p>
            </div>
            {data.payoutAccount ? <StatusBadge value={data.payoutAccount.status} label={humanizeStatus(data.payoutAccount.status)} /> : null}
          </div>

          {data.payoutAccount ? (
            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
              <dl className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-slate-900">Proveedor</dt>
                  <dd className="mt-1">{data.payoutAccount.provider}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-900">Estado</dt>
                  <dd className="mt-1">{humanizeStatus(data.payoutAccount.status)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-slate-900">Referencia de cobro</dt>
                  <dd className="mt-1 break-all">{data.payoutAccount.accountReference}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-slate-900">Alias visible</dt>
                  <dd className="mt-1">{data.payoutAccount.alias ?? "Sin alias configurado"}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState title="Aun no hay una cuenta activa" description="Carga una referencia de cobro para mostrar adonde deberian enviarse las liquidaciones del conductor." />
            </div>
          )}

          <form action={savePayoutAccountAction} className="mt-6 grid gap-4 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <input type="hidden" name="path" value="/driver/account" />
            <DriverField
              label="Referencia de cobro"
              name="accountReference"
              defaultValue={data.payoutAccount?.accountReference ?? ""}
              placeholder="mp_acc_driver_01"
              required
              helpText="Ejemplo: identificador de cuenta de Mercado Pago, CVU o referencia interna de pruebas."
            />
            <DriverField
              label="Alias"
              name="alias"
              defaultValue={data.payoutAccount?.alias ?? ""}
              placeholder="driver01-cvu"
              helpText="Nombre corto para que la cuenta sea facil de reconocer durante la demo."
            />
            <button type="submit" className="rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Guardar cuenta de cobro
            </button>
          </form>
        </SectionCard>
      </div>
    </AppShell>
  );
}
