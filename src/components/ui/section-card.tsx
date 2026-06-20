export function SectionCard({
  children,
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<"section">) {
  return (
    <section
      {...props}
      className={`rounded-xl border border-outline-custom bg-white p-5 shadow-sm sm:p-6 lg:p-8 ${className}`}
    >
      {children}
    </section>
  );
}
