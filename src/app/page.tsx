import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-10">
      <section className="w-full max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-10 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
          Payments App
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
          Persistencia de pricing lista para administracion
        </h1>
        <p className="mt-4 max-w-2xl text-slate-600">
          La app ya puede persistir reglas de precio y exponer calculos de precio maximo y estimado a partir de `pricing_rules`.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link
            href="/admin/pricing-rules"
            className="rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:border-slate-900"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Admin
            </p>
            <h2 className="mt-3 text-xl font-semibold text-slate-900">Gestionar reglas de precio</h2>
            <p className="mt-2 text-sm text-slate-600">
              Crear, editar y activar reglas persistidas sin endpoints extra de administracion.
            </p>
          </Link>

          <a
            href="/api/payments/pricing-estimate?origin_lat=-38.718&origin_lng=-62.266&destination_id=dest_polo_petroquimico&current_passengers=5"
            className="rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:border-slate-900"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              API
            </p>
            <h2 className="mt-3 text-xl font-semibold text-slate-900">Probar pricing estimate</h2>
            <p className="mt-2 text-sm text-slate-600">
              Consulta directa del contrato `GET /api/payments/pricing-estimate` usando datos mock del proyecto.
            </p>
          </a>
        </div>
      </section>
    </main>
  );
}
