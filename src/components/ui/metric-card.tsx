const TONES = {
  sky: "border-sky-100 bg-linear-to-br from-sky-50 to-white text-sky-700",
  emerald: "border-emerald-100 bg-linear-to-br from-emerald-50 to-white text-emerald-700",
  amber: "border-amber-100 bg-linear-to-br from-amber-50 to-white text-amber-700",
  rose: "border-rose-100 bg-linear-to-br from-rose-50 to-white text-rose-700",
  slate: "border-slate-200 bg-slate-50/80 text-slate-700",
} as const;

export function MetricCard({
  title,
  value,
  description,
  tone = "slate",
}: {
  title: string;
  value: string;
  description?: string;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className={`rounded-[24px] border p-5 ${TONES[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em]">{title}</p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
      {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
    </div>
  );
}
