/* ═══════════════════════════════════════════════════════════════
   CHRONOS ATLAS — Main Script
   Vanilla JavaScript. No dependencies beyond Leaflet.
   Handles: map, timeline, filters, search, popups, density bar.
═══════════════════════════════════════════════════════════════ */

/* ── CONFIGURATION ──────────────────────────────────────────── */
const CONFIG = {
  MIN_YEAR:       -3200,
  MAX_YEAR:       2024,
  DEFAULT_YEAR:   1500,
  YEAR_WINDOW:    80,      // events within ±this years of current year are shown
  MAP_CENTER:     [20, 10],
  MAP_ZOOM:       2.5,
  TILE_URL:       'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
  TILE_LABELS:    'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
  CLUSTER_RADIUS: 2.8,     // degrees — group pins within this distance
};

/* ── CATEGORY COLOURS ───────────────────────────────────────── */
const CATEGORY_COLORS = {
  war:         '#EF4444',
  science:     '#06B6D4',
  disaster:    '#F97316',
  politics:    '#8B5CF6',
  culture:     '#EC4899',
  exploration: '#84CC16',
  religion:    '#F59E0B',
  economy:     '#14B8A6',
  pandemic:    '#10B981',
};

const IMPACT_COLORS = {
  HIGH:   '#EF4444',
  MEDIUM: '#F59E0B',
  LOW:    '#6B7280',
};

/* ── APPLICATION STATE ──────────────────────────────────────── */
const State = {
  currentYear:       CONFIG.DEFAULT_YEAR,
  activeCategories:  new Set(['war','science','disaster','politics','culture','exploration','religion','economy','pandemic']),
  activeRegions:     new Set(['all']),
  activeImpact:      'all',
  searchQuery:       '',
  isDragging:        false,
  map:               null,
  markersLayer:      null,
};

/* ── DOM REFERENCES ─────────────────────────────────────────── */
const Dom = {
  map:               () => document.getElementById('map'),
  headerYear:        () => document.getElementById('header-year-label'),
  headerEra:         () => document.getElementById('header-era-label'),
  sidebar:           () => document.getElementById('sidebar'),
  sidebarToggle:     () => document.getElementById('sidebar-toggle'),
  searchInput:       () => document.getElementById('search-input'),
  searchClear:       () => document.getElementById('search-clear'),
  searchResults:     () => document.getElementById('search-results'),
  modalBackdrop:     () => document.getElementById('event-modal-backdrop'),
  modalClose:        () => document.getElementById('modal-close'),
  modalColorBar:     () => document.getElementById('modal-color-bar'),
  modalYear:         () => document.getElementById('modal-year'),
  modalCategory:     () => document.getElementById('modal-category'),
  modalRegion:       () => document.getElementById('modal-region'),
  modalTitle:        () => document.getElementById('modal-title'),
  modalDescription:  () => document.getElementById('modal-description'),
  modalImpact:       () => document.getElementById('modal-impact'),
  modalTags:         () => document.getElementById('modal-tags'),
  timelineTrack:     () => document.getElementById('timeline-track'),
  timelineFill:      () => document.getElementById('timeline-fill'),
  timelineThumb:     () => document.getElementById('timeline-thumb'),
  timelineTicks:     () => document.getElementById('timeline-ticks'),
  densityCanvas:     () => document.getElementById('density-canvas'),
  eraLabels:         () => document.getElementById('era-labels'),
  statVisible:       () => document.getElementById('stat-visible'),
  statTotal:         () => document.getElementById('stat-total'),
  toast:             () => document.getElementById('toast'),
  resetViewBtn:      () => document.getElementById('reset-view-btn'),
};

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
════════════════════════════════════════════════════════════════ */

function formatYear(year) {
  if (year === 0) return '1 CE';
  if (year < 0)  return Math.abs(year) + ' BCE';
  return year + ' CE';
}

function getEra(year) {
  if (year < -3000) return 'Prehistoric';
  if (year < -800)  return 'Ancient World';
  if (year < 500)   return 'Classical Antiquity';
  if (year < 1000)  return 'Early Middle Ages';
  if (year < 1300)  return 'High Middle Ages';
  if (year < 1500)  return 'Late Middle Ages';
  if (year < 1700)  return 'Early Modern';
  if (year < 1800)  return 'Age of Enlightenment';
  if (year < 1900)  return 'Industrial Age';
  if (year < 1945)  return 'World Wars Era';
  if (year < 1991)  return 'Cold War Era';
  if (year < 2010)  return 'Post-Cold War';
  return 'Contemporary';
}

