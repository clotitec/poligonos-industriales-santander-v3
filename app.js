// ============================================================
// POLÍGONOS INDUSTRIALES DE SANTANDER - APLICACIÓN V2
// Candina + El Campón | Fichas enriquecidas
// ============================================================

// ---- CONFIGURACIÓN ----
const GOOGLE_MAPS_EMBED_API_KEY = 'TU_API_KEY_AQUI'; // Google Maps Embed API (gratis, sin coste)

// ---- ANALYTICS ----
const Analytics = {
    sessionId: null,
    init() {
        this.sessionId = crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
        this.track('session_start', { referrer: document.referrer, lang: currentLang, device: innerWidth < 768 ? 'mobile' : innerWidth < 1024 ? 'tablet' : 'desktop' });
        addEventListener('beforeunload', () => this.track('session_end', { duration: Math.round((Date.now() - this._start) / 1000) }));
        this._start = Date.now();
    },
    track(event, params = {}) {
        const payload = { event, session: this.sessionId, ts: new Date().toISOString(), ...params };
        // Store locally for dashboard
        try {
            const log = JSON.parse(localStorage.getItem('analytics_log') || '[]');
            log.push(payload);
            if (log.length > 5000) log.splice(0, log.length - 5000);
            localStorage.setItem('analytics_log', JSON.stringify(log));
        } catch(e) {}
        // When a real analytics service is configured, send here:
        // if (window.plausible) plausible(event, { props: params });
    }
};

// ---- ESTADO GLOBAL ----
let map, miniMap;
let activeAreaFilter = 'all';
let activeSectorFilter = 'all';
let searchTerm = '';
let selectedCompany = null;
let isSatellite = false;
let audioPlaying = false;
let currentLang = 'es';

// ---- SISTEMA i18n ----
const TRANSLATIONS = {
    es: {
        title: 'Polígonos Industriales',
        subtitle: 'Santander',
        loading: 'Cargando directorio empresarial...',
        companies: 'empresas',
        polygons: 'polígonos',
        searchPlaceholder: 'Buscar empresa, sector, actividad...',
        searchMobile: 'Buscar empresa...',
        zone: 'Zona',
        allZones: 'Todas',
        sector: 'Sector',
        allSectors: 'Todos',
        noResults: 'No se encontraron empresas',
        tryOtherFilters: 'Prueba con otros filtros',
        noSector: 'Sin sector',
        unclassified: 'Sin clasificar',
        keyPoints: 'Puntos clave',
        transport: 'Transporte',
        freePlots: 'Parcelas libres',
        accesses: 'Accesos',
        description: 'Descripción',
        streetView: 'Vista de la zona',
        location: 'Ubicación',
        contactInfo: 'Información de contacto',
        publicTransport: 'Transporte público',
        poiDistances: 'Distancias a puntos clave',
        economicActivity: 'Actividad económica',
        directions: 'Cómo llegar',
        share: 'Compartir',
        call: 'Llamar',
        email: 'Email',
        address: 'Dirección',
        phone: 'Teléfono',
        web: 'Web',
        activity: 'Actividad',
        listenSpot: 'Escuchar spot de empresa',
        audioSeconds: '~30 segundos',
        audioNotAvailable: 'Audio del spot no disponible aún',
        audioError: 'No se pudo reproducir el audio',
        linkCopied: 'Enlace copiado al portapapeles',
        locationError: 'No se pudo obtener la ubicación',
        inSantander: 'en Santander',
        heavyVehicles: 'Vehículos pesados',
        lightVehicles: 'Vehículos ligeros',
        allVehicles: 'Todos los vehículos',
        entrance: 'entrada',
        exit: 'salida',
        entranceExit: 'entrada / salida',
        operator: 'Operador',
        lines: 'Líneas',
        frequency: 'Frecuencia',
        schedule: 'Horario',
        nearestStop: 'Parada más cercana',
        busStop: 'Parada de bus',
        wind: 'Viento',
        humidity: 'Humedad',
        satellite: 'Vista satélite',
        myLocation: 'Mi ubicación',
        overview: 'Vista general',
        freePlotLabel: 'PARCELA DISPONIBLE',
        surface: 'Superficie',
        plot: 'Parcela',
        available: '✅ Disponible',
        dayNames: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
        uv: 'UV',
        weatherIn: 'en Santander',
        shareTitle: 'Polígonos Industriales Santander',
        busStopFallback: 'Parada de bus',
        panorama360: 'Vista panorámica 360°',
        panoramaDistance: 'Panorama más cercano a {dist} de la empresa',
        panoramaLayer: 'Panoramas 360°'
    },
    en: {
        title: 'Industrial Estates',
        subtitle: 'Santander',
        loading: 'Loading business directory...',
        companies: 'companies',
        polygons: 'estates',
        searchPlaceholder: 'Search company, sector, activity...',
        searchMobile: 'Search company...',
        zone: 'Zone',
        allZones: 'All',
        sector: 'Sector',
        allSectors: 'All',
        noResults: 'No companies found',
        tryOtherFilters: 'Try different filters',
        noSector: 'No sector',
        unclassified: 'Unclassified',
        keyPoints: 'Key points',
        transport: 'Transport',
        freePlots: 'Free plots',
        accesses: 'Access points',
        description: 'Description',
        streetView: 'Area view',
        location: 'Location',
        contactInfo: 'Contact information',
        publicTransport: 'Public transport',
        poiDistances: 'Distances to key points',
        economicActivity: 'Economic activity',
        directions: 'Directions',
        share: 'Share',
        call: 'Call',
        email: 'Email',
        address: 'Address',
        phone: 'Phone',
        web: 'Website',
        activity: 'Activity',
        listenSpot: 'Listen to company spot',
        audioSeconds: '~30 seconds',
        audioNotAvailable: 'Audio spot not available yet',
        audioError: 'Could not play audio',
        linkCopied: 'Link copied to clipboard',
        locationError: 'Could not get location',
        inSantander: 'in Santander',
        heavyVehicles: 'Heavy vehicles',
        lightVehicles: 'Light vehicles',
        allVehicles: 'All vehicles',
        entrance: 'entrance',
        exit: 'exit',
        entranceExit: 'entrance / exit',
        operator: 'Operator',
        lines: 'Lines',
        frequency: 'Frequency',
        schedule: 'Timetable',
        nearestStop: 'Nearest stop',
        busStop: 'Bus stop',
        wind: 'Wind',
        humidity: 'Humidity',
        satellite: 'Satellite view',
        myLocation: 'My location',
        overview: 'Overview',
        freePlotLabel: 'AVAILABLE PLOT',
        surface: 'Surface',
        plot: 'Plot',
        available: '✅ Available',
        dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        uv: 'UV',
        weatherIn: 'in Santander',
        shareTitle: 'Industrial Estates Santander',
        busStopFallback: 'Bus stop',
        panorama360: '360° Panoramic View',
        panoramaDistance: 'Nearest panorama {dist} from company',
        panoramaLayer: '360° Panoramas'
    }
};

function t(key) {
    return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || TRANSLATIONS.es[key] || key;
}

function toggleLanguage() {
    currentLang = currentLang === 'es' ? 'en' : 'es';
    document.getElementById('langLabel').textContent = currentLang === 'es' ? 'EN' : 'ES';
    document.documentElement.lang = currentLang;

    // Update flag image
    const flagImg = document.getElementById('langFlag');
    if (flagImg) {
        if (currentLang === 'es') {
            // Show UK flag (switch TO English)
            flagImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 30'%3E%3CclipPath id='a'%3E%3Crect width='60' height='30'/%3E%3C/clipPath%3E%3Cg clip-path='url(%23a)'%3E%3Cpath d='M0 0v30h60V0z' fill='%23012169'/%3E%3Cpath d='M0 0l60 30m0-30L0 30' stroke='%23fff' stroke-width='6'/%3E%3Cpath d='M0 0l60 30m0-30L0 30' stroke='%23C8102E' stroke-width='4' clip-path='url(%23a)'/%3E%3Cpath d='M30 0v30M0 15h60' stroke='%23fff' stroke-width='10'/%3E%3Cpath d='M30 0v30M0 15h60' stroke='%23C8102E' stroke-width='6'/%3E%3C/g%3E%3C/svg%3E";
            flagImg.alt = 'EN';
        } else {
            // Show Spain flag (switch TO Spanish)
            flagImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 750 500'%3E%3Crect width='750' height='500' fill='%23c60b1e'/%3E%3Crect width='750' height='250' y='125' fill='%23ffc400'/%3E%3C/svg%3E";
            flagImg.alt = 'ES';
        }
    }

    applyTranslations();
}

