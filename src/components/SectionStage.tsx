/**
 * The shared construction every section is drawn on.
 *
 * A canvas the size of the eyepiece as Figma draws it for the current family
 * (1720x864 on desktop, 354x802 on a phone...), fitted to the real eyepiece
 * with one `transform`. Children are laid out in literal Figma pixels, relative
 * to the eyepiece's top-left corner, and never re-laid out while the eyepiece
 * morphs: the Viewfinder writes the stage's box only when the viewport changes.
 *
 * `.stage-safe` inside it is the safe zone — the canvas minus the margin and
 * the menu's band — with the family's columns. Tokens live in globals.css.
 * No JS of its own: it reads what the Viewfinder publishes.
 */
type Props = {
  className?: string;
  children: React.ReactNode;
};

export default function SectionStage({ className = "", children }: Props) {
  return <div className={`section-stage ${className}`}>{children}</div>;
}
