const TONES = {
  sky: "border-primary/15 bg-linear-to-br from-info-light to-white text-primary",
  emerald: "border-success-emerald/15 bg-linear-to-br from-success-light to-white text-success-emerald",
  amber: "border-warning-amber/15 bg-linear-to-br from-warning-light to-white text-warning-amber",
  rose: "border-error-red/15 bg-linear-to-br from-error-light to-white text-error-red",
  slate: "border-outline-custom bg-surface text-slate-gray",
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
    <div className={`rounded-xl border p-5 ${TONES[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em]">{title}</p>
      <p className="mt-3 text-2xl font-bold text-primary sm:text-3xl">{value}</p>
      {description ? <p className="mt-2 text-sm text-slate-gray">{description}</p> : null}
    </div>
  );
}