function applyTranslations() {
    // Sidebar titles
    const st = document.getElementById('sidebarTitle');
    if (st) st.textContent = t('title');
    const ssub = document.getElementById('sidebarSubtitle');
    if (ssub) ssub.textContent = t('subtitle');

    // Stats
    const total = empresas.length;
    const statsEl = document.getElementById('statsTotal');
    if (statsEl) statsEl.textContent = `${total} ${t('companies')}`;

    // Mobile
    const mobileH2 = document.querySelector('#bottomSheet .sheet-header h2');
    if (mobileH2) mobileH2.textContent = t('title');
    const mobileStats = document.getElementById('mobileStats');
    if (mobileStats) mobileStats.textContent = `${total} ${t('companies')} ${t('inSantander')}`;

    // Search
    document.querySelectorAll('#searchDesktop').forEach(el => el.placeholder = t('searchPlaceholder'));
    document.querySelectorAll('#searchMobile').forEach(el => el.placeholder = t('searchMobile'));

    // Floating pills with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });

    // Loader text
    const loaderText = document.getElementById('loaderText');
    if (loaderText) loaderText.textContent = t('loading');

    // Stats polygons badge
    const statsPoly = document.getElementById('statsPolygons');
    if (statsPoly) statsPoly.textContent = `4 ${t('polygons')}`;

    // Map control tooltips
    document.querySelectorAll('[data-title-' + currentLang + ']').forEach(el => {
        el.title = el.getAttribute('data-title-' + currentLang);
    });

    // POI panel titles
    document.querySelectorAll('.poi-panel-title').forEach(el => {
        el.textContent = '📍 ' + t('poiDistances');
    });

    // Re-render POI distances panel
    renderPOIDistancesPanel();

    // Re-render lists and filters
    renderFilters();
    renderList();

    // Re-render POI markers if visible
    if (poisVisible) {
        removePOIMarkers();
        addPOIMarkers();
        poiMarkers.forEach(m => m.addTo(map));
    }

    // Re-render transport markers if visible
    if (transportMarkersCustom.length > 0) {
        const wasVisible = transportMarkersCustom[0]._map != null;
        transportMarkersCustom.forEach(m => m.remove());
        transportMarkersCustom = [];
        addCustomTransportStops();
        if (wasVisible) transportMarkersCustom.forEach(m => m.addTo(map));
    }

    // Re-render access markers if visible
    if (accessMarkers.length > 0) {
        const wasVisible = accessMarkers[0]._map != null;
        accessMarkers.forEach(m => m.remove());
        accessMarkers = [];
        addAccessPointMarkers();
        if (wasVisible) accessMarkers.forEach(m => m.addTo(map));
    }

    // Update weather if loaded
    if (weatherData) renderWeatherWidget();

    // Update parcelas label format
    if (map && map.getLayer('parcelas-label')) {
        map.setLayoutProperty('parcelas-label', 'text-field',
            ['concat', ['get', 'nombre'], '\n', ['to-string', ['get', 'superficie']], ' m²']
        );
    }
}

// ---- NUEVAS FEATURES: Estado global ----
let busStopsData = null;
let busStopsVisible = false;
let poisVisible = false;
let poiMarkers = [];
let weatherData = null;
let weatherVisible = true;
let weatherRefreshTimer = null;

// ---- FEATURES V3: Estado global ----
let parcelasVisible = false;
let accessPointsVisible = false;
let accessMarkers = [];
let transportMarkersCustom = [];
let weatherOverlayExpanded = false;

const SNAP = {
    COLLAPSED: 140,
    HALF: window.innerHeight * 0.45,
    FULL: window.innerHeight - 60
};
let currentSnap = SNAP.COLLAPSED;

const lightStyle = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

// ---- DEEP LINKING ----
function applyDeepLink() {
    const hash = location.hash.slice(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    if (params.get('empresa')) {
        const id = parseInt(params.get('empresa'));
        setTimeout(() => openDetailById(id), 500);
    }
    if (params.get('area')) setAreaFilter(params.get('area'));
    if (params.get('sector')) setSectorFilter(params.get('sector'));
    if (params.get('q')) {
        searchTerm = params.get('q');
        const di = document.getElementById('searchDesktop');
        const mi = document.getElementById('searchMobile');
        if (di) di.value = searchTerm;
        if (mi) mi.value = searchTerm;
        renderList(); loadCompanyMarkers(); updateStats();
    }
}

function updateHash() {
    const parts = [];
    if (activeAreaFilter !== 'all') parts.push(`area=${activeAreaFilter}`);
    if (activeSectorFilter !== 'all') parts.push(`sector=${encodeURIComponent(activeSectorFilter)}`);
    if (searchTerm) parts.push(`q=${encodeURIComponent(searchTerm)}`);
    history.replaceState(null, '', parts.length ? '#' + parts.join('&') : location.pathname);
}

// ---- EMPRESAS RECIENTES ----
function addToRecent(companyId) {
    let recent = JSON.parse(localStorage.getItem('recent_companies') || '[]');
    recent = recent.filter(id => id !== companyId);
    recent.unshift(companyId);
    if (recent.length > 8) recent.length = 8;
    localStorage.setItem('recent_companies', JSON.stringify(recent));
}

function getRecentCompanies() {
    const ids = JSON.parse(localStorage.getItem('recent_companies') || '[]');
    return ids.map(id => empresas.find(c => c.id === id)).filter(Boolean);
}

function renderRecentBar() {
    const recent = getRecentCompanies();
    if (recent.length === 0) return;
    const html = `
        <div class="recent-bar">
            <span class="recent-label">${currentLang === 'es' ? 'Recientes' : 'Recent'}</span>
            ${recent.map(c => `
                <button class="recent-chip" onclick="openDetailById(${c.id})" title="${escapeHTML(c.nombre)}">
                    ${escapeHTML(c.nombre.length > 18 ? c.nombre.slice(0, 18) + '...' : c.nombre)}
                </button>
            `).join('')}
        </div>`;
    // Insert before company list
    const desktopList = document.getElementById('listDesktop');
    const mobileList = document.getElementById('listMobile');
    const existingRecent = document.querySelectorAll('.recent-bar');
    existingRecent.forEach(el => el.remove());
    if (desktopList) desktopList.insertAdjacentHTML('beforebegin', html);
    if (mobileList) mobileList.insertAdjacentHTML('beforebegin', html);
}

// ---- INICIALIZACIÓN ----
window.addEventListener('load', async () => {
    await initMap();
    addPolygonLayers();
    renderFilters();
    renderList();
    setupBottomSheet();
    setupSearch();
    updateStats();

    // Features: POIs, Bus Stops, Meteorología
    addPOIMarkers();
    renderPOIDistancesPanel();
    fetchBusStops();
    startWeatherRefresh();

    // Features V3: Parcelas, Transporte custom, Accesos
    addParcelasLayer();
    addCustomTransportStops();
    addAccessPointMarkers();

    // Analytics, deep linking & recent companies
    Analytics.init();
    applyDeepLink();
    renderRecentBar();

    setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
    }, 600);
});