function yearToPercent(year) {
  const range = CONFIG.MAX_YEAR - CONFIG.MIN_YEAR;
  return ((year - CONFIG.MIN_YEAR) / range) * 100;
}

function percentToYear(pct) {
  const range = CONFIG.MAX_YEAR - CONFIG.MIN_YEAR;
  return Math.round(CONFIG.MIN_YEAR + (pct / 100) * range);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function showToast(message, durationMs = 2200) {
  const el = Dom.toast();
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => el.classList.add('hidden'), durationMs);
}

function highlightText(text, query) {
  if (!query) return text;
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(esc, 'gi'), m => `<mark class="highlight">${m}</mark>`);
}

/* ═══════════════════════════════════════════════════════════════
   MAP INITIALISATION
════════════════════════════════════════════════════════════════ */

function initMap() {
  const map = L.map('map', {
    center:            CONFIG.MAP_CENTER,
    zoom:              CONFIG.MAP_ZOOM,
    minZoom:           2,
    maxZoom:           12,
    zoomControl:       false,
    attributionControl: false,
    worldCopyJump:     true,
  });

  // Dark base tiles — CartoDB, no API key
  L.tileLayer(CONFIG.TILE_URL, {
    attribution: '© OpenStreetMap contributors, © CartoDB',
    subdomains:  'abcd',
    maxZoom:     19,
    opacity:     0.88,
  }).addTo(map);

  // Labels overlay
  L.tileLayer(CONFIG.TILE_LABELS, {
    subdomains: 'abcd',
    maxZoom:    19,
    opacity:    0.45,
    zIndex:     10,
  }).addTo(map);

  // Zoom control — top right
  L.control.zoom({ position: 'topright' }).addTo(map);

  // Attribution — bottom left, minimal
  L.control.attribution({ position: 'bottomleft', prefix: '' })
    .addAttribution('© CartoDB · Chronos Atlas')
    .addTo(map);

  // Markers layer group
  State.markersLayer = L.layerGroup().addTo(map);
  State.map = map;
}

/* ═══════════════════════════════════════════════════════════════
   FILTERING LOGIC
════════════════════════════════════════════════════════════════ */

function getFilteredEvents() {
  return HISTORICAL_EVENTS.filter(ev => {
    // Year window
    const inWindow = Math.abs(ev.year - State.currentYear) <= CONFIG.YEAR_WINDOW;
    if (!inWindow) return false;

    // Category
    if (!State.activeCategories.has(ev.category)) return false;

    // Impact
    if (State.activeImpact !== 'all' && ev.impact !== State.activeImpact) return false;

    // Region
    if (!State.activeRegions.has('all') && !State.activeRegions.has(ev.region)) return false;

    return true;
  });
}

/* ═══════════════════════════════════════════════════════════════
   EVENT MARKER RENDERING
════════════════════════════════════════════════════════════════ */

function buildClusters(events) {
  const radius = CONFIG.CLUSTER_RADIUS;
  const assigned = new Set();
  const clusters = [];

  for (let i = 0; i < events.length; i++) {
    if (assigned.has(i)) continue;
    const ev = events[i];
    if (!ev.lat || !ev.lng) { assigned.add(i); continue; }

    const group = [ev];
    assigned.add(i);

    for (let j = i + 1; j < events.length; j++) {
      if (assigned.has(j)) continue;
      const other = events[j];
      if (!other.lat || !other.lng) continue;
      const dist = Math.hypot(ev.lat - other.lat, ev.lng - other.lng);
      if (dist < radius) {
        group.push(other);
        assigned.add(j);
      }
    }

    clusters.push({
      lat:    ev.lat,
      lng:    ev.lng,
      events: group,
    });
  }

  return clusters;
}

function getDotSize(impact) {
  if (impact === 'HIGH')   return 14;
  if (impact === 'MEDIUM') return 10;
  return 7;
}

