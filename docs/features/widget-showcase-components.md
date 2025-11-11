# Widget Showcase Components

De to showcase-komponenter er designet til hjemmesiden på `elva-solutions.com`, så I kan præsentere widget-funktionerne uden backend-integration. Komponenterne genskaber UI, animationer og stemning fra den rigtige Elva-widget og afspiller dummy-samtaler automatisk, når de kommer i viewport.

## Installation

Komponenterne ligger i `components/marketing/widget-showcase/`. De kan importeres direkte i enhver Next.js-side eller -sektion.

```jsx
import ProductRecommendationShowcase from '@/components/marketing/widget-showcase/ProductRecommendationShowcase.jsx';
import ImageUploadShowcase from '@/components/marketing/widget-showcase/ImageUploadShowcase.jsx';
```

> Bemærk: Path-aliaset `@/` virker, når `jsconfig.json`/`tsconfig.json` har root sat til projektet. Ellers kan du importere relativt fra `components/...`.

## Brug i en sektion

```jsx
export default function WidgetFeatures() {
  return (
    <section className="py-24 bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-6 grid gap-16 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-1 text-sm font-semibold tracking-wide">
            Produkt anbefaling
          </span>
          <h2 className="text-3xl font-bold">
            AI’en guider kunder til det perfektes produkt på under 30 sekunder.
          </h2>
          <p className="text-lg text-white/70">
            Afspil den indbyggede demo og se hvordan produktkort, e-commerce workflows og CTA’er aktiveres i et klik.
          </p>
        </div>

        <ProductRecommendationShowcase />
      </div>

      <div className="mt-24 grid gap-16 lg:grid-cols-2 lg:items-center">
        <ImageUploadShowcase className="order-last lg:order-first" />

        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-1 text-sm font-semibold tracking-wide">
            Billedeforståelse
          </span>
          <h2 className="text-3xl font-bold">
            Upload et foto – AI’en genkender produktet og foreslår næste skridt.
          </h2>
          <p className="text-lg text-white/70">
            Perfekt til service, reservedelssalg og visuelle NAV-integrationer.
          </p>
        </div>
      </div>
    </section>
  );
}
```

## Props & tilpasning

Begge komponenter arver props fra `WidgetShowcaseBase`:

| Prop | Default | Beskrivelse |
| --- | --- | --- |
| `accentColor` | `#4f46e5` | Ændrer header-gradient, brugerbobler og CTA-knapper. |
| `assistantName` | Variabel pr. showcase | Navn i headeren. |
| `assistantStatus` | `"Tilgængelig nu"` | Tekst ved den grønne status-dot. |
| `badgeText` | Variabel pr. showcase | Lille label under headeren. |
| `description` | Tekst under badge | Kort forklaring, kan fjernes ved `null`. |
| `conversation` | Dummy array | Kan udskiftes med eget array; hvert element kan være `user`, `assistant`, `products` eller `image`. |
| `headerCtaLabel` | `"Afspil igen"` | Tooltip/label for replay-ikonet. |

Conversation-entries understøtter følgende felter:

- `sender`: `'user'` eller `'assistant'`.
- `text`: Selve beskeden.
- `delay`: Millisekunder før beskeden vises (default 900 ms).
- `type`: `"products"` eller `"image"` for special rendering.
  - `products`: `{ heading, products: [{ id, name, description, price, cta, tag, fallback, mediaColor }] }`
  - `image`: `{ image: { src, alt }, caption, text }`

### Handicapvenlighed
- Komponenterne respekterer `prefers-reduced-motion` og viser alle beskeder med det samme uden animation.
- Fokus- og aria-labels er sat på alle interaktive elementer.

## Styling og animationer

`WidgetShowcaseBase` indeholder en `styled-jsx` blok med de vigtigste animationer (`pulse`, `bounce`) og layout fra den rigtige widget. Hvis styles skal overrides globalt, kan de flyttes til en dedikeret CSS-fil, men hold fast i class-navne for at bevare animationerne.

## Typiske variationer

- **Tekst-only demo**: Brug `conversation` uden specialtyper.
- **CTA-fokus**: Tilføj ekstra `product.cta`-knapper som “Book demo” eller “Prøv selv”.
- **Tema-switch**: Skift `accentColor` til eksempelvis `#0ea5e9` for et blåt tema eller `#10b981` for grøn.

## Roadmap-idéer

- Tilføj flere showcases (fx booking workflows eller vidensbase-svar).
- Udvid med “Afspil/pause” knap og indikator for hvor langt demoen er.
- Synkronisér showcases med live widget-data via client-side fetch, hvis det ønskes senere.


