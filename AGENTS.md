# AGENTS.md — Brief für Claude, Cursor, Copilot etc.

Diese Datei beschreibt das Projekt aus Sicht eines AI-Coding-Agents. Wenn du Claude / Cursor / einen anderen Agent nutzt, um diesen Linktree für dich aufzusetzen, gib ihm den Inhalt dieser Datei als Kontext.

> Hi Agent! Bitte lies das hier komplett, bevor du Änderungen machst.

---

## Was das Projekt ist

Open-Source Linktree-Alternative. Statisches Frontend (HTML/CSS/JS, kein Build), optionales Tracking nach Supabase, optionales YouTube-Auto-Update für die "Latest Video"-Card, separates Analytics-Dashboard.

## Was der User typischerweise will

- "Pack meine Links rein" → `index.html` editieren
- "Mach es zweisprachig" → Subfolder `englisch/` mit eigener `index.html` anlegen (siehe Pattern unten)
- "Mein neuestes YouTube-Video soll automatisch erscheinen" → `docs/02-setup-youtube.md` durchgehen
- "Ich will sehen, was geklickt wurde" → Supabase + Dashboard aufsetzen (`docs/01`, `docs/05`)
- "Macht das Design schöner / anpassen" → `:root` Variablen in `src/styles.css`

## Architektur-Regeln (wichtig!)

1. **Kein Build-Step.** Alles ist statisches HTML/CSS/JS. Wenn der User npm/yarn/vite einführen will, frag erst nach — das geht meistens gegen den Spirit des Projekts.
2. **CSP ist strikt.** Keine inline `<script>`. Wenn du JS hinzufügen willst, leg eine Datei in `src/` an und binde sie per `<script src>` ein.
3. **Secrets gehören NIE in den Code.** Anon-Key Supabase ist OK (das ist sein Zweck). YouTube-Key und Supabase-Secret-Key NUR als Env Vars in Netlify, NIE im Repo.
4. **Tracking ist Opt-in via Meta-Tags.** Wenn `<meta name="olt:supabase-url">` leer ist, deaktiviert sich `src/tracking.js` selber. Du musst nichts auskommentieren.
5. **DE/EN-Trennung passiert via `data-channel` Attribut** auf dem `<html>`. Das Tracking liest das automatisch.

## Dateistruktur (was ist wo)

| Pfad | Was drin steht |
|------|----------------|
| `index.html` | Die Haupt-Linktree-Seite. Hier stehen alle Links. |
| `components.html` | Library-Showcase mit allen Button-Varianten + Code-Snippets. |
| `src/styles.css` | EIN Stylesheet für alles. Design-Tokens in `:root`. |
| `src/tracking.js` | Self-disabling, wenn keine Config gesetzt. |
| `src/youtube.js` | Macht nichts, wenn `#latest-video-link` nicht existiert. |
| `assets/` | Bilder. Placeholder sind SVGs. User soll die durch eigene ersetzen. |
| `netlify/edge-functions/geo.js` | Returns `{ country: "DE" }` via Netlify-Geo. |
| `netlify/functions/latest-video.js` | YouTube API Proxy mit CDN-Cache. CHANNELS + ALLOWED_HOSTS muss User editieren. |
| `netlify.toml` | Security Headers + CSP. |
| `dashboard/` | Eigenes Mini-Site. Eigene `netlify.toml`, eigene Function. Separater Netlify-Site. |
| `docs/` | Setup-Guides. Auf Deutsch. |

## Wenn der User einen Link hinzufügen will

Frag NICHT viel — schau dir die `<section class="links">` in `index.html` an und nutze die Button-Style, die am besten passt:

- **Primary CTA (Beratung, Hauptangebot)** → `consulting-card` (Highlight Card mit Bild)
- **Newsletter / Community / Substack** → `link-button link-button--stacked` (Title + Subtitle)
- **YouTube-Channel ohne Auto-Update** → simpler `link-button`
- **Shop / Produkte / Affiliate** → `product-card` (in `<section class="products">`, default versteckt)
- **Sekundäre Optionen unter einer Highlight-Card** → `link-button link-button--outline`

Alle Varianten + Code-Snippets stehen in `components.html` und in `docs/04-button-styles.md`.

Vergiss nicht `data-link="..."` zu setzen — das ist der Name im Tracking-Dashboard.

## Wenn der User Tracking aktivieren will

1. Frag: "Hast du schon ein Supabase-Projekt?"
2. Wenn nein → `docs/01-setup-supabase.md` durchgehen (SQL für Tabelle + RLS-Policies steht da)
3. URL + Anon Key in `index.html` Meta-Tags eintragen:
   ```html
   <meta name="olt:supabase-url"      content="https://xxxxx.supabase.co">
   <meta name="olt:supabase-anon-key" content="eyJhbGc...">
   ```
4. In `netlify.toml` die `connect-src` Direktive der CSP um die Supabase-Domain ergänzen
5. Channel-Tag setzen (`<meta name="olt:channel" content="de">`) — egal welcher Wert, Hauptsache du nutzt denselben im Dashboard-Filter

## Wenn der User YouTube-Auto-Update will

Komplexester Teil. `docs/02-setup-youtube.md` Schritt für Schritt:

1. Google Cloud Projekt + YouTube Data API v3 aktivieren
2. API Key erzeugen
3. Key auf HTTP-Referrer einschränken (deine Domain + `*.netlify.app`)
4. In Netlify als Env Var `YOUTUBE_API_KEY` setzen
5. `CHANNELS` Mapping in `netlify/functions/latest-video.js` editieren — z.B.:
   ```js
   const CHANNELS = {
       'de': 'UCxxxxxxxxxxxxxxxxxxxxxx',
       'en': 'UCyyyyyyyyyyyyyyyyyyyyyy'
   };
   ```
6. `ALLOWED_HOSTS` auch dort editieren — deine echte Domain rein, sonst gibt's 403

Wenn was nicht klappt, check die Netlify Function Logs.

## Wenn der User mehrere Sprachen will (DE + EN)

Pattern: Subfolder mit eigener `index.html`, aber shared `src/` + `assets/`:

```
index.html                   ← DE (Root)
englisch/
  └── index.html             ← EN — nutzt ../src/styles.css, ../src/tracking.js, ../src/youtube.js
src/...                      ← shared
assets/...                   ← shared
```

Der `<meta name="olt:channel">` Wert muss in beiden Dateien unterschiedlich sein (`de` vs `en`), damit das Dashboard filtern kann.

## Dashboard-Setup

Dashboard ist ein separates Netlify-Site (`dashboard/` Folder als eigenes publish dir, oder eigenes Repo deployen).

Env Vars in Dashboard-Site:
- `SUPABASE_URL` (gleicher wie im Frontend)
- `SUPABASE_SECRET_KEY` (das ist der `service_role` Key — NICHT der Anon-Key!)

Empfohlen: Netlify Password-Protection oder Identity einrichten, sonst kann jeder mit der URL deine Daten sehen.

## Was du NICHT machen sollst

- Keine Cookies hinzufügen (DSGVO-Aufwand)
- Keine externen Tracking-Tools (Google Analytics, Plausible etc.) — User hat sich bewusst für eigenes Setup entschieden
- Keine inline `<script>` Tags (CSP)
- Keine destruktiven Änderungen am Tracking-Schema, ohne mit dem User abzustimmen (Dashboard kaputt!)
- Nicht den Supabase Anon Key irgendwo wegnehmen — der ist OK im Frontend, das ist sein Zweck
- Nicht den Service-Role-Key in den Browser einbauen — der GEHÖRT in Env Vars
