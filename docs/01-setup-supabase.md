# 01 — Supabase Setup

Du brauchst Supabase nur, wenn du Tracking + Dashboard nutzen willst. Ohne Tracking funktioniert der Linktree auch — `src/tracking.js` deaktiviert sich dann selbst.

Supabase ist gratis bis 500 MB DB + 5 GB Egress/Monat. Reicht für mehrere Millionen Events.

---

## 1. Projekt anlegen

1. https://supabase.com/dashboard → "New project"
2. Region: am besten EU (Frankfurt) — geringere Latenz für deutsche Besucher
3. DB-Passwort generieren + sicher speichern
4. ~2 Min warten bis das Projekt provisioniert ist

## 2. Tabelle anlegen

Im Supabase Dashboard → "SQL Editor" → "New query" → das hier einfügen + Run:

```sql
-- Tabelle für alle Tracking-Events
create table public.link_events (
    id          bigint generated always as identity primary key,
    event_type  text not null check (event_type in ('view', 'click')),
    link_name   text,                       -- nur für event_type='click'
    channel     text not null,              -- z.B. 'de', 'en', 'demo'
    country     text default 'unknown',     -- ISO Country Code aus Netlify-Geo
    referrer    text,                       -- Hostname oder 'direct'
    device      text,                       -- 'mobile' oder 'desktop'
    utm_source  text,                       -- aus ?utm_source=
    created_at  timestamptz not null default now()
);

-- Index für Dashboard-Abfragen
create index link_events_created_at_idx on public.link_events (created_at desc);
create index link_events_channel_idx    on public.link_events (channel);

-- Row Level Security aktivieren
alter table public.link_events enable row level security;

-- Policy 1: anon-Rolle darf INSERT (das Tracking-Script)
create policy "anon can insert events"
on public.link_events
for insert
to anon
with check (true);

-- Policy 2: NICHTS sonst für anon — kein SELECT, kein UPDATE, kein DELETE.
-- Das Dashboard nutzt den service_role Key via Netlify Function,
-- der RLS sowieso umgeht.
```

## 3. API Keys notieren

Supabase Dashboard → "Project Settings" → "API":

| Key | Wo verwenden | Geheim? |
|-----|--------------|---------|
| Project URL | Frontend (`olt:supabase-url`) + Dashboard Env Var (`SUPABASE_URL`) | nein |
| `anon` / `public` Key | Frontend (`olt:supabase-anon-key`) | nein (das ist Public by Design) |
| `service_role` / `secret` Key | NUR Dashboard als Netlify Env Var `SUPABASE_SECRET_KEY` | JA — niemals in Browser/Repo |

> **Wichtig:** Der `service_role` Key umgeht alle RLS-Policies. Niemals in Frontend-Code, niemals in Git, niemals in einer Branch. Wenn er versehentlich geleakt wird, sofort in Supabase → Settings → API → "Reset" rotieren.

## 4. Eintragen ins Projekt

**Frontend** (`index.html`):
```html
<meta name="olt:supabase-url"      content="https://xxxxx.supabase.co">
<meta name="olt:supabase-anon-key" content="eyJhbGciOiJIUzI1NiIs...">
<meta name="olt:channel"           content="de">
```

**Netlify** (Site Settings → Environment variables):
```
SUPABASE_URL        = https://xxxxx.supabase.co
SUPABASE_SECRET_KEY = sb_secret_...   (Service-Role-Key)
```

**`netlify.toml`** — CSP `connect-src` anpassen, damit der Browser den Tracking-Request erlaubt:
```toml
Content-Security-Policy = "...; connect-src 'self' https://xxxxx.supabase.co; ..."
```

## 5. Test

1. Frontend lokal oder auf Netlify aufrufen
2. Auf einen Link klicken
3. Supabase Dashboard → "Table editor" → `link_events` → es sollten 2 Einträge da sein (1x `view`, 1x `click`)

Wenn nichts ankommt:
- Browser-DevTools → Network: ist der Request an `xxxxx.supabase.co/rest/v1/link_events` da?
- Falls 401: Anon-Key falsch oder RLS-Policy fehlt
- Falls "Refused to connect": CSP `connect-src` vergessen
- Falls Console-Warnung "Tracking Disabled": Meta-Tags leer / falsch geschrieben
