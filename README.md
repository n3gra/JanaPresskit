# Jana — press kit

Sitio de prensa de **Jana**, DJ de Mendoza, Argentina (digital y vinilo). Diseño y desarrollo: [Yamina Pipolo](https://linktr.ee/yamina.pipolo).

**En línea:** https://jana-press-kit.vercel.app

Una sola página con cuatro secciones que se recorren a través de un "visor" con look de monitor CRT: **Inicio** (video), **Archivo** (reproductor de sus sets de SoundCloud), **Perfil** y **Contacto**.

## Cómo correrlo

Necesita [Node.js](https://nodejs.org) 20.9 o más nuevo.

```bash
npm install
npm run dev
```

Abre en http://localhost:3000. Para verlo desde el celular en la misma red: `npm run dev -- -H 0.0.0.0` y entrar con la IP de la compu (hay que sumarla a `allowedDevOrigins` en `next.config.ts`).

## Dónde se cambia cada cosa

| Qué | Archivo |
| --- | --- |
| Sets de música (título, link de SoundCloud, portada, duración) | `src/lib/sets.ts` (portadas en `public/art/`, formas de onda en `public/peaks/`) |
| Redes (Instagram, SoundCloud, YouTube) y links de prensa y rider | `src/lib/channels.ts` |
| Mail de booking | `src/app/page.tsx` (`CONTACT_EMAILS`) |
| Título, descripción e imagen para Google y para compartir el link | `src/lib/site.ts` y `public/og.jpg` |
| Aparecer o no en Google | `src/lib/site.ts` → `indexable` (hoy `false`, a propósito, hasta el lanzamiento) |

## Cómo se publica

El repo está conectado a Vercel: **cada push a `main` se publica solo** en un minuto, más o menos. Si algo sale mal, en el panel de Vercel está **Instant Rollback** para volver a la versión anterior.

## Para quien siga el desarrollo

- Next.js 16 (App Router) + React 19 + Tailwind 4, en `src/`. Sin librerías de UI ni de animación.
- Antes de tocar código, leé [`docs/`](docs/README.md): estado del proyecto, decisiones cerradas y cómo está construido el visor.
- Verificar con `npx tsc --noEmit` y `npx eslint src`.
- Commits convencionales (`feat:`, `fix:`, `docs:`…).
- Accesibilidad en todos los efectos: sin destellos, nada se mueve con reduced motion, y una pausa global en el HUD.