function renderMarkers() {
  State.markersLayer.clearLayers();
  const events = getFilteredEvents();

  if (events.length === 0) {
    updateStats(0);
    return;
  }

  const zoom = State.map.getZoom();
  // Use larger cluster radius at low zoom
  const clusterR = zoom < 4 ? CONFIG.CLUSTER_RADIUS * 2 : CONFIG.CLUSTER_RADIUS;

  // Temporarily override config for this render
  const savedR = CONFIG.CLUSTER_RADIUS;
  CONFIG.CLUSTER_RADIUS = clusterR;
  const clusters = buildClusters(events);
  CONFIG.CLUSTER_RADIUS = savedR;

  clusters.forEach(cluster => {
    if (cluster.events.length === 1) {
      addSingleMarker(cluster.events[0]);
    } else {
      addClusterMarker(cluster);
    }
  });

  updateStats(events.length);
  updateCategoryCounts();
}

function addSingleMarker(ev) {
  const color = CATEGORY_COLORS[ev.category] || '#94A3B8';
  const size  = getDotSize(ev.impact);

  const icon = L.divIcon({
    html: `
      <div class="event-marker-container" style="width:${size+8}px;height:${size+8}px">
        <div class="event-dot ${ev.impact === 'HIGH' ? 'high-impact' : ''}"
          style="width:${size}px;height:${size}px;background:${color};color:${color}">
        </div>
      </div>`,
    className:  '',
    iconSize:   [size + 8, size + 8],
    iconAnchor: [(size + 8) / 2, (size + 8) / 2],
  });

  const marker = L.marker([ev.lat, ev.lng], { icon })
    .addTo(State.markersLayer);

  marker.on('click', () => openEventModal(ev));
  marker.on('mouseover', () => {
    marker.getElement()?.querySelector('.event-dot')?.style.setProperty('transform', 'scale(1.4)');
  });
  marker.on('mouseout', () => {
    marker.getElement()?.querySelector('.event-dot')?.style.setProperty('transform', 'scale(1)');
  });
}

