import Link from "next/link";
import { HeaderAuthButtons, HeroAuthButton } from "@/components/auth-client-elements";

export default async function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-linear-to-b from-surface to-slate-55 text-primary">
      {/* Sticky header navbar */}
      <header className="sticky top-0 z-50 border-b border-outline-custom bg-white/85 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white shadow-md shadow-primary/20 transition-transform duration-300 group-hover:scale-105">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-slate-gray bg-clip-text text-transparent">
              WeShuttle <span className="font-semibold text-primary">Payments</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <HeaderAuthButtons />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">

          {/* Hero Section */}
          <section className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-primary via-primary/95 to-slate-gray px-8 py-14 text-white shadow-2xl backdrop-blur-md sm:px-12 sm:py-16 md:px-16">
            {/* Background glowing elements for aesthetic appeal */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-white/5 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-80 w-80 rounded-full bg-info-light/5 blur-[100px] pointer-events-none" />

            <div className="relative max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-success-emerald animate-pulse" />
                Pagos Inteligentes
              </div>
              <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl bg-gradient-to-r from-white via-white to-slate-200 bg-clip-text text-transparent">
                Optimiza los pagos de tu transporte corporativo.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-slate-200">
                Una plataforma inteligente para gestionar cobros automáticos, tarifas flexibles y liquidaciones a conductores de manera segura y eficiente.
              </p>

              <HeroAuthButton />
            </div>
          </section>

          {/* Roles Section */}
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Rider Card */}
            <div className="group relative overflow-hidden rounded-xl border border-outline-custom bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
              <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-primary/5 blur-xl group-hover:bg-primary/10 transition-colors" />
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/5 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-gray group-hover:text-primary transition-colors">Pasajero</h3>
              <p className="mt-2 text-2xl font-bold text-primary">Checkout claro</p>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-gray">
                Gestión de saldos, aplicación de créditos y visualización en tiempo real del estado de tus pagos con Mercado Pago de forma simple y ágil.
              </p>
            </div>

            {/* Driver Card */}
            <div className="group relative overflow-hidden rounded-xl border border-outline-custom bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-success-emerald/30 hover:shadow-lg hover:shadow-success-emerald/5">
              <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-success-emerald/5 blur-xl group-hover:bg-success-emerald/10 transition-colors" />
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success-emerald/5 text-success-emerald transition-colors duration-300 group-hover:bg-success-emerald group-hover:text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17h5" />
                </svg>
              </div>
              <h3 className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-gray group-hover:text-success-emerald transition-colors">Conductor</h3>
              <p className="mt-2 text-2xl font-bold text-primary">Cobros transparentes</p>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-gray">
                Consulta de fondos completados o pendientes y configuración de cuentas de cobro con una interfaz optimizada para cualquier dispositivo.
              </p>
            </div>

            {/* Admin Card */}
            <div className="group relative overflow-hidden rounded-xl border border-outline-custom bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-warning-amber/30 hover:shadow-lg hover:shadow-warning-amber/5">
              <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-warning-amber/5 blur-xl group-hover:bg-warning-amber/10 transition-colors" />
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning-amber/5 text-warning-amber transition-colors duration-300 group-hover:bg-warning-amber group-hover:text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-gray group-hover:text-warning-amber transition-colors">Administrador</h3>
              <p className="mt-2 text-2xl font-bold text-primary">Control operativo</p>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-gray">
                Monitoreo centralizado de transacciones globales, conciliación de liquidaciones y configuración dinámica de reglas tarifarias.
              </p>
            </div>
          </section>

          {/* Features Detail Section */}
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <article className="group rounded-xl border border-outline-custom bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-gray">Tarifas</p>
              </div>
              <h3 className="mt-3 text-xl font-bold text-primary">Reglas persistidas y legibles</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-gray">
                Configuración flexible del precio base y descuentos dinámicos por ocupación de asientos en tiempo real de forma centralizada.
              </p>
            </article>

            <article className="group rounded-xl border border-outline-custom bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-success-emerald/20">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-success-emerald" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-gray">Procesamiento</p>
              </div>
              <h3 className="mt-3 text-xl font-bold text-primary">Cobros automatizados</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-gray">
                Ejecución automática de cobros programados 1 hora antes del viaje y flujos integrados de pago seguro con Mercado Pago.
              </p>
            </article>

            <article className="group rounded-xl border border-outline-custom bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-warning-amber/20">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-warning-amber" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-gray">Finanzas</p>
              </div>
              <h3 className="mt-3 text-xl font-bold text-primary">Liquidación transparente</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-gray">
                Trazabilidad completa de las transferencias a conductores, estados de conciliación claros y descarga fácil de información de cobro.
              </p>
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}

