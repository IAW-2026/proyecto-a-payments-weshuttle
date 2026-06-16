import { UserButton } from "@clerk/nextjs";
import type { AppRole } from "@/lib/clerk-roles";
import { SidebarNav } from "@/components/sidebar-nav";
import { SectionCard } from "@/components/ui/section-card";

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: Record<AppRole, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Resumen" },
    { href: "/admin/pricing-rules", label: "Reglas de precio" },
    { href: "/admin/transactions", label: "Transacciones" },
    { href: "/admin/settlements", label: "Liquidaciones" },
  ],
  rider: [
    { href: "/rider#credit-balance", label: "Saldo a favor" },
    { href: "/rider#checkout-demo", label: "Simular checkout" },
    { href: "/rider#reservation-detail", label: "Detalle de reserva" },
  ],
  driver: [
    { href: "/driver#payout-account", label: "Cuenta de cobro" },
    { href: "/driver#settlements", label: "Liquidaciones" },
  ],
};

export function AppShell({
  role,
  clerkUserId,
  title,
  description,
  children,
}: {
  role: AppRole;
  clerkUserId: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen text-slate-950">
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">WeShuttle Payments</p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">{title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              Rol {role}
            </span>
            <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-slate-500 sm:inline-flex">
              {clerkUserId}
            </span>
            <UserButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8">
        <aside>
          <SectionCard className="sticky top-6 p-4">
            <SidebarNav items={[...NAV_ITEMS[role], { href: "/", label: "Inicio" }]} />
          </SectionCard>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
