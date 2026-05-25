/*
 * ===================== EVENTS PROXY =====================
 *
 * Netlify Function — proxied Supabase-Abfragen mit dem Secret Key
 * (der niemals in den Browser darf). Liest die `link_events` Tabelle
 * mit Filter nach channel + Zeitraum.
 *
 * Aufruf: GET /api/events?channel=de&range=28
 *   channel = de | en | all
 *   range   = Tage rückwärts (0 = all-time)
 *
 * Env Vars (in Netlify Dashboard setzen):
 *   SUPABASE_URL        = https://xxxxx.supabase.co
 *   SUPABASE_SECRET_KEY = sb_secret_... (NICHT der Anon-Key!)
 *
 * Pagination: Supabase hat db-max-rows (Default 1.000). Damit auch
 * lange Zeiträume vollständig geladen werden, holen wir die Daten
 * in 1.000er-Batches via PostgREST Range-Header.
 */

const PAGE_SIZE  = 1000;
const SAFETY_CAP = 200000; // Hard stop für riesige Datenmengen

export default async (req) => {
    const SUPABASE_URL        = process.env.SUPABASE_URL;
    const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

    if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
        return jsonError(500, 'SUPABASE_URL and SUPABASE_SECRET_KEY must be set in Netlify env vars');
    }

    const url     = new URL(req.url);
    const channel = url.searchParams.get('channel') || 'all';
    const range   = parseInt(url.searchParams.get('range') || '28', 10);

    let supabaseUrl = SUPABASE_URL
        + '/rest/v1/link_events'
        + '?select=event_type,link_name,channel,country,referrer,device,utm_source,created_at'
        + '&order=created_at.desc';

    if (channel !== 'all') {
        supabaseUrl += '&channel=eq.' + encodeURIComponent(channel);
    }

    if (range > 0) {
        const since = new Date();
        since.setDate(since.getDate() - range);
        supabaseUrl += '&created_at=gte.' + since.toISOString();
    }

    try {
        const all = [];
        let from = 0;

        while (from < SAFETY_CAP) {
            const to = from + PAGE_SIZE - 1;
            const res = await fetch(supabaseUrl, {
                headers: {
                    'apikey': SUPABASE_SECRET_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_SECRET_KEY,
                    'Range-Unit': 'items',
                    'Range': from + '-' + to
                }
            });

            if (res.status !== 200 && res.status !== 206) {
                const errText = await res.text();
                return jsonError(502, 'supabase ' + res.status + ': ' + errText);
            }

            const page = await res.json();
            if (!Array.isArray(page) || page.length === 0) break;

            all.push.apply(all, page);
            if (page.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
        }

        return new Response(JSON.stringify(all), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'max-age=60'
            }
        });
    } catch (err) {
        return jsonError(502, err.message || 'fetch failed');
    }
};

function jsonError(status, message) {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

export const config = {
    path: "/api/events"
};
