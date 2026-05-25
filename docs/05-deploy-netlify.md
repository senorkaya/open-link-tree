# 05 — Deploy auf Netlify (empfohlen)

Netlify ist der einfachste Weg, weil Edge Functions (Geo-Lookup) und normale Functions (YouTube/Supabase-Proxy) ohne Extra-Setup laufen.

Gratis-Plan reicht für typische Linktree-Use-Cases.

---

## Frontend deployen

### Option A: Netlify CLI (schnellster Weg)

```bash
npm install -g netlify-cli
netlify login
cd open-link-tree
netlify init   # Folge dem Wizard: neues Site oder existing
netlify deploy --prod
```

### Option B: GitHub-Verknüpfung

1. Repo auf GitHub pushen
2. https://app.netlify.com/ → "Add new site" → "Import from Git"
3. Repository auswählen
4. Build settings: leer lassen (kein Build-Step)
5. Publish directory: `.` (Root)
6. Deploy

### Option C: Drag & Drop

1. https://app.netlify.com/ → "Sites" → Zip des Repos reinziehen
2. Hat den Nachteil: keine automatischen Re-Deploys bei Änderungen

---

## Env Vars setzen

Site → "Site settings" → "Environment variables" → "Add a variable":

```
YOUTUBE_API_KEY = AIzaSy...         (nur wenn Video-Card genutzt wird)
```

Nach dem Hinzufügen die Site neu deployen, damit die Functions die Variable sehen.

---

## Custom Domain

Site → "Domain management" → "Add a domain":

1. Domain eintragen (z.B. `links.deinedomain.com`)
2. Netlify zeigt dir die DNS-Records, die du beim Domain-Provider eintragen musst
3. SSL aktiviert sich automatisch (Let's Encrypt) — ~10 Minuten

Nicht vergessen: in `netlify/functions/latest-video.js` deine Domain in `ALLOWED_HOSTS` eintragen (sonst gibt's 403 von der YouTube-Function).

---

## Dashboard separat deployen

Das Dashboard ist ein eigenes Mini-Site. Empfehlung: als **zweiten Netlify-Site** mit eigener Subdomain (z.B. `links-dashboard.netlify.app` oder `dashboard.deinedomain.com`).

### Via CLI im Dashboard-Folder

```bash
cd dashboard
netlify init   # Neues Site anlegen
netlify deploy --prod
```

### Via GitHub mit Sub-Path

Wenn du das Dashboard auch im selben Repo deployen willst:
1. Neuen Site in Netlify
2. Repository auswählen
3. Publish directory: `dashboard`

### Env Vars im Dashboard-Site

```
SUPABASE_URL        = https://xxxxx.supabase.co
SUPABASE_SECRET_KEY = sb_secret_...    (Service-Role-Key aus Supabase Settings)
```

### Dashboard schützen (WICHTIG!)

Sonst kann jeder mit der URL deine Daten sehen.

**Option 1: Netlify Password-Protection** (Plan: Pro oder höher)
- Site → "Access control" → "Site protection" → Password setzen

**Option 2: Netlify Identity** (gratis, mehr Aufwand)
- Site → "Identity" → "Enable Identity"
- "Registration preferences" → "Invite only"
- Dich selber als User adden
- Im `dashboard/index.html` Identity-Widget einbauen + Redirect bei nicht-eingeloggt

**Option 3: Cloudflare Access** (gratis bis 50 User)
- Vor die Netlify-Domain stellen, IP-Whitelist oder Email-OTP

---

## Re-Deploy nach Änderungen

- Bei GitHub-Verknüpfung: einfach pushen → Netlify deployed automatisch
- Mit CLI: `netlify deploy --prod` im Repo-Folder
- Bei Env-Var-Änderungen: manuell "Trigger deploy" → "Deploy site" klicken, sonst sehen die Functions die neuen Werte nicht
