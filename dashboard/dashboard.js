/*
 * ===================== DASHBOARD =====================
 *
 * Liest link_events aus Supabase und zeigt:
 *   - KPI Cards (Views, Clicks, CTR)
 *   - Activity Chart (Views + Clicks ueber Zeit, Chart.js)
 *   - Most Clicked Links (Ranking mit Balken)
 *   - Visitor Summary (Laender mit Flaggen, Referrer, Devices)
 *
 * Filter: Channel (de/en/all) und Zeitraum (7/28/90/365/all).
 *
 * Daten werden via Netlify Function /api/events?channel=...&range=...
 * geladen. Die Function nutzt den SUPABASE_SECRET_KEY aus Env Vars
 * (siehe dashboard/netlify/functions/events.js).
 */

(function () {
    var state = {
        channel: 'all',
        range: 28,
        events: [],
        chart: null
    };

    function fetchEvents() {
        var url = '/api/events?channel=' + state.channel + '&range=' + state.range;
        return fetch(url)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (Array.isArray(data)) {
                    state.events = data;
                } else {
                    console.warn('[Dashboard] Unexpected response:', data);
                    state.events = [];
                }
            });
    }

    function formatNumber(n) {
        if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        return n.toString();
    }

    function renderKPIs() {
        var views  = state.events.filter(function (e) { return e.event_type === 'view'; });
        var clicks = state.events.filter(function (e) { return e.event_type === 'click'; });
        var viewCount = views.length;
        var clickCount = clicks.length;
        var ctr = viewCount > 0 ? ((clickCount / viewCount) * 100).toFixed(1) : '0';

        document.getElementById('kpi-views').textContent  = formatNumber(viewCount);
        document.getElementById('kpi-clicks').textContent = formatNumber(clickCount);
        document.getElementById('kpi-ctr').textContent    = ctr + '%';
    }

    function renderChart() {
        var canvas = document.getElementById('activity-chart');
        var ctx = canvas.getContext('2d');

        var dayMap = {};
        state.events.forEach(function (e) {
            var day = e.created_at.substring(0, 10);
            if (!dayMap[day]) dayMap[day] = { views: 0, clicks: 0 };
            if (e.event_type === 'view')  dayMap[day].views++;
            if (e.event_type === 'click') dayMap[day].clicks++;
        });

        var days = Object.keys(dayMap).sort();
        var viewData  = days.map(function (d) { return dayMap[d].views; });
        var clickData = days.map(function (d) { return dayMap[d].clicks; });
        var labels    = days.map(function (d) {
            var parts = d.split('-');
            return parts[2] + '.' + parts[1];
        });

        if (state.chart) state.chart.destroy();

        state.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Views',  data: viewData,  backgroundColor: '#6366f1', borderRadius: 4, barPercentage: 0.7, categoryPercentage: 0.8 },
                    { label: 'Clicks', data: clickData, backgroundColor: '#a5b4fc', borderRadius: 4, barPercentage: 0.7, categoryPercentage: 0.8 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 12, padding: 16, font: { size: 12, family: 'Inter' } }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Inter' }, maxRotation: 0, maxTicksLimit: 15 } },
                    y: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { font: { size: 11, family: 'Inter' }, precision: 0 } }
                }
            }
        });
    }

    function renderTopLinks() {
        var container = document.getElementById('top-links');
        var clicks = state.events.filter(function (e) { return e.event_type === 'click' && e.link_name; });

        var counts = {};
        clicks.forEach(function (e) { counts[e.link_name] = (counts[e.link_name] || 0) + 1; });

        var sorted = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
        var total  = clicks.length;
        var max    = sorted.length > 0 ? counts[sorted[0]] : 1;

        if (sorted.length === 0) {
            container.innerHTML = '<p class="placeholder">No clicks yet</p>';
            return;
        }

        var html = '';
        sorted.forEach(function (name) {
            var count    = counts[name];
            var pct      = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
            var barWidth = ((count / max) * 100).toFixed(0);
            html += '<div class="top-links__item">'
                + '<span class="top-links__name">' + escapeHtml(name) + '</span>'
                + '<div class="top-links__stats">'
                + '<div class="top-links__bar-wrap"><div class="top-links__bar" style="width:' + barWidth + '%"></div></div>'
                + '<span class="top-links__count">' + count + '</span>'
                + '<span class="top-links__pct">' + pct + '%</span>'
                + '</div></div>';
        });
        container.innerHTML = html;
    }

    function renderVisitorSummary() {
        renderStatList('top-countries', 'country', 5);
        renderStatList('top-referrers', 'referrer', 5);
        renderStatList('device-split',  'device',  3);
    }

    function renderStatList(containerId, field, limit) {
        var container = document.getElementById(containerId);
        var counts = {};
        state.events.forEach(function (e) {
            var val = e[field] || 'unknown';
            counts[val] = (counts[val] || 0) + 1;
        });

        var sorted = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
        var total  = state.events.length;

        if (sorted.length === 0) {
            container.innerHTML = '<p class="placeholder">No data yet</p>';
            return;
        }

        var html = '';
        sorted.slice(0, limit).forEach(function (name) {
            var count = counts[name];
            var pct   = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
            var displayName = name;

            if (field === 'country' && name.length === 2 && name !== 'un') {
                displayName = countryFlag(name) + ' ' + name.toUpperCase();
            }

            html += '<div class="stat-list__item">'
                + '<span class="stat-list__label">' + escapeHtml(displayName) + '</span>'
                + '<span class="stat-list__value">' + pct + '%</span>'
                + '</div>';
        });
        container.innerHTML = html;
    }

    function countryFlag(code) {
        var upper = code.toUpperCase();
        var cp1 = 0x1F1E6 + upper.charCodeAt(0) - 65;
        var cp2 = 0x1F1E6 + upper.charCodeAt(1) - 65;
        return String.fromCodePoint(cp1) + String.fromCodePoint(cp2);
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function renderAll() {
        renderKPIs();
        renderChart();
        renderTopLinks();
        renderVisitorSummary();
    }

    document.querySelectorAll('[data-channel]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('[data-channel]').forEach(function (b) { b.classList.remove('filter-btn--active'); });
            btn.classList.add('filter-btn--active');
            state.channel = btn.getAttribute('data-channel');
            fetchEvents().then(renderAll);
        });
    });

    document.querySelectorAll('[data-range]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('[data-range]').forEach(function (b) { b.classList.remove('filter-btn--active'); });
            btn.classList.add('filter-btn--active');
            state.range = parseInt(btn.getAttribute('data-range'), 10);
            fetchEvents().then(renderAll);
        });
    });

    fetchEvents().then(renderAll);
})();
