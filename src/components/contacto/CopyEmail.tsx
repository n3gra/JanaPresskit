"use client";

import { useEffect, useRef, useState } from "react";

const SHOWN_MS = 1800;

/**
 * Contacto's booking addresses, each an `item_contact` (Figma 550:419): the
 * address copies itself, so it can be pasted into any mail client, since a
 * mailto: link does nothing for someone without one set up. The action on
 * the right says what happened for a moment; a live region says it out loud.
 */
export default function CopyEmail({ emails }: { emails: string[] }) {
  const [copied, setCopied] = useState<{ email: string; ok: boolean } | null>(null);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async (email: string) => {
    let ok = true;
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // No clipboard (an insecure origin, a denied permission): the address
      // is plain text in the row, so it can still be selected by hand.
      ok = false;
    }
    setCopied({ email, ok });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), SHOWN_MS);
  };

  const said = copied ? (copied.ok ? "Copiado" : "Copialo a mano") : "";

  return (
    <>
      {emails.map((email) => {
        const done = copied?.email === email;
        return (
          <dd key={email}>
            <button
              type="button"
              className="ct-item ct-item--copy"
              data-done={done ? "" : undefined}
              onClick={() => copy(email)}
            >
              <span className="ct-value">{email}</span>
              <span className="ct-action" aria-hidden="true">
                {done ? said : "Copiar"}
              </span>
              <span className="sr-only">, copiar la dirección</span>
            </button>
            <span className="sr-only" role="status">
              {done ? said : ""}
            </span>
          </dd>
        );
      })}
    </>
  );
}
