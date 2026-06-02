import Link from "next/link";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { getAuthContext } from "@/lib/auth";

function RoleBadge({ role }: { role: string | null }) {
  if (!role) {
    return null;
  }

  return (
    <span className="rounded-full border border-[#D8DADC] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#4B5563]">
      Rol {role}
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
    <main className="min-h-screen bg-[#F7F9FB] px-6 py-10 text-[#0A192F]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="overflow-hidden rounded-3xl border border-[#D8DADC] bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="bg-[#0A192F] px-8 py-10 text-white sm:px-10 sm:py-12">
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/70">
                WeShuttle
              </p>
              <h1 className="mt-4 max-w-xl text-4xl font-bold italic leading-tight sm:text-5xl">
                Payments App corporativa para cobros, pricing y liquidaciones.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/80">
                Inicia sesion con Clerk para operar segun tu rol y acceder de forma segura al dominio de pagos de WeShuttle.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <RoleBadge role={authContext.role} />
                {authContext.clerkUserId ? (
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-white/80">
                    {authContext.clerkUserId}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col justify-between bg-white px-8 py-10 sm:px-10 sm:py-12">
              <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#4B5563]">
                Acceso seguro
              </p>
              <h2 className="mt-3 text-2xl font-bold text-[#0A192F]">
                  Inicia sesion para acceder a tu experiencia de pagos.
                </h2>
                <p className="mt-4 text-sm leading-6 text-[#4B5563]">
                  La autenticacion se resuelve con Clerk y habilita vistas segun tu rol. La administracion de reglas de precio permanece restringida unicamente a usuarios `admin`.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {authContext.clerkUserId ? (
                  <>
                    {authContext.role === "rider" ? (
                      <span className="rounded-lg border border-[#D8DADC] bg-[#F7F9FB] px-4 py-3 text-sm font-medium text-[#4B5563]">
                        Sesion iniciada como pasajero. Podras gestionar medios de pago y consultar cobros desde las vistas correspondientes.
                      </span>
                    ) : authContext.role === "driver" ? (
                      <span className="rounded-lg border border-[#D8DADC] bg-[#F7F9FB] px-4 py-3 text-sm font-medium text-[#4B5563]">
                        Sesion iniciada como conductor. Podras configurar cuentas de cobro y revisar liquidaciones desde las vistas correspondientes.
                      </span>
                    ) : (
                      <span className="rounded-lg border border-[#D8DADC] bg-[#F7F9FB] px-4 py-3 text-sm font-medium text-[#4B5563]">
                        Sesion iniciada correctamente.
                      </span>
                    )}
                    <UserButton />
                    {dashboardHref ? (
                      <Link
                        href={dashboardHref}
                        className="rounded-lg bg-[#0A192F] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#122745]"
                      >
                        Ir a mi panel
                      </Link>
                    ) : null}
                  </>
                ) : (
                  <SignInButton forceRedirectUrl="/post-login">
                    <button className="rounded-lg bg-[#0A192F] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#122745]">
                      Ingresar con Clerk
                    </button>
                  </SignInButton>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-xl border border-[#D8DADC] bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4B5563]">
              Pricing
            </p>
            <h3 className="mt-3 text-xl font-bold text-[#0A192F]">Reglas de precio persistidas</h3>
            <p className="mt-3 text-sm leading-6 text-[#4B5563]">
              Define valores base, descuentos y rangos de ocupacion para sostener cotizaciones consistentes en toda la operacion.
            </p>
          </article>

          <article className="rounded-xl border border-[#D8DADC] bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4B5563]">
              Cobros
            </p>
            <h3 className="mt-3 text-xl font-bold text-[#0A192F]">Cobros automaticos seguros</h3>
            <p className="mt-3 text-sm leading-6 text-[#4B5563]">
              Gestiona medios de pago, procesa cobros por reserva y aplica descuentos registrados dentro del dominio Payments.
            </p>
          </article>

          <article className="rounded-xl border border-[#D8DADC] bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4B5563]">
              Liquidaciones
            </p>
            <h3 className="mt-3 text-xl font-bold text-[#0A192F]">Fondos listos para conductores</h3>
            <p className="mt-3 text-sm leading-6 text-[#4B5563]">
              Consolida cuentas de cobro y liquidaciones con trazabilidad para pasajeros, conductores y administracion.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
