"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import type { AppRole } from "@/lib/clerk-roles";
import { NAV_ITEMS } from "@/components/role-nav";
import { SidebarNav } from "@/components/sidebar-nav";
import { SectionCard } from "@/components/ui/section-card";

const SIDEBAR_STORAGE_KEY = "weshuttle-payments-sidebar-collapsed";

function MenuButton({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={expanded ? "Colapsar navegacion" : "Expandir navegacion"}
      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-900 hover:text-slate-900"
    >
      <span className="sr-only">{expanded ? "Colapsar" : "Expandir"}</span>
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
        <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileNavOpen]);

  const roleItems = NAV_ITEMS[role];
  const roleHomeHref = role === "admin" ? "/admin" : role === "driver" ? "/driver" : "/rider";

  return (
    <div className="min-h-screen text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="lg:hidden">
              <MenuButton expanded={isMobileNavOpen} onClick={() => setIsMobileNavOpen((value) => !value)} />
            </div>

            <div className="hidden lg:block">
              <MenuButton expanded={!isSidebarCollapsed} onClick={() => setIsSidebarCollapsed((value) => !value)} />
            </div>

            <Link href={roleHomeHref} className="flex items-center gap-2.5 hover:opacity-90 transition">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-700 text-white shadow-md shadow-sky-200">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125a1.125 1.125 0 0 0 1.125-1.125V9.75M3.82 14.5a2.25 2.25 0 0 1-2.07-1.35m15 1.35a2.25 2.25 0 0 1-2.07-1.35m-12.93-.15h12.93M17 14.25v-1.621a4.5 4.5 0 0 0-.818-2.562L15 7.5M8 7.5h7M4 9.75H2" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                WeShuttle <span className="text-sky-700">Payments</span>
              </span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              Rol {role}
            </span>
            <UserButton />
          </div>
        </div>
      </header>

      {isMobileNavOpen ? <div className="fixed inset-0 z-40 bg-slate-950/20 lg:hidden" onClick={() => setIsMobileNavOpen(false)} aria-hidden="true" /> : null}

      <div
        className={`mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:px-8 ${
          isSidebarCollapsed ? "lg:grid-cols-[minmax(0,1fr)]" : "lg:grid-cols-[260px_minmax(0,1fr)]"
        }`}
      >
        <aside
          className={`fixed inset-x-4 top-[5.5rem] z-50 -translate-y-4 opacity-0 transition-all lg:sticky lg:top-[96px] lg:self-start lg:z-auto lg:translate-y-0 lg:opacity-100 lg:px-0 lg:py-0 lg:h-fit ${
            isMobileNavOpen ? "translate-y-0 opacity-100" : "pointer-events-none lg:pointer-events-auto"
          }`}
        >
          <SectionCard className={`overflow-hidden p-4 ${isSidebarCollapsed ? "hidden lg:hidden" : ""}`}>
            <div className="mb-4 flex items-center justify-end gap-3 lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
                aria-label="Cerrar navegacion"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <SidebarNav items={roleItems} onNavigate={() => setIsMobileNavOpen(false)} collapsed={false} />
          </SectionCard>
        </aside>

        <main className="min-w-0">
          {title && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl tracking-tight">{title}</h1>
              {description && <p className="mt-1.5 text-sm text-slate-600">{description}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
