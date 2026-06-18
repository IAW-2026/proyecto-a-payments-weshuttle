import type { AppRole } from "@/lib/clerk-roles";

export type NavItem = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
};

export const NAV_ITEMS: Record<AppRole, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Menu principal", match: "exact" },
    { href: "/admin/checkouts", label: "Pagos / Checkouts", match: "prefix" },
    { href: "/admin/credits", label: "Creditos", match: "exact" },
    { href: "/admin/pricing-rules", label: "Reglas de precios", match: "exact" },
    { href: "/admin/settlements", label: "Liquidaciones", match: "exact" },
    { href: "/admin/pools", label: "Pools", match: "exact" },
  ],
  rider: [
    { href: "/rider", label: "Menu principal", match: "exact" },
    { href: "/rider/balance", label: "Saldo y movimientos", match: "exact" },
    { href: "/rider/checkout-demo", label: "Crear checkout", match: "exact" },
    { href: "/rider/checkouts", label: "Checkouts recientes", match: "exact" },
    { href: "/rider/reservations", label: "Detalle de reserva", match: "exact" },
  ],
  driver: [
    { href: "/driver", label: "Menu principal", match: "exact" },
    { href: "/driver/account", label: "Cuenta de cobro", match: "exact" },
    { href: "/driver/settlements", label: "Liquidaciones", match: "exact" },
    { href: "/driver/trips", label: "Pools y viajes", match: "exact" },
  ],
};