function addClusterMarker(cluster) {
  const count  = cluster.events.length;
  // Colour by most common category in cluster
  const catFreq = {};
  cluster.events.forEach(e => { catFreq[e.category] = (catFreq[e.category] || 0) + 1; });
  const dominantCat = Object.entries(catFreq).sort((a,b) => b[1]-a[1])[0][0];
  const color = CATEGORY_COLORS[dominantCat] || '#94A3B8';
  const sz = count > 20 ? 38 : count > 8 ? 30 : 24;

  const icon = L.divIcon({
    html: `<div class="cluster-marker" style="width:${sz}px;height:${sz}px;background:${color};font-size:${sz < 30 ? 10 : 12}px">${count}</div>`,
    className:  '',
    iconSize:   [sz, sz],
    iconAnchor: [sz/2, sz/2],
  });

  const marker = L.marker([cluster.lat, cluster.lng], { icon })
    .addTo(State.markersLayer);

  marker.on('click', () => {
    const curZoom = State.map.getZoom();
    State.map.flyTo([cluster.lat, cluster.lng], Math.min(curZoom + 2, 8), {
      animate: true, duration: 0.6,
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   EVENT MODAL
════════════════════════════════════════════════════════════════ */

function openEventModal(ev) {
  const color = CATEGORY_COLORS[ev.category] || '#94A3B8';
  const iColor = IMPACT_COLORS[ev.impact] || '#6B7280';

  Dom.modalColorBar().style.background = color;
  Dom.modalYear().textContent = formatYear(ev.year);
  Dom.modalYear().style.color = color;

  Dom.modalCategory().textContent = ev.category.charAt(0).toUpperCase() + ev.category.slice(1);
  Dom.modalCategory().style.background = color + '22';
  Dom.modalCategory().style.color = color;

  Dom.modalRegion().textContent = ev.region || '';
  Dom.modalTitle().textContent = ev.title;
  Dom.modalDescription().textContent = ev.description;

  Dom.modalImpact().innerHTML = `
    <span style="width:8px;height:8px;border-radius:50%;background:${iColor};display:inline-block;margin-right:5px"></span>
    ${ev.impact} IMPACT`;
  Dom.modalImpact().style.color  = iColor;
  Dom.modalImpact().style.border = `1px solid ${iColor}`;

  if (ev.tags && ev.tags.length) {
    Dom.modalTags().innerHTML = ev.tags.map(t =>
      `<span class="modal-tag">#${t}</span>`
    ).join('');
  } else {
    Dom.modalTags().innerHTML = '';
  }

  Dom.modalBackdrop().classList.remove('hidden');

  // Pan map to event
  State.map.flyTo([ev.lat, ev.lng], Math.max(State.map.getZoom(), 5), {
    animate: true, duration: 0.8,
  });
}

function closeEventModal() {
  Dom.modalBackdrop().classList.add('hidden');
}

/* ═══════════════════════════════════════════════════════════════
   TIMELINE ENGINE
════════════════════════════════════════════════════════════════ */

function setYear(year) {
  year = clamp(Math.round(year), CONFIG.MIN_YEAR, CONFIG.MAX_YEAR);
  State.currentYear = year;

  // Update header
  Dom.headerYear().textContent = formatYear(year);
  Dom.headerEra().textContent  = getEra(year);

  // Update track visuals
  const pct = yearToPercent(year);
  Dom.timelineFill().style.width = pct + '%';
  Dom.timelineThumb().style.left = pct + '%';

  // Update era jump button highlights
  document.querySelectorAll('.era-jump-btn').forEach(btn => {
    const btnYear = parseInt(btn.dataset.year, 10);
    btn.classList.toggle('active', Math.abs(btnYear - year) < 30);
  });

  // Re-render map markers
  renderMarkers();

  // Draw density bar highlight
  drawDensityBar();
}

function initTimeline() {
  buildTicks();
  buildEraLabels();
  drawDensityBar();
  setYear(State.currentYear);

  const track = Dom.timelineTrack();
  const thumb = Dom.timelineThumb();

  // Click on track
  track.addEventListener('click', e => {
    if (State.isDragging) return;
    const rect  = track.getBoundingClientRect();
    const pct   = clamp((e.clientX - rect.left) / rect.width * 100, 0, 100);
    setYear(percentToYear(pct));
  });

  // Drag thumb
  thumb.addEventListener('pointerdown', e => {
    e.preventDefault();
    State.isDragging = true;
    thumb.setPointerCapture(e.pointerId);
  });

  thumb.addEventListener('pointermove', e => {
    if (!State.isDragging) return;
    const rect = track.getBoundingClientRect();
    const pct  = clamp((e.clientX - rect.left) / rect.width * 100, 0, 100);
    setYear(percentToYear(pct));
  });

  thumb.addEventListener('pointerup', () => { State.isDragging = false; });
  thumb.addEventListener('pointercancel', () => { State.isDragging = false; });

  // Wheel on timeline
  document.getElementById('timeline-container').addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 10 : -10;
    setYear(State.currentYear + delta);
  }, { passive: false });

  // Step buttons
  document.getElementById('tl-back').addEventListener('click', () => setYear(State.currentYear - 10));
  document.getElementById('tl-forward').addEventListener('click', () => setYear(State.currentYear + 10));

  // Era jump buttons
  document.querySelectorAll('.era-jump-btn').forEach(btn => {
    btn.addEventListener('click', () => setYear(parseInt(btn.dataset.year, 10)));
  });

  // Keyboard navigation
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp')   setYear(State.currentYear + 10);
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowDown')  setYear(State.currentYear - 10);
    if (e.key === 'PageUp')    setYear(State.currentYear + 100);
    if (e.key === 'PageDown')  setYear(State.currentYear - 100);
  });
}

function buildTicks() {
  const container = Dom.timelineTicks();
  container.innerHTML = '';

  const marks = [
    -3000,-2500,-2000,-1500,-1000,-500,
    0, 500, 1000, 1200, 1400, 1500,
    1600, 1700, 1750, 1800, 1850,
    1900, 1920, 1940, 1950, 1960,
    1970, 1980, 1990, 2000, 2010, 2020, 2024
  ];

  marks.forEach(year => {
    const pct = yearToPercent(year);
    const isMajor = year % 500 === 0 || year === 0;
    const tick = document.createElement('div');
    tick.className = `tick-item ${isMajor ? 'major' : 'minor'}`;
    tick.style.left = pct + '%';
    tick.innerHTML = `
      <div class="tick-line"></div>
      ${isMajor ? `<span class="tick-label">${formatYear(year)}</span>` : ''}
    `;
    tick.addEventListener('click', () => setYear(year));
    container.appendChild(tick);
  });
}

function buildEraLabels() {
  const container = Dom.eraLabels();
  container.innerHTML = '';
  const eras = [
    { year: -2800, label: 'Ancient' },
    { year: -500,  label: 'Classical' },
    { year: 700,   label: 'Medieval' },
    { year: 1600,  label: 'Early Modern' },
    { year: 1870,  label: 'Industrial' },
    { year: 1950,  label: 'Modern' },
  ];
  eras.forEach(({ year, label }) => {
    const pct = yearToPercent(year);
    const el = document.createElement('div');
    el.className = 'era-label-item';
    el.style.left = pct + '%';
    el.textContent = label;
    container.appendChild(el);
  });
}

/* ── DENSITY BAR ─────────────────────────────────────────────── */
function drawDensityBar() {
  const canvas = Dom.densityCanvas();
  const ctx    = canvas.getContext('2d');
  const W      = canvas.parentElement.offsetWidth - 32; // minus padding
  const H      = 36;
  canvas.width  = W;
  canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  const range   = CONFIG.MAX_YEAR - CONFIG.MIN_YEAR;
  const bucketW = 40; // pixels per bucket
  const numBuckets = Math.floor(W / bucketW) + 1;
  const yearsPerBucket = range / numBuckets;

  // Count events per bucket
  const counts = new Array(numBuckets).fill(0);
  HISTORICAL_EVENTS.forEach(ev => {
    const b = Math.floor((ev.year - CONFIG.MIN_YEAR) / yearsPerBucket);
    if (b >= 0 && b < numBuckets) counts[b]++;
  });

  const maxCount = Math.max(...counts, 1);

  // Draw bars
  for (let i = 0; i < numBuckets; i++) {
    const x    = (i / numBuckets) * W;
    const barH = (counts[i] / maxCount) * (H - 4);
    const bucketYear = CONFIG.MIN_YEAR + i * yearsPerBucket;
    const nearCurrent = Math.abs(bucketYear - State.currentYear) < yearsPerBucket * 1.5;

    ctx.fillStyle = nearCurrent
      ? 'rgba(245, 158, 11, 0.7)'
      : 'rgba(245, 158, 11, 0.22)';
    ctx.fillRect(x, H - barH, (W / numBuckets) - 1, barH);
  }

  // Current year line
  const lineX = ((State.currentYear - CONFIG.MIN_YEAR) / range) * W;
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.9)';
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(lineX, 0);
  ctx.lineTo(lineX, H);
  ctx.stroke();
  ctx.setLineDash([]);
}

