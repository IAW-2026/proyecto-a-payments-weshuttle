const TONE_CLASSES = {
  info: "border-primary/10 bg-info-light text-primary",
  success: "border-success-emerald/15 bg-success-light text-success-emerald",
  warning: "border-warning-amber/15 bg-warning-light text-warning-amber",
  danger: "border-error-red/15 bg-error-light text-error-red",
} as const;

export function AlertBanner({
  title,
  children,
  tone = "info",
}: {
  title?: string;
  children: React.ReactNode;
  tone?: keyof typeof TONE_CLASSES;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl border px-4 py-3 text-sm shadow-sm ${TONE_CLASSES[tone]}`}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
}
