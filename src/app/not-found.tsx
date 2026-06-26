import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";

export default function NotFound() {
  return (
    <main className="min-h-screen px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <SectionCard className="overflow-hidden bg-linear-to-br from-white via-white to-sky-50/70">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">WeShuttle Payments</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">No encontramos esta vista.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Es posible que la URL no exista, que el checkout ya no sea accesible para este usuario o que el contenido haya cambiado de estado.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Volver al inicio
            </Link>
            <Link
              href="/rider"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-900 hover:text-slate-900"
            >
              Ir a Rider
            </Link>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
