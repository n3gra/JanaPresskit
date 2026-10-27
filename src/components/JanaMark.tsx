/**
 * Jana's real wordmark. Rendered as a CSS mask so it takes `currentColor`
 * and can sit in ink on the screen or in paper on the black surround.
 * Source: Fuentes/brand/Jana_logo_{bold,stroke}.svg
 */
type Props = {
  variant?: "bold" | "stroke";
  className?: string;
  /** set when the mark is the accessible name of its own element */
  label?: string;
};

export default function JanaMark({ variant = "bold", className = "", label }: Props) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : "true"}
      className={`mark mark-${variant} ${className}`}
    />
  );
}