// ---- MAPA ----
async function initMap() {
    map = new maplibregl.Map({
        container: 'map',
        style: lightStyle,
        center: CONFIG.center,
        zoom: CONFIG.zoom,
        minZoom: CONFIG.minZoom,
        maxZoom: CONFIG.maxZoom,
        attributionControl: false
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    await new Promise(resolve => map.on('load', resolve));
    loadCompanyMarkers();
    loadPanoramaLayer();
}

// ---- POLÍGONOS ----
function addPolygonLayers() {
    poligonos.forEach(poly => {
        const sourceId = `polygon-${poly.id}`;

        map.addSource(sourceId, {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: { name: poly.nombre, areaId: poly.areaId },
                geometry: { type: 'Polygon', coordinates: [poly.coordinates] }
            }
        });

        map.addLayer({
            id: `${sourceId}-fill`, type: 'fill', source: sourceId,
            paint: { 'fill-color': poly.color, 'fill-opacity': 0.12 }
        });

        map.addLayer({
            id: `${sourceId}-line`, type: 'line', source: sourceId,
            paint: { 'line-color': poly.color, 'line-width': 2.5, 'line-opacity': 0.6, 'line-dasharray': [2, 1] }
        });

        map.addLayer({
            id: `${sourceId}-label`, type: 'symbol', source: sourceId,
            layout: {
                'text-field': poly.nombre, 'text-size': 12,
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-allow-overlap': false
            },
            paint: { 'text-color': poly.color, 'text-halo-color': '#ffffff', 'text-halo-width': 2, 'text-opacity': 0.8 }
        });

        map.on('click', `${sourceId}-fill`, () => {
            if (poly.areaId) setAreaFilter(poly.areaId);
        });
        map.on('mouseenter', `${sourceId}-fill`, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', `${sourceId}-fill`, () => { map.getCanvas().style.cursor = ''; });
    });
}

// ---- MARCADORES DE EMPRESAS ----
function loadCompanyMarkers() {
    const filtered = getFilteredCompanies();

    const geojsonData = {
        type: 'FeatureCollection',
        features: filtered.map(c => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [c.lng, c.lat] },
            properties: { id: c.id, nombre: c.nombre, sector: c.sector || '', areaId: c.areaId }
        }))
    };

    if (map.getSource('companies')) {
        map.getSource('companies').setData(geojsonData);
        return;
    }

    map.addSource('companies', {
        type: 'geojson', data: geojsonData,
        cluster: true, clusterMaxZoom: 16, clusterRadius: 50
    });

    // Clusters
    map.addLayer({
        id: 'clusters', type: 'circle', source: 'companies',
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': ['step', ['get', 'point_count'], '#42a5f5', 10, '#1976d2', 30, '#0d47a1'],
            'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 30, 30],
            'circle-opacity': 0.85,
            'circle-stroke-width': 3, 'circle-stroke-color': 'rgba(255,255,255,0.8)'
        }
    });

    map.addLayer({
        id: 'cluster-count', type: 'symbol', source: 'companies',
        filter: ['has', 'point_count'],
        layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 12, 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'] },
        paint: { 'text-color': '#ffffff' }
    });

    // Individual points — color por sector + borde blanco grueso (visible en satélite)
    const colorMatch = ['match', ['get', 'sector']];
    Object.entries(SECTOR_COLORS).forEach(([sector, color]) => {
        if (sector !== 'default') colorMatch.push(sector, color);
    });
    colorMatch.push(SECTOR_COLORS.default);

    map.addLayer({
        id: 'company-points', type: 'circle', source: 'companies',
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': colorMatch,
            'circle-radius': 8,
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9
        }
    });

    // Click cluster -> zoom
    map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0].properties.cluster_id;
        map.getSource('companies').getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            map.flyTo({ center: features[0].geometry.coordinates, zoom: zoom + 0.5, duration: 500 });
        });
    });

    // Click point -> detail
    map.on('click', 'company-points', (e) => {
        const props = e.features[0].properties;
        const company = empresas.find(c => c.id === props.id);
        if (company) openDetail(company);
    });

    // Hover popup
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });

    map.on('mouseenter', 'company-points', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const props = e.features[0].properties;
        const coords = e.features[0].geometry.coordinates.slice();
        popup.setLngLat(coords)
            .setHTML(`<strong style="font-size:13px">${props.nombre}</strong><br><span style="color:#64748b;font-size:11px">${props.sector}</span>`)
            .addTo(map);
    });
    map.on('mouseleave', 'company-points', () => { map.getCanvas().style.cursor = ''; popup.remove(); });
    map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });
}

// ---- CAPA PANORAMAS 360° ----
function loadPanoramaLayer() {
    if (typeof getPanoramaGeoJSON !== 'function') return;

    map.addSource('panoramas', {
        type: 'geojson',
        data: getPanoramaGeoJSON()
    });

    map.addLayer({
        id: 'panorama-points',
        type: 'circle',
        source: 'panoramas',
        minzoom: 16,
        paint: {
            'circle-color': '#4CAF50',
            'circle-radius': 5,
            'circle-opacity': 0.6,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-opacity': 0.8
        }
    });

    const panoPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });

    map.on('click', 'panorama-points', () => {
        window.open(TOUR_URL, '_blank');
    });

    map.on('mouseenter', 'panorama-points', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const coords = e.features[0].geometry.coordinates.slice();
        panoPopup.setLngLat(coords)
            .setHTML(`<strong style="font-size:12px">${t('panorama360')}</strong><br><span style="color:#4CAF50;font-size:11px">${t('panoramaLayer')}</span>`)
            .addTo(map);
    });

    map.on('mouseleave', 'panorama-points', () => {
        map.getCanvas().style.cursor = '';
        panoPopup.remove();
    });
}

// ---- FILTROS ----
function getFilteredCompanies() {
    let filtered = empresas;
    if (activeAreaFilter !== 'all') filtered = filtered.filter(c => c.areaId === activeAreaFilter);
    if (activeSectorFilter !== 'all') filtered = filtered.filter(c => c.sector === activeSectorFilter);
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(c => {
            const fields = [c.nombre, c.sector, c.actividad, c.direccion, c.cnae].filter(Boolean).join(' ').toLowerCase();
            if (fields.includes(term)) return true;
            // Fuzzy: bigram similarity
            if (term.length >= 3) {
                const qBigrams = new Set();
                for (let i = 0; i < term.length - 1; i++) qBigrams.add(term.slice(i, i + 2));
                let matches = 0;
                const name = c.nombre.toLowerCase();
                for (let i = 0; i < name.length - 1; i++) {
                    if (qBigrams.has(name.slice(i, i + 2))) matches++;
                }
                if (matches / qBigrams.size > 0.5) return true;
            }
            return false;
        });
    }
    // Sort by proximity if user location is available
    if (window._userLat && window._userLng) {
        filtered.sort((a, b) => {
            const dA = Math.hypot(a.lat - _userLat, a.lng - _userLng);
            const dB = Math.hypot(b.lat - _userLat, b.lng - _userLng);
            return dA - dB;
        });
    }
    return filtered;
}

function renderFilters() {
    const areas = areasIndustriales;
    const getAreaName = (a) => {
        const name = currentLang === 'en' && a.nombre_en ? a.nombre_en : a.nombre;
        return name.replace('Polígono Industrial de ', '').replace('El ', '').replace(' Industrial Estate', '');
    };
    const areaHTML = `
        <span class="filter-section-label">${t('zone')}</span>
        <button class="filter-pill ${activeAreaFilter === 'all' ? 'active' : ''}" onclick="setAreaFilter('all')">${t('allZones')}</button>
        ${areas.map(a => `
            <button class="filter-pill ${activeAreaFilter === a.id ? 'active' : ''}" onclick="setAreaFilter('${a.id}')">
                ${getAreaName(a)} <span style="opacity:0.6;font-size:10px">${a.count}</span>
            </button>
        `).join('')}
    `;
    document.getElementById('filtersAreaDesktop').innerHTML = areaHTML;
    document.getElementById('filtersAreaMobile').innerHTML = areaHTML;

    const sectorCounts = {};
    const base = activeAreaFilter !== 'all' ? empresas.filter(e => e.areaId === activeAreaFilter) : empresas;
    base.forEach(e => { if (e.sector) sectorCounts[e.sector] = (sectorCounts[e.sector] || 0) + 1; });
    const topSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);

    const sectorHTML = `
        <span class="filter-section-label">${t('sector')}</span>
        <button class="filter-pill ${activeSectorFilter === 'all' ? 'active' : ''}" onclick="setSectorFilter('all')">${t('allSectors')}</button>
        ${topSectors.map(([sector, count]) => `
            <button class="filter-pill ${activeSectorFilter === sector ? 'active' : ''}" onclick="setSectorFilter('${sector.replace(/'/g, "\\'")}')">
                ${sector} <span style="opacity:0.6;font-size:10px">${count}</span>
            </button>
        `).join('')}
    `;
    document.getElementById('filtersSectorDesktop').innerHTML = sectorHTML;
    document.getElementById('filtersSectorMobile').innerHTML = sectorHTML;
}

function setAreaFilter(areaId) { activeAreaFilter = areaId; Analytics.track('filter_area', { area: areaId }); applyFilters(); updateHash(); }
function setSectorFilter(sector) { activeSectorFilter = sector; Analytics.track('filter_sector', { sector }); applyFilters(); updateHash(); }

function applyFilters() {
    renderFilters();
    renderList();
    loadCompanyMarkers();
    updateStats();
    if (activeAreaFilter !== 'all') {
        const area = areasIndustriales.find(a => a.id === activeAreaFilter);
        if (area) map.flyTo({ center: area.centroid, zoom: 15, duration: 800 });
    }
}

// ---- LISTA DE EMPRESAS ----
function renderList() {
    const filtered = getFilteredCompanies();
    const html = filtered.length > 0
        ? filtered.map(c => createCompanyCard(c)).join('')
        : `<div class="empty-state">
               <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
               <p>${t('noResults')}</p>
               <p style="font-size:12px;margin-top:4px;opacity:0.7">${t('tryOtherFilters')}</p>
           </div>`;
    document.getElementById('listDesktop').innerHTML = html;
    document.getElementById('listMobile').innerHTML = html;
}

function createCompanyCard(company) {
    const sectorColor = SECTOR_COLORS[company.sector] || SECTOR_COLORS.default;
    const iconName = SECTOR_ICONS[company.sector] || SECTOR_ICONS.default;
    const iconSVG = ICON_PATHS[iconName] || ICON_PATHS.building;
    const areaShort = company.area.replace('Polígono Industrial de ', '').replace('PI ', '');
    const noSector = t('noSector');

    const svBadge = company.streetView
        ? '<span class="sv-badge" title="Street View disponible"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg></span>'
        : '';

    const quickCall = company.telefono
        ? `<button class="quick-call-btn" onclick="event.stopPropagation();window.location.href='tel:${company.telefono}'" title="${t('call')} ${company.telefono}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </button>`
        : '';

    return `
    <div class="company-card" onclick="openDetailById(${company.id})">
        <div class="company-icon" style="background: linear-gradient(135deg, ${sectorColor}, ${sectorColor}dd); box-shadow: 0 4px 12px ${sectorColor}44">
            <svg viewBox="0 0 24 24">${iconSVG}</svg>
        </div>
        <div class="company-info">
            <div class="company-name">${escapeHTML(company.nombre)}${svBadge}</div>
            <div class="company-meta">
                <span>${escapeHTML(company.sector || noSector)}</span>
                <span class="separator">|</span>
                <span>${escapeHTML(areaShort)}</span>
            </div>
        </div>
        ${quickCall}
        <svg class="company-arrow w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="m9 18 6-6-6-6"/>
        </svg>
    </div>`;
}

