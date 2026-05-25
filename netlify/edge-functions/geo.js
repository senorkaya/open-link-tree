/*
 * ===================== GEO LOOKUP =====================
 *
 * Liefert den ISO-Country-Code des Besuchers — komplett ueber Netlify's
 * eigene Geo-Erkennung. Kein Drittanbieter, keine IP-Speicherung, keine
 * personenbezogenen Daten.
 *
 * Aufruf: GET /.netlify/functions/geo  →  { "country": "DE" }
 *
 * Auf anderen Hostern: einfach durch eine eigene Country-Lookup-Function
 * ersetzen, die das gleiche JSON-Format zurueckgibt.
 */

export default async (request, context) => {
    const country = context.geo?.country?.code || 'unknown';
    return new Response(JSON.stringify({ country }), {
        headers: { 'Content-Type': 'application/json' }
    });
};

export const config = { path: "/.netlify/functions/geo" };
