import { requirePageRole } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/components/ui/format";
import { getNotifications } from "@/lib/notifications";

export const runtime = "nodejs";

export default async function AdminNotificationsPage() {
  const authContext = await requirePageRole(["admin"]);
  const notifications = await getNotifications(50);

  return (
    <AppShell
      role="admin"
      clerkUserId={authContext.clerkUserId}
      title="Registro de Notificaciones"
      description="Historial persistente de todas las notificaciones de pagos, liquidaciones, créditos y métodos de cobro."
    >
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        <SectionCard>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Historial Reciente</h3>
              <p className="text-xs text-slate-500 mt-1">
                Visualiza los últimos 50 eventos registrados en la plataforma.
              </p>
            </div>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 self-start sm:self-auto shrink-0">
              {notifications.length} registros
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="group relative rounded-xl border border-slate-200 bg-white p-5 transition hover:border-sky-300 hover:shadow-xs"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-5 w-5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 003-3H7a3 3 0 003 3z"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">
                          {notification.title}
                        </h4>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 uppercase tracking-wider">
                          {notification.type.toLowerCase().replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                        {notification.message}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 min-w-0">
                          <span className="font-semibold text-slate-600">Usuario Relacionado:</span>
                          <span className="font-mono break-all">{notification.userId}</span>
                          {notification.role && (
                            <span className="rounded bg-sky-50 text-sky-700 px-1 font-bold">
                              {notification.role}
                            </span>
                          )}
                        </span>
                        <span className="hidden sm:inline text-slate-300">•</span>
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-slate-600">Autor:</span>
                          <span>{notification.actorName ?? "Sistema"}</span>
                          {notification.actorRole && (
                            <span className="rounded bg-slate-100 text-slate-700 px-1 font-bold">
                              {notification.actorRole}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-[10px] text-slate-400 font-medium">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {notifications.length === 0 ? (
              <EmptyState
                title="Sin notificaciones registradas"
                description="Aquí aparecerán las notificaciones persistentes una vez que se realicen acciones en el sistema."
              />
            ) : null}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
