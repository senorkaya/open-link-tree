# 06 — Deploy auf anderen Hostern

Funktioniert ueberall, wo statische Seiten gehostet werden. Mit Einschraenkungen, wenn du Server-Functions brauchst.

| Hoster | Frontend | Geo-Lookup | YouTube-Proxy | Dashboard-Proxy |
|--------|----------|------------|---------------|-----------------|
| Netlify | ja | Edge Func | Function | Function |
| Vercel | ja | Edge Middleware | API Route | API Route |
| Cloudflare Pages | ja | Worker | Worker | Worker |
| GitHub Pages | ja | NEIN | NEIN | NEIN |
| Render / Railway / Fly | ja | eigener Endpoint | eigener Endpoint | eigener Endpoint |

---

## Vercel

1. https://vercel.com/new → Repo importieren
2. Framework Preset: "Other"
3. Build Command: leer
4. Output Directory: `./`
5. Deploy

Functions umbauen: Vercel API Routes leben unter `/api/`. Du musst:

- `netlify/functions/latest-video.js` → `api/latest-video.js` (Vercel-Format)
- `netlify/edge-functions/geo.js` → `api/geo.js` (Vercel hat `req.geo` via headers, leicht anderes API)
- `dashboard/netlify/functions/events.js` → `dashboard/api/events.js`

Code-Aenderungen sind minimal — beide Plattformen nutzen Web-Standard-Request/Response.

Env Vars: Project Settings → "Environment Variables".

---

## Cloudflare Pages

1. https://dash.cloudflare.com/ → "Workers & Pages" → "Create application" → "Pages"
2. Repo connecten
3. Build settings: leer, output `./`

Functions als Cloudflare Workers. Folder-Struktur: `functions/` im Repo-Root, jede `.js` ist eine Route.

- `netlify/functions/latest-video.js` → `functions/api/latest-video.js`
- Geo-Lookup brauchst du nicht: Cloudflare gibt dir `request.cf.country` direkt im Worker

Env Vars: Pages-Project → "Settings" → "Environment variables".

---

## GitHub Pages

Funktioniert NUR fuer reines Frontend (kein Tracking, kein YouTube, kein Dashboard) — es gibt keine Server-Funktionen.

1. Repo → Settings → Pages → Source: `main` branch, folder `/ (root)`
2. Domain: optional

Was nicht geht:
- Country-Tracking (Edge Function fehlt) → `country` ist immer `unknown`
- YouTube Auto-Update (Function fehlt)
- Dashboard (Function fehlt)

Workaround: Tracking direkt vom Browser an Supabase, ohne Country-Lookup. Funktioniert, aber `country`-Feld bleibt leer.

---

## Eigener Server (Render / Railway / Fly / VPS)

Statische Files mit Nginx oder Caddy. Functions als kleine Node/Bun-Endpoints. Beispiel mit Express:

```js
// server.js (Express)
import express from 'express';
import { fetch } from 'undici';

const app = express();
app.use(express.static('.'));

app.get('/.netlify/functions/geo', (req, res) => {
    // Country via Cloudflare-Header, geoip-lite, oder Drittanbieter
    res.json({ country: req.headers['cf-ipcountry'] || 'unknown' });
});

app.get('/.netlify/functions/latest-video', async (req, res) => {
    // Port von netlify/functions/latest-video.js
    // ...
});

app.listen(8000);
```

Die Pfade bleiben wie sie sind (`/.netlify/functions/*`) — Frontend-Code muss nicht angepasst werden. Bei Bedarf reverse-proxy oder umbenennen.

---

## Ohne Server-Functions deployen

Wenn du KEINE Functions willst (z.B. nur GitHub Pages):

- **Tracking deaktivieren**: Meta-Tags leer lassen (`src/tracking.js` deaktiviert sich selber).
- **Video-Card weglassen**: `<a id="latest-video-link">` aus `index.html` entfernen.
- **Dashboard separat hosten**: braucht Function fuer Supabase-Proxy, kann nicht auf GitHub Pages.

Dann ist es ein 100% statisches HTML-Projekt, deploybar ueberall (S3, IPFS, ein USB-Stick mit Webserver — egal).
