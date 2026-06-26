"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import type { AppRole } from "@/lib/clerk-roles";
import { NAV_ITEMS } from "@/components/role-nav";

function getNavItemIcon(href: string) {
  if (href.endsWith("/rider") || href.endsWith("/driver") || href.endsWith("/admin")) {
    // Inicio (Home)
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5.5 h-5.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    );
  }
  if (href.includes("/balance") || href.includes("/credits")) {
    // Saldo / Créditos (Símbolo de Dólar $)
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5.5 h-5.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m3.5-14.5h-5a2.5 2.5 0 100 5h3a2.5 2.5 0 110 5h-5" />
      </svg>
    );
  }
  if (href.includes("/checkouts")) {
    // Control de pagos / Mis pagos (Recibo / Lista)
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5.5 h-5.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    );
  }
  if (href.includes("/account")) {
    // Cuenta / Perfil (Usuario / Tarjeta de identificación)
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5.5 h-5.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    );
  }
  if (href.includes("/trips")) {
    // Viajes y ganancias (Gráfico / Tendencias)
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5.5 h-5.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
      </svg>
    );
  }
  if (href.includes("/pricing-rules")) {
    // Tarifas y reglas (Etiqueta de precio / Código)
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5.5 h-5.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
      </svg>
    );
  }
  if (href.includes("/settlements")) {
    // Liquidaciones / Pagos a choferes (Usuarios agrupados / Manos)
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5.5 h-5.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.097.401A9.999 9.999 0 0 1 12 21c-2.316 0-4.47-.787-6.195-2.115l.098-.401M18 18.72a9.005 9.005 0 0 0-6-2.228 9.005 9.005 0 0 0-6 2.228m7.5-7.488A3.917 3.917 0 1 1 15.75 7.5 3.917 3.917 0 0 1 13.5 11.232ZM6 16.28a3 3 0 0 0-4.682 2.72 8.94 8.94 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94-3.197M15 16.28a3 3 0 0 0 4.682 2.72 8.94 8.94 0 0 0-3.74-.477m-.94-3.197a5.971 5.971 0 0 0 .94-3.197" />
      </svg>
    );
  }
  if (href.includes("/pools")) {
    // Cierre de viajes (Reloj / Check)
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5.5 h-5.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
  }
  if (href.includes("/notifications")) {
    // Notificaciones (Campana)
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5.5 h-5.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M3.124 7.5A8.969 8.969 0 0 1 5.292 3m13.416 0a8.969 8.969 0 0 1 2.168 4.5" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5.5 h-5.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
  );
}

