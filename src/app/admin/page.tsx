import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requirePageRole } from "@/lib/auth";

export default async function AdminHomePage() {
  const authContext = await requirePageRole(["admin"]);

  return (
    <AppShell
      role="admin"
      clerkUserId={authContext.clerkUserId}
      title="Centro de administracion financiera"
      description="Gestiona configuraciones centrales, transacciones y liquidaciones de Payments App."
    >
      <div className="flex flex-col gap-8">
        <section className="rounded-3xl border border-[#D8DADC] bg-white p-8 shadow-sm sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#4B5563]">
            Admin Payments
          </p>
          <h2 className="mt-3 text-3xl font-bold text-[#0A192F] sm:text-4xl">
            Centro de administracion financiera
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#4B5563]">
            Gestiona configuraciones centrales de Payments App con acceso restringido para usuarios administradores autenticados en Clerk.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#4B5563]">
            Clerk user id: {authContext.clerkUserId}
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link href="/admin/pricing-rules" className="rounded-xl border border-[#D8DADC] bg-white p-6 shadow-sm transition hover:border-[#0A192F]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4B5563]">Pricing</p>
            <h2 className="mt-3 text-xl font-bold text-[#0A192F]">Reglas de precio</h2>
            <p className="mt-3 text-sm leading-6 text-[#4B5563]">
              Define reglas persistidas para calcular valores maximos y estimados segun destino y ocupacion.
            </p>
          </Link>

          <Link href="/admin/transactions" className="rounded-xl border border-[#D8DADC] bg-white p-6 shadow-sm transition hover:border-[#0A192F]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4B5563]">Transacciones</p>
            <h2 className="mt-3 text-xl font-bold text-[#0A192F]">Cobros individuales</h2>
            <p className="mt-3 text-sm leading-6 text-[#4B5563]">
              Visualiza cargos, estados, descuentos y reservas afectadas.
            </p>
          </Link>

          <Link href="/admin/settlements" className="rounded-xl border border-[#D8DADC] bg-white p-6 shadow-sm transition hover:border-[#0A192F]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4B5563]">Liquidaciones</p>
            <h2 className="mt-3 text-xl font-bold text-[#0A192F]">Pagos a conductores</h2>
            <p className="mt-3 text-sm leading-6 text-[#4B5563]">
              Consulta el historico consolidado de fondos liquidados a conductores.
            </p>
          </Link>

          <Link href="/" className="rounded-xl border border-[#D8DADC] bg-white p-6 shadow-sm transition hover:border-[#0A192F]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4B5563]">Inicio</p>
            <h2 className="mt-3 text-xl font-bold text-[#0A192F]">Volver al portal</h2>
            <p className="mt-3 text-sm leading-6 text-[#4B5563]">
              Regresa a la portada principal de la aplicacion y al flujo de acceso por rol.
            </p>
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
