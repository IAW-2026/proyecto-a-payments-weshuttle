import type { AppRole } from "@/lib/clerk-roles";

export type NavItem = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
};

export const NAV_ITEMS: Record<AppRole, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Inicio", match: "exact" },
    { href: "/admin/checkouts", label: "Pagos de Pasajeros", match: "prefix" },
    { href: "/admin/settlements", label: "Pagos a Choferes", match: "exact" },
    { href: "/admin/pricing-rules", label: "Reglas de Tarifas", match: "prefix" },
    { href: "/admin/credits", label: "Ajustes de Crédito", match: "exact" },
    { href: "/admin/notifications", label: "Notificaciones", match: "exact" },
  ],
  rider: [
    { href: "/rider", label: "Inicio", match: "exact" },
    { href: "/rider/balance", label: "Mi Billetera", match: "exact" },
    { href: "/rider/checkouts", label: "Historial de Pagos", match: "exact" },
  ],
  driver: [
    { href: "/driver", label: "Inicio", match: "exact" },
    { href: "/driver/account", label: "Datos de Cobro", match: "exact" },
    { href: "/driver/trips", label: "Viajes y Ganancias", match: "exact" },
  ],
};
