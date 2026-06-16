import Link from "next/link";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { getAuthContext } from "@/lib/auth";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";

function RoleBadge({ role }: { role: string | null }) {
  if (!role) {
    return null;
  }

  const labels: Record<string, string> = {
    rider: "Pasajero",
    driver: "Conductor",
    admin: "Administrador",
  };

  return (
    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
      {labels[role] ?? role}
    </span>
  );
}

export default async function Home() {
  const authContext = await getAuthContext();
  const dashboardHref =
    authContext.role === "admin"
      ? "/admin"
      : authContext.role === "rider"
        ? "/rider"
        : authContext.role === "driver"
          ? "/driver"
          : null;

  return (
    <main className="min-h-screen px-6 py-10 text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <SectionCard className="overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="bg-linear-to-br from-slate-950 via-slate-900 to-sky-900 px-8 py-10 text-white sm:px-10 sm:py-12">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/70">WeShuttle</p>
              <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                Una sola demo para explicar cobros, creditos, pricing y liquidaciones.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/80">
                Payments App concentra los flujos clave por rol para que la presentacion sea clara: el rider entiende cuanto paga, el driver entiende cuanto cobra y el admin entiende el estado global del sistema.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <RoleBadge role={authContext.role} />
                {authContext.clerkUserId ? (
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-white/80">
                    Sesion iniciada
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col justify-between bg-white px-8 py-10 sm:px-10 sm:py-12">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Acceso seguro</p>
                <h2 className="mt-3 text-2xl font-bold text-slate-900">Entra al rol que quieras mostrar.</h2>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  La autenticacion define automaticamente la vista disponible. No modifica contratos ni flujos funcionales: solo habilita la experiencia correcta para presentar la demo.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {authContext.clerkUserId ? (
                  <>
                    <span className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
                      {authContext.role === "rider"
                        ? "Sesion iniciada como pasajero. Puedes mostrar saldo, checkout y resultado del pago."
                        : authContext.role === "driver"
                          ? "Sesion iniciada como conductor. Puedes mostrar cuenta de cobro y liquidaciones."
                          : authContext.role === "admin"
                            ? "Sesion iniciada como administrador. Puedes mostrar metricas, transacciones y pricing."
                            : "Sesion iniciada correctamente."}
                    </span>
                    <UserButton />
                    {dashboardHref ? (
                      <Link
                        href={dashboardHref}
                        className="w-full rounded-full bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
                      >
                        Ir a mi panel
                      </Link>
                    ) : null}
                  </>
                ) : (
                  <SignInButton forceRedirectUrl="/post-login">
                    <button className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto">
                      Ingresar con Clerk
                    </button>
                  </SignInButton>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-4 lg:grid-cols-3">
          <MetricCard title="Rider" value="Checkout claro" description="Saldo, credito aplicado, total a pagar y retorno desde Mercado Pago bien explicados." tone="sky" />
          <MetricCard title="Driver" value="Cobro entendible" description="Cuenta activa, estados de liquidacion y lectura rapida en desktop y mobile." tone="emerald" />
          <MetricCard title="Admin" value="Control global" description="Metricas, pricing, transacciones y liquidaciones con narrativa de demo." tone="amber" />
        </div>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Pricing</p>
            <h3 className="mt-3 text-xl font-bold text-slate-900">Reglas persistidas y legibles</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              El admin puede explicar como se define el precio base y el descuento por ocupacion sin entrar en ruido visual innecesario.
            </p>
          </article>

          <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Cobros</p>
            <h3 className="mt-3 text-xl font-bold text-slate-900">Flujo de pago consistente</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              El rider ve con claridad el monto maximo, el credito aplicado y el resultado final del checkout antes y despues de Mercado Pago.
            </p>
          </article>

          <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Liquidaciones</p>
            <h3 className="mt-3 text-xl font-bold text-slate-900">Seguimiento operativo simple</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Driver y Admin pueden mostrar el estado de cobros a conductores con mejor jerarquia visual y lectura rapida.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
