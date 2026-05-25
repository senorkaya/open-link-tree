/*
 * ===================== TRACKING =====================
 *
 * Cookieless Klick- und View-Tracking nach Supabase. Keine IP-Speicherung,
 * kein User-Agent, keine Cookies — DSGVO-freundlich ohne Banner-Pflicht.
 *
 * Config wird aus <meta>-Tags in index.html gelesen:
 *   <meta name="olt:supabase-url"      content="https://xxx.supabase.co">
 *   <meta name="olt:supabase-anon-key" content="ey...">
 *   <meta name="olt:channel"           content="de">      // oder en, demo, ...
 *
 * Wenn supabase-url ODER supabase-anon-key leer sind, wird Tracking
 * komplett deaktiviert (sicher fuer lokale Demo).
 *
 * Supabase-Tabelle: link_events
 * Spalten: event_type, link_name, channel, country, referrer, device, utm_source, created_at
 * SQL: siehe docs/01-setup-supabase.md
 *
 * UTM-Support: ?utm_source=instagram landet in beiden Spalten
 * (utm_source UND referrer-Override). Nuetzlich, wenn TikTok/Instagram-Apps
 * keinen HTTP-Referrer senden.
 *
 * Country wird via Netlify Edge Function (/.netlify/functions/geo)
 * ermittelt. Wenn die Function fehlt, faellt der Wert auf "unknown" zurueck.
 */

(function () {
    function meta(name) {
        var el = document.querySelector('meta[name="' + name + '"]');
        return (el && el.getAttribute('content')) ? el.getAttribute('content').trim() : '';
    }

    var SUPABASE_URL      = meta('olt:supabase-url');
    var SUPABASE_ANON_KEY = meta('olt:supabase-anon-key');
    var CHANNEL           = meta('olt:channel') || document.documentElement.getAttribute('data-channel') || 'default';

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.info('[OLT Tracking] Disabled — set olt:supabase-url and olt:supabase-anon-key meta tags to enable.');
        return;
    }

    function getDevice() {
        return /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
    }

    function getReferrer() {
        var ref = document.referrer;
        if (!ref) return 'direct';
        try {
            return new URL(ref).hostname.replace('www.', '');
        } catch (e) {
            return 'unknown';
        }
    }

    function getUtmSource() {
        try {
            return new URLSearchParams(window.location.search).get('utm_source') || null;
        } catch (e) {
            return null;
        }
    }

    function postToSupabase(payload) {
        fetch(SUPABASE_URL + '/rest/v1/link_events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(payload)
        }).catch(function (err) {
            console.warn('[OLT Tracking] Failed:', err);
        });
    }

    function sendEvent(eventType, linkName) {
        var utmSource = getUtmSource();
        var payload = {
            event_type: eventType,
            link_name: linkName || null,
            channel: CHANNEL,
            referrer: utmSource || getReferrer(),
            utm_source: utmSource,
            device: getDevice()
        };

        fetch('/.netlify/functions/geo')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                payload.country = data.country || 'unknown';
                postToSupabase(payload);
            })
            .catch(function () {
                payload.country = 'unknown';
                postToSupabase(payload);
            });
    }

    // ---- Track Page View ----
    sendEvent('view', null);

    // ---- Track Link Clicks ----
    document.addEventListener('click', function (e) {
        var link = e.target.closest('[data-link]');
        if (link) {
            sendEvent('click', link.getAttribute('data-link'));
        }
    });
})();
