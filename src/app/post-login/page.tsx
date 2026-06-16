import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthDiagnostics } from "@/lib/auth";
import { AlertBanner } from "@/components/ui/alert-banner";
import { SectionCard } from "@/components/ui/section-card";

export default async function PostLoginPage() {
  const authContext = await getAuthDiagnostics();

  if (!authContext.clerkUserId) {
    redirect("/");
  }

  if (authContext.role === "admin") {
    redirect("/admin");
  }

  if (authContext.role === "rider") {
    redirect("/rider");
  }

  if (authContext.role === "driver") {
    redirect("/driver");
  }

  return (
    <main className="min-h-screen px-6 py-10 text-slate-950">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <SectionCard className="overflow-hidden bg-linear-to-br from-white via-white to-amber-50/70">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-700">Acceso incompleto</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">La sesion se inicio, pero falta un rol valido.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            Para entrar a la demo, el usuario debe tener un rol aplicable en Clerk: `rider`, `driver` o `admin`.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Volver al inicio
            </Link>
          </div>
        </SectionCard>

        <AlertBanner tone="warning" title="Diagnostico de autenticacion">
          Esta informacion se mantiene visible para resolver configuraciones de Clerk sin tocar la logica funcional de la app.
        </AlertBanner>

        <SectionCard>
          <dl className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-slate-900">Clerk user ID</dt>
              <dd className="mt-1 break-all">{authContext.clerkUserId}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">Rol detectado</dt>
              <dd className="mt-1 break-all">{String(authContext.role)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">sessionClaims.role</dt>
              <dd className="mt-1 break-all">{String(authContext.diagnostics?.sessionRole)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">sessionClaims.metadata.role</dt>
              <dd className="mt-1 break-all">{String(authContext.diagnostics?.sessionMetadataRole)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">sessionClaims.publicMetadata.role</dt>
              <dd className="mt-1 break-all">{String(authContext.diagnostics?.sessionPublicMetadataRole)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">sessionClaims.unsafeMetadata.role</dt>
              <dd className="mt-1 break-all">{String(authContext.diagnostics?.sessionUnsafeMetadataRole)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">currentUser.publicMetadata.role</dt>
              <dd className="mt-1 break-all">{String(authContext.diagnostics?.userPublicMetadataRole)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">currentUser.unsafeMetadata.role</dt>
              <dd className="mt-1 break-all">{String(authContext.diagnostics?.userUnsafeMetadataRole)}</dd>
            </div>
          </dl>
        </SectionCard>
      </div>
    </main>
  );
}
