import { redirect } from "next/navigation";
import { getAuthDiagnostics } from "@/lib/auth";

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
    <main className="min-h-screen bg-[#F7F9FB] px-6 py-10 text-[#0A192F]">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <section className="rounded-3xl border border-[#D8DADC] bg-white p-8 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#4B5563]">
            Diagnostico Clerk
          </p>
          <h1 className="mt-3 text-3xl font-bold text-[#0A192F]">
            La sesion se inicio, pero no se detecto un rol aplicable.
          </h1>
          <p className="mt-4 text-sm leading-6 text-[#4B5563]">
            Verifica en Clerk que el usuario tenga `publicMetadata.role` con uno de estos valores exactos: `rider`, `driver` o `admin`.
          </p>
        </section>

        <section className="rounded-3xl border border-[#D8DADC] bg-white p-8 shadow-sm">
          <dl className="grid gap-4 text-sm text-[#4B5563] sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-[#0A192F]">clerk_user_id</dt>
              <dd className="mt-1 break-all">{authContext.clerkUserId}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#0A192F]">role detectado</dt>
              <dd className="mt-1 break-all">{String(authContext.role)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#0A192F]">sessionClaims.role</dt>
              <dd className="mt-1 break-all">{String(authContext.diagnostics?.sessionRole)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#0A192F]">sessionClaims.metadata.role</dt>
              <dd className="mt-1 break-all">{String(authContext.diagnostics?.sessionMetadataRole)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#0A192F]">sessionClaims.publicMetadata.role</dt>
              <dd className="mt-1 break-all">{String(authContext.diagnostics?.sessionPublicMetadataRole)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#0A192F]">sessionClaims.unsafeMetadata.role</dt>
              <dd className="mt-1 break-all">{String(authContext.diagnostics?.sessionUnsafeMetadataRole)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#0A192F]">currentUser.publicMetadata.role</dt>
              <dd className="mt-1 break-all">{String(authContext.diagnostics?.userPublicMetadataRole)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#0A192F]">currentUser.unsafeMetadata.role</dt>
              <dd className="mt-1 break-all">{String(authContext.diagnostics?.userUnsafeMetadataRole)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
