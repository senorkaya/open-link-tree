/*
 * ===================== YOUTUBE AUTO-UPDATE =====================
 *
 * Holt das neueste Longform-Video (Default >5 Min) von einem YouTube-Kanal
 * und updated den Video-Card-Link im Linktree.
 *
 * Architektur:
 *   Browser  →  /.netlify/functions/latest-video?channel=de|en
 *            →  YouTube Data API (Key bleibt server-side, Quota geschuetzt)
 *
 * Wenn KEIN <a id="latest-video-link"> auf der Seite ist, macht dieses
 * Script nichts. Du brauchst es also nur, wenn du die Video-Card nutzt.
 *
 * Channel wird aus <html data-channel="..."> ermittelt. Channel-IDs +
 * Mapping konfigurierst du in netlify/functions/latest-video.js.
 *
 * Setup: docs/02-setup-youtube.md
 */

(function () {
    var linkEl  = document.getElementById('latest-video-link');
    var titleEl = document.getElementById('latest-video-title');
    var thumbEl = document.getElementById('latest-video-thumb');
    if (!linkEl || !titleEl) return;

    var channel  = document.documentElement.getAttribute('data-channel') || 'default';
    var endpoint = '/.netlify/functions/latest-video?channel=' + encodeURIComponent(channel);

    fetch(endpoint)
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (!data || !data.videoId) return;
            linkEl.href = 'https://www.youtube.com/watch?v=' + data.videoId;
            if (thumbEl) {
                thumbEl.src = data.thumbnail;
                thumbEl.alt = data.title;
            }
            titleEl.textContent = data.title;
        })
        .catch(function (err) {
            console.warn('[OLT YouTube] Konnte neuestes Video nicht laden:', err);
        });
})();
