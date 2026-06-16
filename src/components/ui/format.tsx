const STATUS_LABELS: Record<string, string> = {
  CREATED: "Listo para pagar",
  PENDING: "Pendiente",
  PAID: "Pagado",
  DENIED: "Rechazado",
  CANCELED: "Cancelado",
  EXPIRED: "Expirado",
  COMPLETED: "Completado",
  ACTIVE: "Activa",
  INACTIVE: "Inactiva",
  CREDIT_GRANTED: "Credito generado",
  CREDIT_APPLIED: "Credito aplicado",
};

export function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "No disponible";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function humanizeStatus(value: string) {
  return STATUS_LABELS[value] ?? value;
}
