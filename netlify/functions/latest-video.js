/*
 * ===================== LATEST VIDEO PROXY =====================
 *
 * Server-side Proxy zur YouTube Data API v3. Vom Browser via
 *   /.netlify/functions/latest-video?channel=de|en
 * aufgerufen. Liefert das neueste Longform-Video als JSON:
 *   { videoId, title, thumbnail }
 *
 * Warum nicht direkt aus dem Browser? → API-Key bleibt server-seitig,
 * Quota wird durch CDN-Cache geschützt.
 *
 * Quota-Setup:
 *   - Uploads-Playlist statt search.list (Channel UCxxx → UUxxx).
 *     2 Units pro Refresh statt 101.
 *   - CDN-Cache 60s mit stale-while-revalidate=24h.
 *   - 60 Refreshes/h * 24h * 2 Units * 2 Channels ≈ 5.760 Units/Tag,
 *     <60% des Default-Quotas (10.000) — und User sehen neue Videos
 *     spätestens 1 Min nach Upload.
 *
 * ===================== KONFIGURATION =====================
 *
 * 1) CHANNELS-Mapping unten: deine Kanäle eintragen
 *    Format:  '<channel-key-aus-data-channel>': 'UC...'
 *
 * 2) ALLOWED_HOSTS: deine Production-Domain(s) eintragen
 *    Verhindert, dass Fremde deine API-Quota verbrauchen.
 *
 * 3) Netlify Env Var setzen:
 *    YOUTUBE_API_KEY = dein YouTube Data API v3 Key
 *    (Empfohlen: HTTP-Referrer-Restriction in Google Cloud Console,
 *     siehe docs/02-setup-youtube.md)
 */

const CHANNELS = {
    // 'de': 'UCxxxxxxxxxxxxxxxxxxxxxx',
    // 'en': 'UCxxxxxxxxxxxxxxxxxxxxxx'
};

const MIN_DURATION_SECONDS = 300; // 5 Min — filtert Shorts raus

const ALLOWED_HOSTS = [
    // 'links.deinedomain.com',
    /\.netlify\.app$/  // Erlaubt Netlify-Preview-Deploys
];

function isAllowedRequest(req) {
    const referer = req.headers.get('referer');
    const origin  = req.headers.get('origin');
    let host = null;
    try {
        if (referer) host = new URL(referer).hostname;
        else if (origin) host = new URL(origin).hostname;
    } catch (e) {
        return false;
    }
    if (!host) return false;
    return ALLOWED_HOSTS.some((rule) =>
        typeof rule === 'string' ? host === rule : rule.test(host)
    );
}

function uploadsPlaylistId(channelId) {
    // YouTube-Konvention: jeder Channel UCxxx hat eine Uploads-Playlist UUxxx
    return 'UU' + channelId.slice(2);
}

function parseDuration(iso) {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const h = parseInt(match[1] || 0, 10);
    const m = parseInt(match[2] || 0, 10);
    const s = parseInt(match[3] || 0, 10);
    return h * 3600 + m * 60 + s;
}

function jsonError(status, message) {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

export default async (req) => {
    if (!isAllowedRequest(req)) return jsonError(403, 'forbidden');

    const url       = new URL(req.url);
    const channel   = (url.searchParams.get('channel') || '').toLowerCase();
    const channelId = CHANNELS[channel];
    if (!channelId) return jsonError(400, 'unknown channel');

    const apiKey = process.env.YOUTUBE_API_KEY || (typeof Netlify !== 'undefined' && Netlify.env.get('YOUTUBE_API_KEY'));
    if (!apiKey) return jsonError(500, 'YOUTUBE_API_KEY not configured');

    try {
        const playlistUrl = 'https://www.googleapis.com/youtube/v3/playlistItems'
            + '?part=snippet'
            + '&playlistId=' + uploadsPlaylistId(channelId)
            + '&maxResults=10'
            + '&key=' + apiKey;

        const playlistRes  = await fetch(playlistUrl);
        const playlistData = await playlistRes.json();
        if (playlistData.error) return jsonError(502, 'youtube playlist: ' + playlistData.error.message);
        if (!playlistData.items || playlistData.items.length === 0) return jsonError(404, 'no videos');

        const ids = playlistData.items
            .map((item) => item.snippet && item.snippet.resourceId && item.snippet.resourceId.videoId)
            .filter(Boolean)
            .join(',');

        const detailUrl = 'https://www.googleapis.com/youtube/v3/videos'
            + '?part=contentDetails,snippet'
            + '&id=' + ids
            + '&key=' + apiKey;

        const detailRes  = await fetch(detailUrl);
        const detailData = await detailRes.json();
        if (detailData.error) return jsonError(502, 'youtube videos: ' + detailData.error.message);
        if (!detailData.items) return jsonError(502, 'no details');

        for (const video of detailData.items) {
            const duration = parseDuration(video.contentDetails.duration);
            if (duration < MIN_DURATION_SECONDS) continue;

            const thumb = video.snippet.thumbnails;
            const body  = JSON.stringify({
                videoId: video.id,
                title: video.snippet.title,
                thumbnail: thumb.maxres ? thumb.maxres.url : thumb.high.url
            });

            return new Response(body, {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=60',
                    'Netlify-CDN-Cache-Control': 'public, max-age=60, stale-while-revalidate=86400'
                }
            });
        }

        return jsonError(404, 'no longform video found');
    } catch (err) {
        return jsonError(502, err.message || 'fetch failed');
    }
};

export const config = {
    path: '/.netlify/functions/latest-video'
};
