/**
 * One framing inside the eyepiece. Content is laid out against the eyepiece box
 * the Viewfinder writes to `--eye-*`, so it stays inside the glass as the shape
 * morphs. The outline narrows toward its poles, so `wide` also caps the content
 * height — a lobed eyepiece is only full width across its waist. Per-breakpoint
 * padding lives in globals.css, since the eyepiece turns portrait on a phone.
 */
type Props = {
  id: string;
  label: string;
  inset?: "normal" | "wide" | "dense";
  className?: string;
  children: React.ReactNode;
};

export default function Framing({
  id,
  label,
  inset = "normal",
  className = "",
  children,
}: Props) {
  return (
    <section
      id={id}
      aria-label={label}
      data-inset={inset}
      className={`framing relative flex min-h-[100dvh] flex-col ${
        inset === "dense" ? "justify-start" : "justify-center"
      } ${className}`}
    >
      {children}
    </section>
  );
}
