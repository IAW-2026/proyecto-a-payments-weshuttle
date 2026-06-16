export function SectionCard({
  children,
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<"section">) {
  return (
    <section
      {...props}
      className={`rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.28)] backdrop-blur sm:p-8 ${className}`}
    >
      {children}
    </section>
  );
}
