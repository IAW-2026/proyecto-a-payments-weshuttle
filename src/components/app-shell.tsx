import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import type { AppRole } from "@/lib/clerk-roles";

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
    { href: "/rider#payment-method", label: "Mi medio de pago" },
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
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">WeShuttle Payments</p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              Rol {role}
            </span>
            <span className="hidden rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-slate-600 sm:inline-flex">
              {clerkUserId}
            </span>
            <UserButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <nav className="space-y-2">
            {NAV_ITEMS[role].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/"
              className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Inicio
            </Link>
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