/* ═══════════════════════════════════════════════════════════════
   FILTER CONTROLS
════════════════════════════════════════════════════════════════ */

function initFilters() {
  // ── Category buttons ────────────────────────────────────────
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category;

      if (cat === 'all') {
        // Toggle all
        const allActive = State.activeCategories.size === Object.keys(CATEGORY_COLORS).length;
        if (allActive) {
          State.activeCategories.clear();
          document.querySelectorAll('.cat-btn:not([data-category="all"])').forEach(b => b.classList.remove('active'));
        } else {
          Object.keys(CATEGORY_COLORS).forEach(c => State.activeCategories.add(c));
          document.querySelectorAll('.cat-btn:not([data-category="all"])').forEach(b => b.classList.add('active'));
        }
        btn.classList.toggle('active', !allActive);
      } else {
        if (State.activeCategories.has(cat)) {
          State.activeCategories.delete(cat);
          btn.classList.remove('active');
        } else {
          State.activeCategories.add(cat);
          btn.classList.add('active');
        }
        // Sync "all" button
        const allActive = State.activeCategories.size === Object.keys(CATEGORY_COLORS).length;
        document.querySelector('.cat-btn[data-category="all"]').classList.toggle('active', allActive);
      }

      renderMarkers();
    });
  });

  // ── Region buttons ───────────────────────────────────────────
  document.querySelectorAll('.region-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const region = btn.dataset.region;
      if (region === 'all') {
        State.activeRegions.clear();
        State.activeRegions.add('all');
        document.querySelectorAll('.region-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.region === 'all');
        });
      } else {
        State.activeRegions.delete('all');
        if (State.activeRegions.has(region)) {
          State.activeRegions.delete(region);
          btn.classList.remove('active');
          if (State.activeRegions.size === 0) {
            State.activeRegions.add('all');
            document.querySelector('.region-btn[data-region="all"]').classList.add('active');
          }
        } else {
          State.activeRegions.add(region);
          btn.classList.add('active');
          document.querySelector('.region-btn[data-region="all"]').classList.remove('active');
        }
      }
      renderMarkers();
    });
  });

  // ── Impact buttons ───────────────────────────────────────────
  document.querySelectorAll('.impact-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      State.activeImpact = btn.dataset.impact;
      document.querySelectorAll('.impact-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMarkers();
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   SEARCH
════════════════════════════════════════════════════════════════ */

function initSearch() {
  const input   = Dom.searchInput();
  const clearBtn = Dom.searchClear();
  const resultsEl = Dom.searchResults();
  let searchTimer = null;

  input.addEventListener('input', () => {
    const q = input.value.trim();
    State.searchQuery = q;
    clearBtn.style.display = q ? 'flex' : 'none';
    clearTimeout(searchTimer);
    if (q.length < 2) {
      closeSearchDropdown();
      return;
    }
    searchTimer = setTimeout(() => performSearch(q), 180);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      clearSearch();
      return;
    }
    const items = resultsEl.querySelectorAll('.search-result-item');
    const highlighted = resultsEl.querySelector('.search-result-item.highlighted');
    let idx = -1;
    items.forEach((item, i) => { if (item === highlighted) idx = i; });

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = items[Math.min(idx + 1, items.length - 1)];
      if (next) { highlighted?.classList.remove('highlighted'); next.classList.add('highlighted'); next.scrollIntoView({ block: 'nearest' }); }
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = items[Math.max(idx - 1, 0)];
      if (prev) { highlighted?.classList.remove('highlighted'); prev.classList.add('highlighted'); prev.scrollIntoView({ block: 'nearest' }); }
    }
    if (e.key === 'Enter' && highlighted) {
      highlighted.click();
    }
  });

  clearBtn.addEventListener('click', clearSearch);

  // Click outside
  document.addEventListener('click', e => {
    if (!e.target.closest('.header-right')) closeSearchDropdown();
  });
}

