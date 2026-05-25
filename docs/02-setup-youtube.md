# 02 — YouTube Auto-Update einrichten

Du brauchst das nur, wenn du die **Video-Card** nutzen willst — die zeigt automatisch dein neuestes Longform-Video (>5 Min, filtert Shorts).

Wenn du keine Video-Card willst, einfach den `<a id="latest-video-link">` Block aus `index.html` löschen — `src/youtube.js` macht dann nichts.

---

## 1. YouTube Channel ID rausfinden

Channel ID hat das Format `UCxxxxxxxxxxxxxxxxxxxxxx` (24 Zeichen, beginnt mit `UC`).

- Auf youtube.com → dein Kanal öffnen
- URL endet auf `/channel/UCxxxxx...` → das ist die ID
- Wenn deine URL `youtube.com/@handle` ist: rechts oben Klicken → "Share channel" → "Copy channel ID"

## 2. Google Cloud Projekt + API Key

1. https://console.cloud.google.com/ → Projekt anlegen ("My YouTube Linktree")
2. Links im Menü → "APIs & Services" → "Library"
3. "YouTube Data API v3" suchen → "Enable"
4. Links → "Credentials" → "Create Credentials" → "API key"
5. Den Key kopieren — er sieht aus wie `AIzaSy...` (39 Zeichen)

## 3. Key restricten (WICHTIG für Security)

Klick auf den neuen Key in der Credentials-Liste:

**Application restrictions:**
- "Websites" auswählen
- Domains hinzufügen:
  - `*.netlify.app/*`  (für Preview-Deploys)
  - `links.deinedomain.com/*`  (deine Production-Domain)
- Speichern

**API restrictions:**
- "Restrict key" auswählen
- Nur "YouTube Data API v3" aktivieren
- Speichern

Ohne diese Restrictions kann jeder mit Zugriff auf deinen Key deine Quota verbrauchen.

## 4. Quota verstehen

Default: 10.000 Units/Tag (gratis).

Unser Setup verbraucht **~5.760 Units/Tag** für 2 Channels mit 60-Sekunden-Refresh:
- `playlistItems.list` = 1 Unit, `videos.list` = 1 Unit = 2 Units pro Refresh
- 60 Refreshes/h * 24h * 2 Units * 2 Channels = 5.760

Dank CDN-Cache (60s) und stale-while-revalidate sehen User trotzdem neue Videos innerhalb von ~1 Min nach Upload. Wenn du nur 1 Channel hast, halbiert sich der Verbrauch.

## 5. In Netlify als Env Var setzen

Netlify Dashboard → dein Site → "Site settings" → "Environment variables" → "Add a variable":

```
Key:   YOUTUBE_API_KEY
Value: AIzaSy...
```

Nach dem Speichern muss die Site neu deployed werden, damit die Function den Wert sieht.

## 6. CHANNELS Mapping editieren

Datei: `netlify/functions/latest-video.js`

```js
const CHANNELS = {
    'de': 'UCxxxxxxxxxxxxxxxxxxxxxx',     // Channel-ID DE
    'en': 'UCyyyyyyyyyyyyyyyyyyyyyy'      // Channel-ID EN
};
```

Der Key (`'de'`, `'en'`, ...) muss dem `data-channel="..."` auf deinem `<html>` Tag entsprechen — bzw. dem `<meta name="olt:channel">`. Wenn du nur einen Channel hast, kann der Key alles sein, z.B. `'main'`.

## 7. ALLOWED_HOSTS editieren

Selbe Datei, gleich darunter:

```js
const ALLOWED_HOSTS = [
    'links.deinedomain.com',
    /\.netlify\.app$/    // Preview-Deploys
];
```

Das ist eine zusätzliche Schutzschicht: fremde Domains können die Function nicht aufrufen, selbst wenn sie deine URL erraten.

## 8. Test

1. Deployen
2. Frontend öffnen — die Video-Card sollte nach ~1-2 Sekunden Thumbnail + Titel zeigen
3. Falls nicht: Netlify Function Logs anschauen (Site → "Logs" → "Functions" → `latest-video`)

Typische Fehler:
- `403 forbidden` → ALLOWED_HOSTS passt nicht, Domain ergänzen
- `500 YOUTUBE_API_KEY not configured` → Env Var nicht gesetzt oder Site nicht neu deployed
- `502 youtube playlist: ...` → API-Key Restriction blockiert, Key-Permissions checken
- `404 no longform video found` → Kanal hat keine Videos > 5 Min, oder `MIN_DURATION_SECONDS` reduzieren

## Anpassen

**Andere Mindestlänge** (z.B. nur >10 Min):
```js
const MIN_DURATION_SECONDS = 600;
```

**Shorts NICHT filtern** (zeigt einfach das aller-neueste Video):
```js
const MIN_DURATION_SECONDS = 0;
```

**Cache-Zeit anpassen** — Default ist 60s + 24h stale-while-revalidate:
Suche `Netlify-CDN-Cache-Control` in der Function und passe die Werte an.
