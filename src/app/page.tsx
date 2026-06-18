import Link from "next/link";
import { HeaderAuthButtons, HeroAuthButton } from "@/components/auth-client-elements";

export default async function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-linear-to-b from-[#f3f7fb] to-[#e8eff5] text-slate-900">
      {/* Sticky header navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-500/20 transition-transform duration-300 group-hover:scale-105">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              WeShuttle <span className="font-semibold text-sky-600">Payments</span>
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
          <section className="relative overflow-hidden rounded-[32px] border border-white/20 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-8 py-14 text-white shadow-2xl backdrop-blur-md sm:px-12 sm:py-16 md:px-16">
            {/* Background glowing elements for aesthetic appeal */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-80 w-80 rounded-full bg-sky-500/10 blur-[100px] pointer-events-none" />

            <div className="relative max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-sky-400">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                Pagos Inteligentes
              </div>
              <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl bg-gradient-to-r from-white via-white to-slate-300 bg-clip-text text-transparent">
                Optimiza los pagos de tu transporte corporativo.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-slate-300">
                Una plataforma inteligente para gestionar cobros automáticos, tarifas flexibles y liquidaciones a conductores de manera segura y eficiente.
              </p>
              
              <HeroAuthButton />
            </div>
          </section>

          {/* Roles Section */}
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Rider Card */}
            <div className="group relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-sky-500/30 hover:shadow-xl hover:shadow-sky-500/5">
              <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-sky-500/5 blur-xl group-hover:bg-sky-500/10 transition-colors" />
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 transition-colors duration-300 group-hover:bg-sky-500 group-hover:text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-sky-600 transition-colors">Pasajero</h3>
              <p className="mt-2 text-2xl font-bold text-slate-800">Checkout claro</p>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                Gestión de saldos, aplicación de créditos y visualización en tiempo real del estado de tus pagos con Mercado Pago de forma simple y ágil.
              </p>
            </div>

            {/* Driver Card */}
            <div className="group relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5">
              <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-emerald-500/5 blur-xl group-hover:bg-emerald-500/10 transition-colors" />
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-colors duration-300 group-hover:bg-emerald-500 group-hover:text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17h5" />
                </svg>
              </div>
              <h3 className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-emerald-600 transition-colors">Conductor</h3>
              <p className="mt-2 text-2xl font-bold text-slate-800">Cobros transparentes</p>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                Consulta de fondos completados o pendientes y configuración de cuentas de cobro con una interfaz optimizada para cualquier dispositivo.
              </p>
            </div>

            {/* Admin Card */}
            <div className="group relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-500/30 hover:shadow-xl hover:shadow-amber-500/5">
              <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-amber-500/5 blur-xl group-hover:bg-amber-500/10 transition-colors" />
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-colors duration-300 group-hover:bg-amber-500 group-hover:text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-amber-600 transition-colors">Administrador</h3>
              <p className="mt-2 text-2xl font-bold text-slate-800">Control operativo</p>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                Monitoreo centralizado de transacciones globales, conciliación de liquidaciones y configuración dinámica de reglas tarifarias.
              </p>
            </div>
          </section>

          {/* Features Detail Section */}
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <article className="group rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300/80">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Tarifas</p>
              </div>
              <h3 className="mt-3 text-xl font-bold text-slate-900">Reglas persistidas y legibles</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Configuración flexible del precio base y descuentos dinámicos por ocupación de asientos en tiempo real de forma centralizada.
              </p>
            </article>

            <article className="group rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300/80">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Procesamiento</p>
              </div>
              <h3 className="mt-3 text-xl font-bold text-slate-900">Cobros automatizados</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Ejecución automática de cobros programados 1 hora antes del viaje y flujos integrados de pago seguro con Mercado Pago.
              </p>
            </article>

            <article className="group rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300/80">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Finanzas</p>
              </div>
              <h3 className="mt-3 text-xl font-bold text-slate-900">Liquidación transparente</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Trazabilidad completa de las transferencias a conductores, estados de conciliación claros y descarga fácil de información de cobro.
              </p>
            </article>
          </section>
        </div>
      </main>
    </div>
  );
}