// ---- DETALLE EMPRESA (FICHA ENRIQUECIDA) ----
function openDetailById(id) {
    const company = empresas.find(c => c.id === id);
    if (company) openDetail(company);
}

function openDetail(company) {
    selectedCompany = company;
    addToRecent(company.id);
    Analytics.track('company_view', { id: company.id, name: company.nombre, sector: company.sector, area: company.areaId });
    // Update URL with company
    history.replaceState(null, '', `#empresa=${company.id}`);
    stopAudio();

    const modal = document.getElementById('detailModal');

    // Header
    document.getElementById('detailTitle').textContent = company.nombre;
    const sectorColor = SECTOR_COLORS[company.sector] || SECTOR_COLORS.default;
    const iconName = SECTOR_ICONS[company.sector] || SECTOR_ICONS.default;
    const iconSVG = ICON_PATHS[iconName] || ICON_PATHS.building;
    document.getElementById('detailSector').innerHTML = `
        <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:white;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round">${iconSVG}</svg>
        ${escapeHTML(company.sector || t('unclassified'))}
    `;
    document.getElementById('detailArea').innerHTML = `
        <svg style="width:12px;height:12px;display:inline;vertical-align:-1px;stroke:currentColor;stroke-width:2;fill:none" viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        ${escapeHTML(company.area)}
    `;

    // Street View Photo Preview (facade thumbnail)
    const photoSection = document.getElementById('detailPhotoSection');
    const svPhotoIframe = document.getElementById('svPhotoIframe');
    const svPhotoCard = document.getElementById('svPhotoCard');
    if (company.streetView) {
        photoSection.style.display = 'block';
        svPhotoIframe.src = company.streetView;
        // Click to scroll to full 360° Street View section
        svPhotoCard.onclick = function() {
            const svFullSection = document.getElementById('detailStreetViewSection');
            if (svFullSection && svFullSection.style.display !== 'none') {
                svFullSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };
    } else {
        photoSection.style.display = 'none';
        svPhotoIframe.src = '';
    }

    // Audio section
    const audioSection = document.getElementById('detailAudioSection');
    if (company.audioUrl) {
        audioSection.style.display = 'block';
        document.getElementById('audioPlayer').src = company.audioUrl;
    } else {
        // Show audio button as "coming soon" for all companies
        audioSection.style.display = 'block';
        document.getElementById('audioPlayer').src = '';
    }

    // Description
    const descSection = document.getElementById('detailDescSection');
    if (company.descripcion) {
        descSection.style.display = 'block';
        document.getElementById('detailDesc').textContent = company.descripcion;
    } else {
        descSection.style.display = 'none';
    }

    // Panorama 360° — Google Street View Embed API (gratis)
    const panoSection = document.getElementById('detailPanoramaSection');
    const panoIframe = document.getElementById('panoramaIframe');
    const panoDistance = document.getElementById('panoramaDistance');
    if (company.lat && company.lng && GOOGLE_MAPS_EMBED_API_KEY !== 'TU_API_KEY_AQUI') {
        panoSection.style.display = 'block';
        // Buscar heading del panorama más cercano para orientar la vista
        let heading = 90;
        if (typeof findNearestPanorama === 'function') {
            const nearest = findNearestPanorama(company.lat, company.lng);
            if (nearest && nearest.distance < 300) {
                heading = Math.round(nearest.heading);
                const distText = nearest.distance < 1000
                    ? Math.round(nearest.distance) + ' m'
                    : (nearest.distance / 1000).toFixed(1) + ' km';
                panoDistance.textContent = t('panoramaDistance').replace('{dist}', distText);
                panoDistance.style.display = 'block';
            } else {
                panoDistance.style.display = 'none';
            }
        } else {
            panoDistance.style.display = 'none';
        }
        panoIframe.src = `https://www.google.com/maps/embed/v1/streetview?key=${GOOGLE_MAPS_EMBED_API_KEY}&location=${company.lat},${company.lng}&heading=${heading}&pitch=0&fov=80`;
    } else {
        panoSection.style.display = 'none';
        if (panoIframe) panoIframe.src = '';
    }

    // Vista de la zona (Street View embebido real o mapa como fallback)
    const svSection = document.getElementById('detailStreetViewSection');
    const svIframe = document.getElementById('streetViewIframe');
    if (company.streetView) {
        svSection.style.display = 'block';
        svIframe.src = company.streetView;
    } else if (company.lat && company.lng) {
        svSection.style.display = 'block';
        svIframe.src = `https://www.google.com/maps?q=${company.lat},${company.lng}&z=18&output=embed`;
    } else {
        svSection.style.display = 'none';
        svIframe.src = '';
    }

    // Mini-map
    initMiniMap(company.lat, company.lng, company.nombre);

    // Contact info
    let infoHTML = '';
    if (company.direccion) {
        infoHTML += createInfoRow('location', t('address'),
            `${company.direccion}${company.nave ? ', Nave ' + company.nave : ''}${company.cp ? ' - ' + company.cp : ''}`);
    }
    if (company.telefono) {
        infoHTML += createInfoRow('phone', t('phone'),
            `<a href="tel:${company.telefono}">${escapeHTML(company.telefono)}</a>`);
    }
    if (company.email) {
        infoHTML += createInfoRow('email', t('email'),
            `<a href="mailto:${company.email}">${escapeHTML(company.email)}</a>`);
    }
    if (company.web) {
        const webUrl = company.web.startsWith('http') ? company.web : 'https://' + company.web;
        infoHTML += createInfoRow('web', t('web'),
            `<a href="${webUrl}" target="_blank" rel="noopener">${escapeHTML(company.web)}</a>`);
    }
    if (company.actividad) {
        infoHTML += createInfoRow('activity', t('activity'), escapeHTML(company.actividad));
    }
    if (company.cif) {
        infoHTML += createInfoRow('id', 'CIF', escapeHTML(company.cif));
    }
    document.getElementById('detailInfo').innerHTML = infoHTML;

    // Transporte público cercano
    const busStopSection = document.getElementById('detailBusStopSection');
    if (busStopSection) {
        const nearestStop = findNearestBusStop(company.lat, company.lng);
        if (nearestStop) {
            busStopSection.style.display = 'block';
            let busHTML = `
                <div class="detail-info-row">
                    <div class="detail-info-icon" style="background:#E8F5E9;color:#4CAF50">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h20"/><path d="M7 18H5a2 2 0 0 1-2-2V6a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
                        </svg>
                    </div>
                    <div class="detail-info-content">
                        <div class="detail-info-label">${t('nearestStop')}</div>
                        <div class="detail-info-value">${escapeHTML(nearestStop.name)}</div>
                        <div style="font-size:11px;color:#4CAF50;font-weight:600;margin-top:2px">a ${formatDistance(nearestStop.distance)}</div>
                        ${nearestStop.lines ? `<div style="font-size:11px;color:#64748b;margin-top:2px">${t('lines')}: ${escapeHTML(nearestStop.lines)}</div>` : ''}
                    </div>
                </div>`;
            document.getElementById('detailBusStop').innerHTML = busHTML;
        } else {
            busStopSection.style.display = 'none';
        }
    }

    // Distancias a puntos clave
    const poiSection = document.getElementById('detailPOISection');
    if (poiSection && company.lat && company.lng) {
        const distances = calculatePOIDistances(company.lat, company.lng);
        poiSection.style.display = 'block';
        document.getElementById('detailPOI').innerHTML = distances.map(d => {
            const poiName = currentLang === 'en' && d.nombre_en ? d.nombre_en : d.nombre;
            return `
            <div class="detail-info-row">
                <div class="detail-info-icon" style="background:${d.color}18;color:${d.color}">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[d.icon] || ICON_PATHS.building}</svg>
                </div>
                <div class="detail-info-content">
                    <div class="detail-info-label">${escapeHTML(poiName)}</div>
                    <div class="detail-info-value" style="color:${d.color}">${formatDistance(d.distance)}</div>
                </div>
            </div>`;
        }).join('');
    } else if (poiSection) {
        poiSection.style.display = 'none';
    }

    // CNAE
    const cnaeSection = document.getElementById('detailCnaeSection');
    if (company.cnae) {
        cnaeSection.style.display = 'block';
        document.getElementById('detailCnae').textContent = company.cnae;
    } else {
        cnaeSection.style.display = 'none';
    }

    // Action buttons
    let actionsHTML = `
        <button class="action-btn action-btn-primary" onclick="navigateToCompany()">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
            ${t('directions')}
        </button>
        <button class="action-btn action-btn-secondary" onclick="shareCompany()">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
            ${t('share')}
        </button>`;
    if (company.telefono) {
        actionsHTML += `
        <button class="action-btn action-btn-secondary" onclick="callCompany()">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            ${t('call')}
        </button>`;
    }
    if (company.email) {
        actionsHTML += `
        <button class="action-btn action-btn-secondary" onclick="emailCompany()">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            ${t('email')}
        </button>`;
    }
    document.getElementById('detailActions').innerHTML = actionsHTML;

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Fly to company
    map.flyTo({
        center: [company.lng, company.lat],
        zoom: 17,
        duration: 800,
        padding: { left: window.innerWidth >= 1024 ? 400 : 0, bottom: window.innerWidth < 1024 ? 300 : 0 }
    });
}

function createInfoRow(type, label, value) {
    const icons = {
        location: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
        phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>',
        email: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
        web: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
        activity: '<path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2M12 20v2m-8-10h2m16 0h2"/>',
        id: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
    };

    return `
    <div class="detail-info-row">
        <div class="detail-info-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[type] || icons.activity}</svg>
        </div>
        <div class="detail-info-content">
            <div class="detail-info-label">${label}</div>
            <div class="detail-info-value">${value}</div>
        </div>
    </div>`;
}

function closeDetail() {
    document.getElementById('detailModal').classList.remove('active');
    document.body.style.overflow = '';
    selectedCompany = null;
    history.replaceState(null, '', location.pathname);
    stopAudio();
    destroyMiniMap();
    // Limpiar iframes Street View
    const svIframe = document.getElementById('streetViewIframe');
    if (svIframe) svIframe.src = '';
    const svPhotoIframe = document.getElementById('svPhotoIframe');
    if (svPhotoIframe) svPhotoIframe.src = '';
}

// ---- MINI-MAPA ----
function initMiniMap(lat, lng, nombre) {
    destroyMiniMap();

    const container = document.getElementById('miniMapContainer');
    if (!container || !lat || !lng) return;

    // Small delay to let modal render
    setTimeout(() => {
        miniMap = new maplibregl.Map({
            container: 'miniMapContainer',
            style: lightStyle,
            center: [lng, lat],
            zoom: 17,
            interactive: false,
            attributionControl: false
        });

        miniMap.on('load', () => {
            new maplibregl.Marker({ color: '#1976d2' })
                .setLngLat([lng, lat])
                .addTo(miniMap);
        });
    }, 150);
}

function destroyMiniMap() {
    if (miniMap) {
        try { miniMap.remove(); } catch (e) {}
        miniMap = null;
    }
}

// ---- AUDIO PLAYER + WEB AUDIO API WAVEFORM ----
let audioCtx = null;
let analyser = null;
let audioSourceNode = null;
let waveAnimFrame = null;

function initAudioContext() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        const player = document.getElementById('audioPlayer');
        audioSourceNode = audioCtx.createMediaElementSource(player);
        audioSourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
    } catch (e) {
        audioCtx = null;
    }
}

