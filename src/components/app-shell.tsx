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
          <div className="flex min-w-0 items-start gap-3">
            <div className="lg:hidden">
              <MenuButton expanded={isMobileNavOpen} onClick={() => setIsMobileNavOpen((value) => !value)} />
            </div>

            <div>
              <div className="hidden lg:block">
                <MenuButton expanded={!isSidebarCollapsed} onClick={() => setIsSidebarCollapsed((value) => !value)} />
              </div>
            </div>

            <div className="min-w-0">
              <Link href={roleHomeHref} className="inline-flex max-w-fit flex-col">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">WeShuttle Payments</p>
                <h1 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">{title}</h1>
              </Link>
              <p className="mt-1 max-w-2xl text-sm text-slate-600 sm:pr-4">{description}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
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

      {isMobileNavOpen ? <div className="fixed inset-0 z-40 bg-slate-950/20 lg:hidden" onClick={() => setIsMobileNavOpen(false)} aria-hidden="true" /> : null}

      <div
        className={`mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:px-8 ${
          isSidebarCollapsed ? "lg:grid-cols-[minmax(0,1fr)]" : "lg:grid-cols-[260px_minmax(0,1fr)]"
        }`}
      >
        <aside
          className={`fixed inset-x-4 top-[5.5rem] z-50 -translate-y-4 opacity-0 transition-all lg:static lg:top-auto lg:z-auto lg:translate-y-0 lg:opacity-100 lg:px-0 lg:py-0 ${
            isMobileNavOpen ? "translate-y-0 opacity-100" : "pointer-events-none lg:pointer-events-auto"
          }`}
        >
          <SectionCard className={`overflow-hidden p-4 lg:sticky lg:top-24 ${isSidebarCollapsed ? "hidden lg:hidden" : ""}`}>
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

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
