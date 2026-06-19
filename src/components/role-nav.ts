import type { AppRole } from "@/lib/clerk-roles";

export type NavItem = {
  href: string;
  label: string;
  match?: "exact" | "prefix";
};

export const NAV_ITEMS: Record<AppRole, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Inicio", match: "exact" },
    { href: "/admin/checkouts", label: "Control de pagos", match: "prefix" },
    { href: "/admin/credits", label: "Saldos y créditos", match: "exact" },
    { href: "/admin/pricing-rules", label: "Tarifas y reglas", match: "prefix" },
    { href: "/admin/settlements", label: "Pagos a choferes", match: "exact" },
    { href: "/admin/pools", label: "Cierre de viajes", match: "exact" },
  ],
  rider: [
    { href: "/rider", label: "Inicio", match: "exact" },
    { href: "/rider/balance", label: "Saldo y movimientos", match: "exact" },
    { href: "/rider/checkout-demo", label: "Pagar viaje de prueba", match: "exact" },
    { href: "/rider/checkouts", label: "Mis pagos", match: "exact" },
    { href: "/rider/reservations", label: "Mis viajes", match: "exact" },
  ],
  driver: [
    { href: "/driver", label: "Inicio", match: "exact" },
    { href: "/driver/account", label: "Datos de cobro", match: "exact" },
    { href: "/driver/trips", label: "Viajes y ganancias", match: "exact" },
  ],
};
