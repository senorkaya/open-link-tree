# 04 — Button Styles Cheat Sheet

Live-Vorschau aller Varianten: **`components.html`** (deployt unter `/components.html`).

## Welcher Style fuer was?

| Style | Wofuer | Klasse |
|-------|--------|--------|
| Basic | Standard-Link, neutral | `link-button` |
| Stacked | Newsletter, Substack, Community (Title + Subtitle) | `link-button link-button--stacked` |
| Outline | Sekundaer-Option neben Highlight-Card | `link-button link-button--outline` |
| Highlight Card | Hauptangebot, Beratung buchen, Top-CTA | `consulting-card` |
| Video Card | Aktuelles YouTube-Video (auto-update) | `video-card` |
| Product Card | Affiliate, Empfehlung, Produkt mit Bild | `product-card` (in `.products`) |

## Wann welche?

- **Genau 1x Highlight Card** pro Seite — sonst ist nichts mehr Highlight.
- **Hoechstens 2-3 Stacked Buttons** — zu viele Untertitel werden visuell unruhig.
- **Outline-Buttons** funktionieren am besten direkt unter einer Highlight-Card als Sekundaer-Option ("Bist du nicht sicher? Hier mehr lesen").
- **Video Card** kommt typisch nach den primaeren CTAs, aber vor "evergreen"-Links wie Newsletter.
- **Product Cards** standardmaessig versteckt (`display: none` auf `.products`) — aktivieren wenn du Empfehlungen rein willst.

## Snippets

### Basic
```html
<a href="https://..."
   class="link-button"
   data-link="Name"
   target="_blank" rel="noopener">
    <span class="link-button__text">Button-Text</span>
</a>
```

### Stacked
```html
<a href="https://..."
   class="link-button link-button--stacked"
   data-link="Name"
   target="_blank" rel="noopener">
    <span class="link-button__text">Titel</span>
    <span class="link-button__subtitle">Untertitel</span>
</a>
```

### Outline
```html
<a href="https://..."
   class="link-button link-button--outline"
   data-link="Name"
   target="_blank" rel="noopener">
    <span class="link-button__text">Button-Text</span>
</a>
```

### Highlight Card
```html
<a href="https://..."
   class="consulting-card"
   data-link="Name"
   target="_blank" rel="noopener">
    <div class="consulting-card__img" role="img" aria-label="..."></div>
    <div class="consulting-card__content">
        <div class="consulting-card__eyebrow">EYEBROW</div>
        <div class="consulting-card__title">Hauptangebot</div>
        <div class="consulting-card__sub">Wert in einem Satz</div>
        <div class="consulting-card__cta">CTA-Text &rarr;</div>
    </div>
</a>
```

Bild fuer die Highlight Card: in `src/styles.css` die Zeile
```css
.consulting-card__img { background-image: url('../assets/avatar-placeholder.svg'); ... }
```
auf deine eigene Datei umstellen, z.B. `url('../assets/mein-foto.webp')`.

### Video Card
```html
<a id="latest-video-link"
   href="https://www.youtube.com/@deinkanal"
   class="video-card"
   data-link="Neuestes Video"
   target="_blank" rel="noopener">
    <img id="latest-video-thumb" class="video-card__thumb" src="" alt="Thumbnail">
    <div class="video-card__overlay">
        <svg class="video-card__play" width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="24" fill="rgba(255,0,0,0.9)"/>
            <polygon points="20,16 20,32 34,24" fill="white"/>
        </svg>
    </div>
    <div class="video-card__info">
        <span class="video-card__label">Neuestes Video</span>
        <span class="video-card__title" id="latest-video-title">Wird geladen...</span>
    </div>
</a>
```

Voraussetzung: YouTube Setup aus `02-setup-youtube.md` durchgefuehrt. IDs `latest-video-link`, `latest-video-thumb`, `latest-video-title` NICHT umbenennen — daran haengt das Script.

### Product Card
```html
<a href="https://shop.com/produkt"
   class="product-card"
   data-link="Produktname"
   target="_blank" rel="noopener">
    <img class="product-card__image" src="assets/produkt.jpg" alt="Produkt">
    <span class="product-card__text">Produkt-Name</span>
</a>
```

Aktivieren: in `src/styles.css` `.products { display: none; }` aendern zu `display: block;`.

## Farben und Look anpassen

Alle Farben + Typo + Radius stehen in `:root` von `src/styles.css`:

```css
:root {
    --color-bg-outer: #5a3d32;     /* Hinter dem Phone-Frame */
    --color-bg-inner: #7c5646;     /* Im Phone-Frame */
    --color-accent: #c8a882;       /* Akzentfarbe */
    --radius: 12px;                /* Button-Rundung */
    --phone-width: 420px;          /* Frame-Breite Desktop */
    --phone-height: 90vh;          /* Frame-Hoehe Desktop */
}
```

Aendere die Werte, und alle Buttons + Cards + Backgrounds passen sich an.

## Neue Variante hinzufuegen

Wenn du z.B. eine Glass-Variante willst:

```css
.link-button--glass {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(12px);
    color: var(--color-white);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: none;
}
```

Dann im HTML: `class="link-button link-button--glass"`.
