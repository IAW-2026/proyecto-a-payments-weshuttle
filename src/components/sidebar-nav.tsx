"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
};

function getInitials(label: string) {
  return label
    .split(/\s+|\//)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function normalizeHref(href: string) {
  return href.split("#")[0] || href;
}

function hasHash(href: string) {
  return href.includes("#");
}

function isItemActive(pathname: string, item: NavItem) {
  const itemPath = normalizeHref(item.href);

  if (hasHash(item.href)) {
    return pathname === itemPath;
  }

  if (item.match === "prefix") {
    return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
  }

  return pathname === itemPath;
}

export function SidebarNav({
  items,
  onNavigate,
  collapsed = false,
}: {
  items: NavItem[];
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className="space-y-2" aria-label="Navegacion principal del rol">
      {items.map((item) => {
        const isActive = isItemActive(pathname, item);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            onClick={onNavigate}
            className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${
              isActive
                ? "bg-sky-50 text-sky-900 shadow-sm ring-1 ring-sky-200"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {collapsed ? (
              <span className="hidden items-center justify-center lg:flex" aria-hidden="true">
                {getInitials(item.label)}
              </span>
            ) : null}
            <span className={collapsed ? "lg:sr-only" : ""}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
