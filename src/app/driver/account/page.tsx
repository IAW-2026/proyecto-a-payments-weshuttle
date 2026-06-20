import { AppShell } from "@/components/app-shell";
import { AlertBanner } from "@/components/ui/alert-banner";
import { EmptyState } from "@/components/ui/empty-state";
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
    <AppShell role="driver" clerkUserId={authContext.clerkUserId} title="Datos de cobro" description="Configura la cuenta o billetera digital donde querés recibir tus ganancias.">
      <div className="flex flex-col gap-8">
        <DriverHero title="Configurá tu medio de cobro" description="Definí la cuenta bancaria o de Mercado Pago donde enviaremos el dinero de tus viajes finalizados." />

        <AlertBanner tone="warning">
          <strong>Modo de simulación (Demo):</strong> Esta aplicación simula el flujo de cobros. Los datos bancarios o de Mercado Pago ingresados se utilizarán únicamente para simular las transferencias de tus ganancias de prueba. No se transferirá ni debitará dinero real de tus cuentas.
        </AlertBanner>

        {params.message ? <AlertBanner tone="success">{params.message}</AlertBanner> : null}
        {params.error ? <AlertBanner tone="danger">{params.error}</AlertBanner> : null}

        <SectionCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Cuenta activa</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">Esta es la cuenta actual donde se depositarían tus ganancias.</p>
            </div>
            {data.payoutAccount ? <StatusBadge value={data.payoutAccount.status} label={data.payoutAccount.status === "ACTIVE" ? "Activa" : "Inactiva"} /> : null}
          </div>

          {data.payoutAccount ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-5">
              <dl className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-slate-900">Medio de cobro</dt>
                  <dd className="mt-1">{data.payoutAccount.provider}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-900">Estado de cuenta</dt>
                  <dd className="mt-1">{data.payoutAccount.status === "ACTIVE" ? "Activa" : "Inactiva"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-slate-900">CBU, CVU o ID de Mercado Pago</dt>
                  <dd className="mt-1 break-all">{data.payoutAccount.accountReference}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-slate-900">Nombre de la cuenta (Alias)</dt>
                  <dd className="mt-1">{data.payoutAccount.alias ?? "Sin nombre corto configurado"}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState title="Aún no configuraste una cuenta" description="Cargá una cuenta bancaria o cuenta de Mercado Pago para poder simular tus cobros." />
            </div>
          )}

          <form action={savePayoutAccountAction} className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <input type="hidden" name="path" value="/driver/account" />
            <DriverField
              label="CBU, CVU o ID de Mercado Pago"
              name="accountReference"
              defaultValue={data.payoutAccount?.accountReference ?? ""}
              placeholder="Ej: 0000003100012345678901 o tu-email@mercadopago"
              required
              helpText="Ingresá los 22 números de tu CBU/CVU o el correo electrónico asociado a tu cuenta de Mercado Pago."
            />
            <DriverField
              label="Nombre corto de la cuenta (Alias)"
              name="alias"
              defaultValue={data.payoutAccount?.alias ?? ""}
              placeholder="Ej: Mi CVU de cobros"
              helpText="Un nombre sencillo para reconocer esta cuenta fácilmente."
            />
             <button type="submit" className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary-hover shadow-md shadow-primary/10 transition cursor-pointer">
              Guardar datos de cobro
            </button>
          </form>
        </SectionCard>
      </div>
    </AppShell>
  );
}