function performSearch(query) {
  const q = query.toLowerCase();
  const results = HISTORICAL_EVENTS
    .filter(ev =>
      ev.title.toLowerCase().includes(q) ||
      ev.description.toLowerCase().includes(q) ||
      (ev.region && ev.region.toLowerCase().includes(q)) ||
      (ev.tags && ev.tags.some(t => t.includes(q)))
    )
    .sort((a, b) => {
      const aT = a.title.toLowerCase().includes(q) ? 0 : 1;
      const bT = b.title.toLowerCase().includes(q) ? 0 : 1;
      if (aT !== bT) return aT - bT;
      const imp = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return (imp[a.impact] || 2) - (imp[b.impact] || 2);
    })
    .slice(0, 18);

  renderSearchResults(results, query);
}

function renderSearchResults(results, query) {
  const el = Dom.searchResults();

  if (results.length === 0) {
    el.innerHTML = `<div class="search-no-results">No events found for "<strong>${query}</strong>"</div>`;
    el.classList.add('visible');
    return;
  }

  el.innerHTML = results.map(ev => {
    const color  = CATEGORY_COLORS[ev.category] || '#94A3B8';
    const hlTitle = highlightText(ev.title, query);
    return `
      <button class="search-result-item" data-id="${ev.id}">
        <div class="sri-bar" style="background:${color}"></div>
        <div class="sri-content">
          <div class="sri-top">
            <span class="sri-year" style="color:${color}">${formatYear(ev.year)}</span>
            <span class="sri-cat-badge" style="background:${color}22;color:${color}">${ev.category}</span>
          </div>
          <div class="sri-title">${hlTitle}</div>
          <div class="sri-region">📍 ${ev.region}</div>
        </div>
      </button>`;
  }).join('');

  el.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.dataset.id, 10);
      const ev = HISTORICAL_EVENTS.find(e => e.id === id);
      if (!ev) return;
      clearSearch();
      setYear(ev.year);
      setTimeout(() => openEventModal(ev), 300);
    });
  });

  el.classList.add('visible');
}

