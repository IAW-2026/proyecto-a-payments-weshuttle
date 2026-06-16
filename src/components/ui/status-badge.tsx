function getTone(value: string) {
  switch (value) {
    case "PAID":
    case "COMPLETED":
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "PENDING":
    case "CREATED":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "CANCELED":
    case "EXPIRED":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "DENIED":
    case "INACTIVE":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

export function StatusBadge({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getTone(value)}`}
    >
      {label ?? value}
    </span>
  );
}
