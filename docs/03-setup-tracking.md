# 03 — Tracking aktivieren

Voraussetzung: Supabase ist aufgesetzt (siehe `01-setup-supabase.md`).

## Wie es funktioniert

`src/tracking.js` macht 2 Sachen:

1. **Beim Page-Load:** ein `view`-Event nach Supabase
2. **Bei jedem Klick auf ein Element mit `data-link="..."`:** ein `click`-Event

Beide Events enthalten: `channel`, `country` (via Netlify-Geo), `referrer`, `device`, `utm_source`, `created_at`.

Keine Cookies, keine IPs, keine User-Agents — DSGVO-tauglich ohne Banner.

## Aktivieren

In `index.html` (und ggf. weiteren Sprach-Varianten wie `englisch/index.html`) die 3 Meta-Tags setzen:

```html
<meta name="olt:supabase-url"      content="https://xxxxx.supabase.co">
<meta name="olt:supabase-anon-key" content="eyJhbGciOiJIUzI1NiIs...">
<meta name="olt:channel"           content="de">
```

Sind diese leer, deaktiviert sich das Script selber (sicher für lokale Demo).

In `netlify.toml` muss die CSP-Direktive `connect-src` deine Supabase-Domain erlauben:
```toml
Content-Security-Policy = "...; connect-src 'self' https://xxxxx.supabase.co; ..."
```

## data-link auf Buttons setzen

Jedes Element, dessen Klicks getrackt werden sollen, braucht `data-link="..."` — der Wert landet im Dashboard als "Most Clicked Links".

```html
<a href="https://mein-substack.com"
   class="link-button"
   data-link="Newsletter"          <!-- Name für's Dashboard -->
   target="_blank" rel="noopener">
    <span class="link-button__text">Newsletter</span>
</a>
```

Funktioniert auch auf Eltern-Elementen — wenn du auf ein verschachteltes `<span>` klickst, wird der `data-link` vom Eltern-`<a>` benutzt (via `closest()`).

## UTM-Support

Wenn du Bio-Links setzt, hang `?utm_source=instagram` (oder `tiktok`, `youtube`, ...) dran:

```
links.deinedomain.com?utm_source=instagram
links.deinedomain.com/englisch/?utm_source=tiktok
```

Das macht 2 Dinge:
1. Wird in der Spalte `utm_source` gespeichert
2. **Überschreibt den `referrer`** — wichtig, weil mobile Apps wie TikTok/Instagram oft keinen HTTP-Referrer senden. Ohne UTM steht da sonst nur "direct".

## Mehrere Sprachen / Channels

Setze `<meta name="olt:channel" content="...">` pro Sprache unterschiedlich:

- `index.html` (DE) → `content="de"`
- `englisch/index.html` (EN) → `content="en"`

Im Dashboard kannst du dann nach Channel filtern.

## Testing

Browser DevTools → Network → Filter `link_events`:
- Beim Pageload: `POST .../rest/v1/link_events` mit Body `{"event_type":"view",...}`
- Bei Klick: `POST .../rest/v1/link_events` mit Body `{"event_type":"click","link_name":"...",...}`

Status `201 Created` = alles gut. `401` = Anon-Key falsch oder RLS-Policy fehlt.

In Supabase Dashboard → "Table Editor" → `link_events` → sollte sich live füllen.

## Was NICHT getrackt wird

- Keine IP-Adresse
- Kein User-Agent (nur `mobile` / `desktop`)
- Keine eindeutige Besucher-ID (kein Cookie, kein localStorage)
- Keine Maus-Bewegungen, kein Scrollen, kein Session-Recording
- Keine personenbezogenen Daten

In deiner Datenschutzerklärung kannst du das genau so beschreiben.