function closeSearchDropdown() {
  Dom.searchResults().classList.remove('visible');
}

function clearSearch() {
  Dom.searchInput().value = '';
  Dom.searchClear().style.display = 'none';
  State.searchQuery = '';
  closeSearchDropdown();
}

/* ═══════════════════════════════════════════════════════════════
   STATS & COUNTS
════════════════════════════════════════════════════════════════ */

function updateStats(visibleCount) {
  Dom.statVisible().textContent = visibleCount;
  Dom.statTotal().textContent   = HISTORICAL_EVENTS.length;
}

function updateCategoryCounts() {
  const window = CONFIG.YEAR_WINDOW;
  const inWindow = HISTORICAL_EVENTS.filter(ev =>
    Math.abs(ev.year - State.currentYear) <= window
  );
  const counts = {};
  inWindow.forEach(ev => { counts[ev.category] = (counts[ev.category] || 0) + 1; });

  let total = 0;
  Object.entries(counts).forEach(([cat, n]) => {
    const el = document.getElementById('count-' + cat);
    if (el) el.textContent = n;
    total += n;
  });
  const allEl = document.getElementById('count-all');
  if (allEl) allEl.textContent = total;
}

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR TOGGLE
════════════════════════════════════════════════════════════════ */

function initSidebar() {
  const btn     = Dom.sidebarToggle();
  const sidebar = Dom.sidebar();
  let open = true;

  btn.addEventListener('click', () => {
    open = !open;
    sidebar.classList.toggle('collapsed', !open);
    btn.classList.toggle('active', open);
  });
}

/* ═══════════════════════════════════════════════════════════════
   MODAL CLOSE
════════════════════════════════════════════════════════════════ */

function initModal() {
  Dom.modalClose().addEventListener('click', closeEventModal);
  Dom.modalBackdrop().addEventListener('click', e => {
    if (e.target === Dom.modalBackdrop()) closeEventModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeEventModal();
  });
}

/* ═══════════════════════════════════════════════════════════════
   RESET VIEW
════════════════════════════════════════════════════════════════ */

function initResetView() {
  Dom.resetViewBtn().addEventListener('click', () => {
    State.map.flyTo(CONFIG.MAP_CENTER, CONFIG.MAP_ZOOM, { animate: true, duration: 0.8 });
  });
}

/* ═══════════════════════════════════════════════════════════════
   RE-RENDER ON MAP ZOOM
════════════════════════════════════════════════════════════════ */

function initMapListeners() {
  State.map.on('zoomend', () => renderMarkers());
  State.map.on('moveend', () => {
    // Re-draw density bar if canvas was resized
    drawDensityBar();
  });
}

/* ═══════════════════════════════════════════════════════════════
   WINDOW RESIZE
════════════════════════════════════════════════════════════════ */

function initResize() {
  window.addEventListener('resize', () => {
    buildTicks();
    drawDensityBar();
    // Update thumb position
    const pct = yearToPercent(State.currentYear);
    Dom.timelineFill().style.width = pct + '%';
    Dom.timelineThumb().style.left = pct + '%';
  });
}

/* ═══════════════════════════════════════════════════════════════
   BOOTSTRAP
════════════════════════════════════════════════════════════════ */

function init() {
  // 1. Map
  initMap();

  // 2. Sidebar toggle
  initSidebar();

  // 3. Timeline
  initTimeline();

  // 4. Filters
  initFilters();

  // 5. Search
  initSearch();

  // 6. Modal
  initModal();

  // 7. Reset view
  initResetView();

  // 8. Map listeners
  initMapListeners();

  // 9. Resize handler
  initResize();

  // 10. Set initial year and render
  setYear(CONFIG.DEFAULT_YEAR);

  // 11. Show welcome toast
  showToast(`${HISTORICAL_EVENTS.length} events loaded · Drag the timeline to explore history`, 3500);

  console.log(`Chronos Atlas loaded. ${HISTORICAL_EVENTS.length} historical events ready.`);
}

// Run after DOM is ready
document.addEventListener('DOMContentLoaded', init);
