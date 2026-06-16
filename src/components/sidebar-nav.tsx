"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

function normalizeHref(href: string) {
  return href.split("#")[0] || href;
}

function hasHash(href: string) {
  return href.includes("#");
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-2" aria-label="Navegacion principal del rol">
      {items.map((item) => {
        const itemPath = normalizeHref(item.href);
        const isActive = !hasHash(item.href) && pathname === itemPath;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${
              isActive
                ? "bg-sky-50 text-sky-900 shadow-sm ring-1 ring-sky-200"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