export function AppShell({
  role,
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
  const [isAdminMoreOpen, setIsAdminMoreOpen] = useState(false);
  const pathname = usePathname();

  const roleItems = NAV_ITEMS[role];
  const roleHomeHref = role === "admin" ? "/admin" : role === "driver" ? "/driver" : "/rider";

  // Filter items for bottom bar on mobile
  const mainBarItems = role === "admin"
    ? roleItems.filter(item => ["/admin", "/admin/checkouts", "/admin/settlements", "/admin/notifications"].includes(item.href))
    : roleItems;

  const moreItems = role === "admin"
    ? roleItems.filter(item => !["/admin", "/admin/checkouts", "/admin/settlements", "/admin/notifications"].includes(item.href))
    : [];

  const isItemActive = (itemHref: string, matchType?: "exact" | "prefix") => {
    const itemPath = itemHref.split("#")[0] || itemHref;
    if (matchType === "prefix") {
      return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
    }
    return pathname === itemPath;
  };

  return (
    <div className="min-h-screen text-slate-950">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-[var(--ws-outline)] shadow-[0_2px_12px_rgba(10,25,47,0.06)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href={roleHomeHref} className="flex items-center gap-3 hover:opacity-85 transition-opacity">
              <div className="flex items-center justify-center w-11 h-11 bg-white rounded-xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-1.5 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M 22 34 L 35 75 L 50 45 L 65 75 L 78 34"
                    fill="none"
                    stroke="#0c59cf"
                    strokeWidth="13"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="22" cy="30" r="8.5" fill="#e63946" />
                  <circle cx="50" cy="40" r="8.5" fill="#f59e0b" />
                  <circle cx="78" cy="30" r="8.5" fill="#10b981" />
                </svg>
              </div>
              <span className="ws-brand">
                WeShuttle <span className="font-semibold">Payments</span>
              </span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            {role === "rider" && process.env.NEXT_PUBLIC_RIDER_APP_URL && (
              <a
                href={process.env.NEXT_PUBLIC_RIDER_APP_URL}
                className="rounded-lg bg-primary hover:bg-primary-hover px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
              >
                Volver a Rider App
              </a>
            )}
            {role === "driver" && process.env.NEXT_PUBLIC_DRIVER_APP_URL && (
              <a
                href={process.env.NEXT_PUBLIC_DRIVER_APP_URL}
                className="rounded-lg bg-primary hover:bg-primary-hover px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
              >
                Volver a Driver App
              </a>
            )}
            <span className="rounded-full border border-outline-custom bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Rol {role}
            </span>
            <UserButton />
          </div>
        </div>
      </header>

      {/* Top Floating Pill Navigation for Desktop */}
      <div className="hidden lg:flex sticky top-[73px] z-20 justify-center w-full pointer-events-none py-3.5">
        <nav className="pointer-events-auto flex items-center gap-1.5 bg-slate-950/90 border border-slate-800/85 backdrop-blur-md rounded-full shadow-2xl p-1.5 text-white max-w-[90%] overflow-x-auto no-scrollbar whitespace-nowrap">
          {roleItems.map((item) => {
            const active = isItemActive(item.href, item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-150 ${
                  active
                    ? "bg-slate-800 text-white shadow-md scale-[1.03]"
                    : "text-slate-400 hover:text-white hover:bg-slate-900/60"
                }`}
              >
                <span>{getNavItemIcon(item.href)}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main layout container (single column layout for desktop since sidebar is removed) */}
      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 flex flex-col gap-6">
        {/* Main Content Area */}
        <main className="min-w-0 pb-24 lg:pb-0">
          {title && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl tracking-tight">{title}</h1>
              {description && <p className="mt-1.5 text-sm text-slate-600">{description}</p>}
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Premium Floating Bottom Navigation for Mobile */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md lg:hidden print:hidden">
        {/* Popover overlay for Admin "Más" menu */}
        {role === "admin" && isAdminMoreOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setIsAdminMoreOpen(false)}
            />
            <div className="absolute bottom-18 right-2 z-50 w-56 rounded-2xl border border-slate-800 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-md flex flex-col gap-1 text-slate-300">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800/80 mb-1">
                Administración
              </div>
              {moreItems.map((item) => {
                const active = isItemActive(item.href, item.match);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsAdminMoreOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                      active
                        ? "bg-slate-800 text-white"
                        : "hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    <span className={active ? "text-white" : "text-slate-400"}>
                      {getNavItemIcon(item.href)}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        <nav className="flex items-center justify-around bg-slate-950/90 border border-slate-800/85 backdrop-blur-md rounded-2xl shadow-2xl py-2.5 px-3 text-white">
          {mainBarItems.map((item) => {
            const active = isItemActive(item.href, item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-2 transition-all duration-150 ${
                  active
                    ? "bg-slate-800 text-white scale-[1.03]"
                    : "text-slate-400 hover:text-white hover:scale-[1.01]"
                }`}
              >
                <span>{getNavItemIcon(item.href)}</span>
                <span className="text-[10px] font-semibold leading-none">{item.label}</span>
              </Link>
            );
          })}

          {role === "admin" && (
            <button
              onClick={() => setIsAdminMoreOpen(!isAdminMoreOpen)}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-2 transition-all duration-150 ${
                isAdminMoreOpen
                  ? "bg-slate-800 text-white scale-[1.03]"
                  : "text-slate-400 hover:text-white hover:scale-[1.01]"
              }`}
            >
              <span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5.5 h-5.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </span>
              <span className="text-[10px] font-semibold leading-none">Más</span>
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}

