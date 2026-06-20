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
    case "FAILED":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

export function StatusBadge({
  value,
  label,
  rounded = "full",
}: {
  value: string;
  label?: string;
  rounded?: "full" | "lg";
}) {
  return (
    <span
      className={`inline-flex border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
        rounded === "lg" ? "rounded-lg" : "rounded-full"
      } ${getTone(value)}`}
    >
      {label ?? value}
    </span>
  );
}