function drawWaveform() {
    const canvas = document.getElementById('audioCanvas');
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
        waveAnimFrame = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barCount = 6;
        const barWidth = 4;
        const gap = 3;
        const totalWidth = barCount * barWidth + (barCount - 1) * gap;
        const startX = (canvas.width - totalWidth) / 2;
        const maxBarHeight = canvas.height * 0.75;
        const minBarHeight = 4;

        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i / barCount) * bufferLength);
            const value = dataArray[dataIndex] / 255;
            const barHeight = minBarHeight + value * (maxBarHeight - minBarHeight);
            const x = startX + i * (barWidth + gap);
            const y = (canvas.height - barHeight) / 2;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, 2);
            ctx.fill();
        }
    }
    draw();
}

function stopWaveform() {
    if (waveAnimFrame) {
        cancelAnimationFrame(waveAnimFrame);
        waveAnimFrame = null;
    }
    const canvas = document.getElementById('audioCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function toggleAudio() {
    const player = document.getElementById('audioPlayer');
    const btn = document.getElementById('audioPlayBtn');

    if (!player.src || !selectedCompany?.audioUrl) {
        showToast(t('audioNotAvailable'));
        return;
    }

    if (audioPlaying) {
        player.pause();
        btn.classList.remove('playing');
        stopWaveform();
        audioPlaying = false;
    } else {
        initAudioContext();
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        player.play().then(() => {
            btn.classList.add('playing');
            audioPlaying = true;
            Analytics.track('audio_play', { id: selectedCompany.id, name: selectedCompany.nombre });
            if (analyser) {
                drawWaveform();
            }
        }).catch(() => {
            showToast(t('audioError'));
        });
    }
}

function stopAudio() {
    const player = document.getElementById('audioPlayer');
    const btn = document.getElementById('audioPlayBtn');
    if (player) {
        player.pause();
        player.currentTime = 0;
    }
    if (btn) btn.classList.remove('playing');
    stopWaveform();
    audioPlaying = false;
}

// Audio ended event
document.addEventListener('DOMContentLoaded', () => {
    const player = document.getElementById('audioPlayer');
    if (player) {
        player.addEventListener('ended', () => {
            document.getElementById('audioPlayBtn')?.classList.remove('playing');
            stopWaveform();
            audioPlaying = false;
        });
    }
});

// ---- ACCIONES ----
function navigateToCompany() {
    if (!selectedCompany) return;
    Analytics.track('action_directions', { id: selectedCompany.id, name: selectedCompany.nombre });
    if (selectedCompany.googleMapsUrl) {
        window.open(selectedCompany.googleMapsUrl, '_blank');
    } else {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedCompany.lat},${selectedCompany.lng}&travelmode=driving`, '_blank');
    }
}

function callCompany() {
    if (!selectedCompany?.telefono) return;
    Analytics.track('action_call', { id: selectedCompany.id, name: selectedCompany.nombre });
    window.location.href = `tel:${selectedCompany.telefono}`;
}

function emailCompany() {
    if (!selectedCompany?.email) return;
    Analytics.track('action_email', { id: selectedCompany.id, name: selectedCompany.nombre });
    window.location.href = `mailto:${selectedCompany.email}`;
}

function shareCompany() {
    if (!selectedCompany) return;
    Analytics.track('action_share', { id: selectedCompany.id, name: selectedCompany.nombre });
    const text = `${selectedCompany.nombre} - ${selectedCompany.area}, Santander`;
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({ title: t('shareTitle'), text, url }).catch(() => {});
    } else {
        navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
            showToast(t('linkCopied'));
        }).catch(() => {});
    }
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
        background:#1e293b; color:white; padding:10px 20px; border-radius:10px;
        font-size:13px; font-weight:500; z-index:9999; animation:fadeIn 0.2s;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, 2000);
    setTimeout(() => toast.remove(), 2500);
}

// ---- BÚSQUEDA ----
function setupSearch() {
    const desktopInput = document.getElementById('searchDesktop');
    const mobileInput = document.getElementById('searchMobile');
    let debounceTimer;

    const handler = (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            searchTerm = e.target.value;
            if (e.target === desktopInput && mobileInput) mobileInput.value = searchTerm;
            if (e.target === mobileInput && desktopInput) desktopInput.value = searchTerm;
            renderList();
            loadCompanyMarkers();
            updateStats();
            updateHash();
            renderRecentBar();
            // Track search
            if (searchTerm.length > 2) {
                const results = getFilteredCompanies().length;
                Analytics.track('search_query', { query: searchTerm, results });
            }
        }, 150);
    };

    desktopInput.addEventListener('input', handler);
    mobileInput.addEventListener('input', handler);

    // Clear button: add X button when typing
    [desktopInput, mobileInput].forEach(input => {
        const wrapper = input.parentElement;
        let clearBtn = wrapper.querySelector('.search-clear');
        if (!clearBtn) {
            clearBtn = document.createElement('button');
            clearBtn.className = 'search-clear';
            clearBtn.innerHTML = '&times;';
            clearBtn.title = 'Limpiar búsqueda';
            clearBtn.onclick = () => {
                desktopInput.value = '';
                mobileInput.value = '';
                searchTerm = '';
                renderList();
                loadCompanyMarkers();
                updateStats();
                updateHash();
                renderRecentBar();
            };
            wrapper.appendChild(clearBtn);
        }
        input.addEventListener('input', () => {
            clearBtn.style.display = input.value ? 'flex' : 'none';
        });
        clearBtn.style.display = input.value ? 'flex' : 'none';
    });
}

// ---- ESTADÍSTICAS ----
function updateStats() {
    const filtered = getFilteredCompanies();
    const total = filtered.length;
    const statsText = `${total} ${t('companies')}`;
    const statsEl = document.getElementById('statsTotal');
    if (statsEl) statsEl.textContent = statsText;
    const mobileStats = document.getElementById('mobileStats');
    if (mobileStats) mobileStats.textContent = `${statsText} ${t('inSantander')}`;
    const mobileCount = document.getElementById('mobileCount');
    if (mobileCount) mobileCount.textContent = total;
}

// ---- CONTROLES DEL MAPA ----
function toggleSatellite() {
    isSatellite = !isSatellite;
    const btn = document.getElementById('btnSatellite');
    // Toggle class para adaptar estilo de floating pills
    document.querySelector('.flex-1.relative')?.classList.toggle('satellite-active', isSatellite);
    if (isSatellite) {
        if (!map.getSource('satellite')) {
            map.addSource('satellite', {
                type: 'raster',
                tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                tileSize: 256, maxzoom: 19
            });
        }
        if (!map.getLayer('satellite-layer')) {
            const firstPolyLayer = `polygon-${poligonos[0].id}-fill`;
            map.addLayer({ id: 'satellite-layer', type: 'raster', source: 'satellite', paint: { 'raster-opacity': 0.85 } }, firstPolyLayer);
        }
        btn.classList.add('active');
    } else {
        if (map.getLayer('satellite-layer')) map.removeLayer('satellite-layer');
        btn.classList.remove('active');
    }
}

function locateUser() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            map.flyTo({ center: [longitude, latitude], zoom: 16, duration: 1000 });
            new maplibregl.Marker({ color: '#1976d2' }).setLngLat([longitude, latitude]).addTo(map);
            // Sort companies by proximity
            window._userLat = pos.coords.latitude;
            window._userLng = pos.coords.longitude;
            showToast(currentLang === 'es' ? 'Empresas ordenadas por cercanía' : 'Companies sorted by proximity');
            renderList();
            renderRecentBar();
        },
        () => showToast(t('locationError')),
        { enableHighAccuracy: true }
    );
}

function resetView() {
    activeAreaFilter = 'all';
    activeSectorFilter = 'all';
    searchTerm = '';
    document.getElementById('searchDesktop').value = '';
    document.getElementById('searchMobile').value = '';
    map.flyTo({ center: CONFIG.center, zoom: CONFIG.zoom, duration: 800 });
    renderFilters(); renderList(); loadCompanyMarkers(); updateStats();
}

// ---- BOTTOM SHEET ----
function setupBottomSheet() {
    const sheet = document.getElementById('bottomSheet');
    if (!sheet) return;
    const handle = document.getElementById('sheetHandle');
    let startY, startHeight, isDragging = false;
    sheet.style.height = SNAP.COLLAPSED + 'px';

    function onTouchStart(e) {
        isDragging = true;
        startY = e.touches[0].clientY;
        startHeight = sheet.getBoundingClientRect().height;
        sheet.style.transition = 'none';
    }
    function onTouchMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        const deltaY = startY - e.touches[0].clientY;
        const newHeight = Math.min(Math.max(startHeight + deltaY, SNAP.COLLAPSED), SNAP.FULL);
        sheet.style.height = newHeight + 'px';
    }
    function onTouchEnd(e) {
        if (!isDragging) return;
        isDragging = false;
        sheet.style.transition = 'height 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
        const currentHeight = sheet.getBoundingClientRect().height;
        const velocity = startY - (e.changedTouches[0]?.clientY || startY);
        let target;
        if (velocity > 50) target = currentHeight < SNAP.HALF ? SNAP.HALF : SNAP.FULL;
        else if (velocity < -50) target = currentHeight > SNAP.HALF ? SNAP.HALF : SNAP.COLLAPSED;
        else {
            const dists = [
                { snap: SNAP.COLLAPSED, d: Math.abs(currentHeight - SNAP.COLLAPSED) },
                { snap: SNAP.HALF, d: Math.abs(currentHeight - SNAP.HALF) },
                { snap: SNAP.FULL, d: Math.abs(currentHeight - SNAP.FULL) }
            ];
            target = dists.sort((a, b) => a.d - b.d)[0].snap;
        }
        sheet.style.height = target + 'px';
        currentSnap = target;
    }

    handle.addEventListener('touchstart', onTouchStart, { passive: true });
    sheet.addEventListener('touchmove', onTouchMove, { passive: false });
    sheet.addEventListener('touchend', onTouchEnd, { passive: true });

    handle.addEventListener('click', () => {
        sheet.style.transition = 'height 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
        currentSnap = currentSnap === SNAP.COLLAPSED ? SNAP.HALF : SNAP.COLLAPSED;
        sheet.style.height = currentSnap + 'px';
    });
}

// ---- UTILIDADES ----
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetail(); });

// ============================================================
// NUEVAS FEATURES: UTILIDADES
// ============================================================

function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(meters) {
    return meters >= 1000 ? (meters / 1000).toFixed(1) + ' km' : Math.round(meters) + ' m';
}

// ============================================================
// FEATURE 2: PUNTOS DE INTERÉS Y DISTANCIAS
// ============================================================

function addPOIMarkers() {
    removePOIMarkers();
    POIS.forEach(poi => {
        const el = document.createElement('div');
        el.className = 'poi-marker-enhanced';
        el.style.cssText = 'width:0;height:0;overflow:visible;';
        el.innerHTML = `
            <div class="poi-marker-body">
                <div class="poi-marker-pin" style="--pin-color:${poi.color}">
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:white;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round">${ICON_PATHS[poi.icon] || ICON_PATHS.building}</svg>
                </div>
                <div class="poi-marker-stem"></div>
            </div>
            <span class="poi-marker-label">${currentLang === 'en' && poi.nombre_en ? poi.nombre_en : poi.nombre}</span>
        `;

        const poiName = currentLang === 'en' && poi.nombre_en ? poi.nombre_en : poi.nombre;
        const popup = new maplibregl.Popup({ offset: [0, -58], closeButton: false, className: 'poi-popup' })
            .setHTML(`<strong style="font-size:13px">${poiName}</strong>`);

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat(poi.coords)
            .setPopup(popup);

        if (poisVisible) marker.addTo(map);
        poiMarkers.push(marker);
    });
}

function removePOIMarkers() {
    poiMarkers.forEach(m => m.remove());
    poiMarkers = [];
}

function togglePOIs() {
    poisVisible = !poisVisible;
    if (poisVisible) {
        if (poiMarkers.length === 0) addPOIMarkers();
        else poiMarkers.forEach(m => m.addTo(map));
    } else {
        poiMarkers.forEach(m => m.remove());
    }
    document.getElementById('btnPOIsFloat')?.classList.toggle('active', poisVisible);
    document.querySelectorAll('.poi-distances-panel').forEach(el => {
        el.style.display = poisVisible ? 'block' : 'none';
    });
}

function calculatePOIDistances(lat, lng) {
    return POIS.map(poi => ({
        id: poi.id,
        nombre: poi.nombre,
        nombre_en: poi.nombre_en || poi.nombre,
        icon: poi.icon,
        color: poi.color,
        distance: haversineDistance(lat, lng, poi.coords[1], poi.coords[0])
    })).sort((a, b) => a.distance - b.distance);
}

function renderPOIDistancesPanel() {
    const containers = [document.getElementById('poiDistancesDesktop'), document.getElementById('poiDistancesMobile')];
    let html = '';
    areasIndustriales.forEach(area => {
        const distances = calculatePOIDistances(area.centroid[1], area.centroid[0]);
        const areaName = currentLang === 'en' && area.nombre_en ? area.nombre_en : area.nombre;
        const areaShort = areaName.replace('Polígono Industrial de ', '').replace(' Industrial Estate', '');
        html += `
        <div class="poi-distance-group">
            <div class="poi-distance-group-title" onclick="this.parentElement.classList.toggle('collapsed')">
                <span>📍 ${escapeHTML(areaShort)}</span>
                <svg class="poi-chevron" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="m6 9 6 6 6-6"/></svg>
            </div>
            <div class="poi-distance-list">
                ${distances.map(d => {
                    const poiName = currentLang === 'en' && d.nombre_en ? d.nombre_en : d.nombre;
                    return `
                    <div class="poi-distance-item">
                        <div class="poi-distance-icon" style="background:${d.color}18;color:${d.color}">
                            <svg viewBox="0 0 24 24">${ICON_PATHS[d.icon] || ICON_PATHS.building}</svg>
                        </div>
                        <span class="poi-distance-name">${escapeHTML(poiName)}</span>
                        <span class="poi-distance-value">${formatDistance(d.distance)}</span>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    });
    containers.forEach(c => { if (c) c.innerHTML = html; });
}

// ============================================================
// FEATURE 1: PARADAS DE AUTOBÚS (OVERPASS API)
// ============================================================

async function fetchBusStops() {
    // Comprobar cache sessionStorage
    try {
        const cached = sessionStorage.getItem('busStops_santander');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < 3600000) {
                busStopsData = parsed.data;
                addBusStopLayer();
                return;
            }
        }
    } catch (e) {}

    const query = `[out:json][timeout:15];(node["highway"="bus_stop"](43.42,-3.87,43.46,-3.82);node["public_transport"="platform"]["bus"="yes"](43.42,-3.87,43.46,-3.82););out body;`;

    try {
        const resp = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'data=' + encodeURIComponent(query)
        });
        if (!resp.ok) throw new Error('Overpass API error');
        const json = await resp.json();

        busStopsData = {
            type: 'FeatureCollection',
            features: json.elements.filter(el => el.lat && el.lon).map(el => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [el.lon, el.lat] },
                properties: {
                    name: el.tags?.name || t('busStopFallback'),
                    lines: el.tags?.route_ref || el.tags?.lines || '',
                    operator: el.tags?.operator || '',
                    ref: el.tags?.ref || ''
                }
            }))
        };

        try {
            sessionStorage.setItem('busStops_santander', JSON.stringify({ data: busStopsData, timestamp: Date.now() }));
        } catch (e) {}

        addBusStopLayer();
    } catch (err) {
        console.warn('Error fetching bus stops:', err);
    }
}

function addBusStopLayer() {
    if (!busStopsData || map.getSource('bus-stops')) return;

    map.addSource('bus-stops', { type: 'geojson', data: busStopsData });

    // Insertar antes de clusters para quedar debajo
    const beforeLayer = map.getLayer('clusters') ? 'clusters' : undefined;

    map.addLayer({
        id: 'bus-stop-points', type: 'circle', source: 'bus-stops',
        paint: {
            'circle-color': '#4CAF50',
            'circle-radius': 6,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9
        },
        layout: { 'visibility': 'none' }
    }, beforeLayer);

    map.addLayer({
        id: 'bus-stop-labels', type: 'symbol', source: 'bus-stops',
        layout: {
            'text-field': ['get', 'name'],
            'text-size': 10,
            'text-offset': [0, 1.5],
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'visibility': 'none'
        },
        minzoom: 15,
        paint: { 'text-color': '#2E7D32', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 }
    }, beforeLayer);

    // Hover popup
    const busPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });

    map.on('mouseenter', 'bus-stop-points', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const props = e.features[0].properties;
        const coords = e.features[0].geometry.coordinates.slice();
        let html = `<strong style="font-size:12px;color:#2E7D32">🚌 ${props.name}</strong>`;
        if (props.lines) html += `<br><span style="color:#64748b;font-size:11px">${t('lines')}: ${props.lines}</span>`;
        busPopup.setLngLat(coords).setHTML(html).addTo(map);
    });
    map.on('mouseleave', 'bus-stop-points', () => {
        map.getCanvas().style.cursor = '';
        busPopup.remove();
    });
}

// toggleBusStops() replaced by toggleTransport() in V3

function findNearestBusStop(lat, lng) {
    if (!busStopsData?.features?.length) return null;
    let nearest = null, minDist = Infinity;
    for (const f of busStopsData.features) {
        const [bLng, bLat] = f.geometry.coordinates;
        const d = haversineDistance(lat, lng, bLat, bLng);
        if (d < minDist) { minDist = d; nearest = f; }
    }
    return nearest ? { ...nearest.properties, distance: Math.round(minDist) } : null;
}

// ============================================================
// FEATURE 3: WIDGET METEOROLÓGICO (OPEN-METEO API)
// ============================================================

const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast?latitude=43.46&longitude=-3.80&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FMadrid&forecast_days=5';

async function fetchWeather() {
    try {
        const resp = await fetch(WEATHER_API_URL);
        if (!resp.ok) throw new Error('Weather API error');
        const json = await resp.json();

        weatherData = {
            current: {
                temp: Math.round(json.current.temperature_2m),
                weatherCode: json.current.weather_code,
                windSpeed: Math.round(json.current.wind_speed_10m),
                humidity: json.current.relative_humidity_2m,
                uvIndex: Math.round(json.current.uv_index)
            },
            daily: json.daily.time.map((date, i) => ({
                date,
                tempMin: Math.round(json.daily.temperature_2m_min[i]),
                tempMax: Math.round(json.daily.temperature_2m_max[i]),
                weatherCode: json.daily.weather_code[i]
            })),
            fetchedAt: Date.now()
        };

        renderWeatherWidget();
    } catch (err) {
        console.warn('Error fetching weather:', err);
    }
}

function startWeatherRefresh() {
    fetchWeather();
    weatherRefreshTimer = setInterval(fetchWeather, 30 * 60 * 1000);
}

function renderWeatherWidget() {
    if (!weatherData) return;

    const wmo = WMO_CODES[weatherData.current.weatherCode] || { desc: 'Desconocido', desc_en: 'Unknown', icon: '🌡️' };
    const wmoDesc = currentLang === 'en' && wmo.desc_en ? wmo.desc_en : wmo.desc;
    const dayNames = t('dayNames');

    // Update floating button text
    const iconEl = document.getElementById('weatherFloatIcon');
    const labelEl = document.getElementById('weatherFloatLabel');
    if (iconEl) iconEl.textContent = wmo.icon;
    if (labelEl) labelEl.textContent = `${weatherData.current.temp}°C`;

    // Render expanded panel content
    const panel = document.getElementById('weatherFloatPanel');
    if (panel) {
        panel.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                <span style="font-size:32px;line-height:1">${wmo.icon}</span>
                <div>
                    <div class="weather-float-temp">${weatherData.current.temp}°C</div>
                    <div class="weather-float-desc">${wmoDesc} ${t('weatherIn')}</div>
                </div>
            </div>
            <div class="weather-float-stats">
                <div class="weather-float-stat">
                    <span style="font-size:14px">💨</span>
                    <span class="weather-float-stat-value">${weatherData.current.windSpeed} km/h</span>
                    <span class="weather-float-stat-label">${t('wind')}</span>
                </div>
                <div class="weather-float-stat">
                    <span style="font-size:14px">💧</span>
                    <span class="weather-float-stat-value">${weatherData.current.humidity}%</span>
                    <span class="weather-float-stat-label">${t('humidity')}</span>
                </div>
                <div class="weather-float-stat">
                    <span style="font-size:14px">☀️</span>
                    <span class="weather-float-stat-value">${weatherData.current.uvIndex}</span>
                    <span class="weather-float-stat-label">${t('uv')}</span>
                </div>
            </div>
            <div class="weather-float-forecast">
                ${weatherData.daily.slice(1).map(d => {
                    const dayDate = new Date(d.date + 'T12:00:00');
                    const dayWmo = WMO_CODES[d.weatherCode] || { icon: '🌡️' };
                    return `
                        <div class="weather-float-day">
                            <span class="weather-float-day-name">${dayNames[dayDate.getDay()]}</span>
                            <span class="weather-float-day-icon">${dayWmo.icon}</span>
                            <span class="weather-float-day-temps"><span class="temp-max">${d.tempMax}°</span> <span class="temp-min">${d.tempMin}°</span></span>
                        </div>`;
                }).join('')}
            </div>
        `;
    }
}

function toggleWeatherOverlay() {
    weatherOverlayExpanded = !weatherOverlayExpanded;
    const panel = document.getElementById('weatherFloatPanel');
    if (panel) panel.classList.toggle('visible', weatherOverlayExpanded);
    document.getElementById('btnWeatherFloat')?.classList.toggle('active', weatherOverlayExpanded);

    if (weatherOverlayExpanded) {
        setTimeout(() => {
            document.addEventListener('click', _closeWeatherOnOutside);
        }, 100);
    }
}

function _closeWeatherOnOutside(e) {
    const weatherGroup = document.getElementById('weatherFloating');
    if (weatherGroup && !weatherGroup.contains(e.target)) {
        weatherOverlayExpanded = false;
        document.getElementById('weatherFloatPanel')?.classList.remove('visible');
        document.getElementById('btnWeatherFloat')?.classList.remove('active');
        document.removeEventListener('click', _closeWeatherOnOutside);
    }
}

// ============================================================
// FEATURE V3: PARCELAS LIBRES (FREE PLOTS)
// ============================================================

function addParcelasLayer() {
    if (!parcelasLibres || parcelasLibres.length === 0) return;

    const geojson = {
        type: 'FeatureCollection',
        features: parcelasLibres.map(p => ({
            type: 'Feature',
            properties: {
                id: p.id,
                nombre: p.nombre,
                nombre_en: p.nombre_en || p.nombre,
                superficie: p.superficie,
                descripcion: p.descripcion || '',
                descripcion_en: p.descripcion_en || '',
                tipo: p.tipo || 'industrial',
                areaNombre: p.areaNombre || '',
                areaNombre_en: p.areaNombre_en || p.areaNombre || ''
            },
            geometry: {
                type: 'Polygon',
                coordinates: [p.coordinates]
            }
        }))
    };

    map.addSource('parcelas', { type: 'geojson', data: geojson });

    map.addLayer({
        id: 'parcelas-fill', type: 'fill', source: 'parcelas',
        paint: { 'fill-color': '#43A047', 'fill-opacity': 0.3 },
        layout: { 'visibility': 'none' }
    });

    map.addLayer({
        id: 'parcelas-line', type: 'line', source: 'parcelas',
        paint: { 'line-color': '#2E7D32', 'line-width': 2.5, 'line-dasharray': [4, 2] },
        layout: { 'visibility': 'none' }
    });

    map.addLayer({
        id: 'parcelas-label', type: 'symbol', source: 'parcelas',
        layout: {
            'text-field': ['concat', ['get', 'nombre'], '\n', ['to-string', ['get', 'superficie']], ' m\u00B2'],
            'text-size': 11,
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-allow-overlap': true,
            'visibility': 'none'
        },
        paint: { 'text-color': '#1B5E20', 'text-halo-color': '#ffffff', 'text-halo-width': 2 }
    });

    // Click popup
    map.on('click', 'parcelas-fill', (e) => {
        const props = e.features[0].properties;
        const superficie = typeof props.superficie === 'number' ? props.superficie : parseInt(props.superficie);
        const locale = currentLang === 'en' ? 'en-GB' : 'es-ES';
        const parcelName = currentLang === 'en' && props.nombre_en ? props.nombre_en : props.nombre;
        const parcelArea = currentLang === 'en' && props.areaNombre_en ? props.areaNombre_en : props.areaNombre;
        const parcelDesc = currentLang === 'en' && props.descripcion_en ? props.descripcion_en : props.descripcion;
        new maplibregl.Popup({ offset: 10, className: 'parcela-popup' })
            .setLngLat(e.lngLat)
            .setHTML(`
                <div class="parcela-popup-content">
                    <div class="parcela-popup-title">${parcelName}</div>
                    <div class="parcela-popup-area">${superficie.toLocaleString(locale)} m\u00B2</div>
                    <div class="parcela-popup-meta">${parcelArea}</div>
                    ${parcelDesc ? `<div class="parcela-popup-meta">${parcelDesc}</div>` : ''}
                    <div class="parcela-popup-badge">${t('available')}</div>
                </div>
            `)
            .addTo(map);
    });

    map.on('mouseenter', 'parcelas-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'parcelas-fill', () => { map.getCanvas().style.cursor = ''; });
}

function toggleParcelas() {
    parcelasVisible = !parcelasVisible;
    const vis = parcelasVisible ? 'visible' : 'none';
    ['parcelas-fill', 'parcelas-line', 'parcelas-label'].forEach(id => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
    });
    document.getElementById('btnParcelasFloat')?.classList.toggle('active', parcelasVisible);
}

// ============================================================
// FEATURE V3: PUNTOS DE ACCESO (DGT ROAD SIGNS)
// ============================================================

function addAccessPointMarkers() {
    removeAccessMarkers();
    if (!puntosAcceso || puntosAcceso.length === 0) return;

    puntosAcceso.forEach(acc => {
        const el = document.createElement('div');
        const cssClass = acc.vehiculos === 'pesados' ? 'pesados' : acc.vehiculos === 'ligeros' ? 'ligeros' : '';
        el.className = `access-marker ${cssClass}`;
        el.style.cssText = 'width:0;height:0;overflow:visible;';

        const vehiculoColor = acc.vehiculos === 'pesados' ? '#E65100' :
                              acc.vehiculos === 'ligeros' ? '#2E7D32' : '#005EB8';
        const vehiculoText = acc.vehiculos === 'pesados' ? t('heavyVehicles') :
                             acc.vehiculos === 'ligeros' ? t('lightVehicles') : t('allVehicles');
        const tipoText = acc.tipo === 'entrada' ? t('entrance') : acc.tipo === 'salida' ? t('exit') : t('entranceExit');

        // Vehicle type icon
        const vehicleIcon = acc.vehiculos === 'pesados'
            ? '<svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:white;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>'
            : acc.vehiculos === 'ligeros'
            ? '<svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:white;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>'
            : '<svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:white;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>';

        // Type badge: IN / OUT / IN-OUT
        const tipoBadge = acc.tipo === 'entrada' ? 'IN' : acc.tipo === 'salida' ? 'OUT' : 'IN/OUT';

        el.innerHTML = `
            <div class="access-marker-body">
                <div class="access-marker-icon">
                    ${vehicleIcon}
                </div>
            </div>
            <span class="access-marker-label">${tipoBadge}</span>
        `;

        const accName = currentLang === 'en' && acc.nombre_en ? acc.nombre_en : acc.nombre;
        const accDesc = currentLang === 'en' && acc.descripcion_en ? acc.descripcion_en : acc.descripcion;

        const popup = new maplibregl.Popup({ offset: [0, -24], closeButton: false })
            .setHTML(`
                <div style="font-family:'Inter',sans-serif;padding:4px 0">
                    <strong style="font-size:13px">${accName}</strong>
                    <div style="font-size:11px;color:#64748b;margin-top:4px">${accDesc}</div>
                    <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">
                        <span style="background:${vehiculoColor}15;color:${vehiculoColor};padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700">${vehiculoText}</span>
                        <span style="background:#f1f5f9;color:#475569;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:600">${tipoText}</span>
                    </div>
                </div>
            `);

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat(acc.coords)
            .setPopup(popup);

        accessMarkers.push(marker);
    });
}

function removeAccessMarkers() {
    accessMarkers.forEach(m => m.remove());
    accessMarkers = [];
}

function toggleAccessPoints() {
    accessPointsVisible = !accessPointsVisible;
    if (accessPointsVisible) {
        if (accessMarkers.length === 0) addAccessPointMarkers();
        accessMarkers.forEach(m => m.addTo(map));
    } else {
        accessMarkers.forEach(m => m.remove());
    }
    document.getElementById('btnAccessFloat')?.classList.toggle('active', accessPointsVisible);
}

// ============================================================
// FEATURE V3: TRANSPORTE CUSTOM (BUS + TREN DESDE GOOGLE EARTH)
// ============================================================

function addCustomTransportStops() {
    if (!paradasTransporte || paradasTransporte.length === 0) return;

    paradasTransporte.forEach(stop => {
        const el = document.createElement('div');
        el.className = `transport-marker ${stop.tipo}`;
        const svgIcon = stop.tipo === 'tren'
            ? `<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:white;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round">${ICON_PATHS.train}</svg>`
            : `<svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:white;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round">${ICON_PATHS.bus}</svg>`;
        el.style.cssText = 'width:0;height:0;overflow:visible;';

        const stopName = currentLang === 'en' && stop.nombre_en ? stop.nombre_en : stop.nombre;
        const stopFreq = currentLang === 'en' && stop.frecuencia_en ? stop.frecuencia_en : stop.frecuencia;
        const stopHorario = currentLang === 'en' && stop.horario_en ? stop.horario_en : stop.horario;

        el.innerHTML = `
            <div class="transport-marker-body">
                <div class="transport-marker-pin">
                    ${svgIcon}
                </div>
                <div class="transport-marker-stem"></div>
            </div>
            <span class="transport-marker-label">${stopName}</span>
        `;

        const popup = new maplibregl.Popup({ offset: [0, -52], closeButton: false })
            .setHTML(`
                <div style="font-family:'Inter',sans-serif;padding:4px 0">
                    <strong style="font-size:13px;color:${stop.tipo === 'tren' ? '#1565C0' : '#2E7D32'}">
                        ${stopName}
                    </strong>
                    <div style="font-size:11px;color:#64748b;margin-top:4px">
                        <strong>${t('operator')}:</strong> ${stop.operador}
                    </div>
                    <div style="font-size:11px;color:#64748b">
                        <strong>${t('lines')}:</strong> ${stop.lineas.join(', ')}
                    </div>
                    ${stopFreq ? `<div style="font-size:11px;color:#64748b"><strong>${t('frequency')}:</strong> ${stopFreq}</div>` : ''}
                    ${stopHorario ? `<div style="font-size:11px;color:#64748b"><strong>${t('schedule')}:</strong> ${stopHorario}</div>` : ''}
                </div>
            `);

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat(stop.coords)
            .setPopup(popup);

        transportMarkersCustom.push(marker);
    });
}

// Unified transport toggle: Overpass bus stops + custom stops
function toggleTransport() {
    busStopsVisible = !busStopsVisible;

    // Toggle Overpass bus stops layers
    const vis = busStopsVisible ? 'visible' : 'none';
    if (map.getLayer('bus-stop-points')) map.setLayoutProperty('bus-stop-points', 'visibility', vis);
    if (map.getLayer('bus-stop-labels')) map.setLayoutProperty('bus-stop-labels', 'visibility', vis);

    // Toggle custom transport markers
    if (busStopsVisible) {
        transportMarkersCustom.forEach(m => m.addTo(map));
    } else {
        transportMarkersCustom.forEach(m => m.remove());
    }

    document.getElementById('btnTransportFloat')?.classList.toggle('active', busStopsVisible);
}
