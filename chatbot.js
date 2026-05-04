// ============================================================
// ASISTENTE DE AYUDA - DIRECTORIO POLIGONOS SANTANDER
// 100% client-side, sin LLM, intent matching + búsqueda local.
// Depende de: empresas, areasIndustriales, SECTOR_COLORS, SECTOR_EMOJIS,
// t(), currentLang, Analytics, openDetailById, setAreaFilter,
// setSectorFilter, toggleSatellite, toggleStreetViewLayer, toggleTransport,
// toggleEVCharging, toggleParcelas, toggleAccessPoints, togglePOIs,
// toggleLanguage, escapeHTML
// ============================================================
(function() {
    'use strict';

    const STORAGE_KEY = 'chatbot_history';
    const MAX_HISTORY = 20;

    function norm(text) {
        return String(text || '')
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .toLowerCase().trim();
    }

    function safe(text) {
        if (typeof escapeHTML === 'function') return escapeHTML(String(text || ''));
        return String(text || '').replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }

    function tr(key) {
        if (typeof t === 'function') return t(key);
        return key;
    }

    const Chatbot = {
        state: { open: false, history: [], lastIntentId: null, started: false },

        // -------- INIT --------
        init() {
            this.restore();
            const launcher = document.getElementById('chatbotLauncherBtn');
            if (launcher) {
                launcher.addEventListener('click', () => this.toggle());
            }
            const overlay = document.getElementById('chatbotOverlay');
            if (overlay) {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) this.close();
                });
            }
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.state.open) this.close();
            });
            const form = document.getElementById('chatbotForm');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleSubmit();
                });
            }
        },

        // -------- OPEN / CLOSE --------
        toggle() { this.state.open ? this.close() : this.open(); },

        open() {
            const overlay = document.getElementById('chatbotOverlay');
            if (!overlay) return;
            overlay.classList.add('active');
            this.state.open = true;
            const btn = document.getElementById('chatbotLauncherBtn');
            if (btn) btn.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            this._lastFocused = document.activeElement;
            if (!this.state.started) {
                this.welcome();
                this.state.started = true;
            } else {
                this.renderAll();
            }
            setTimeout(() => {
                const input = document.getElementById('chatbotInput');
                if (input) input.focus();
            }, 100);
            try { Analytics && Analytics.track('chatbot_open'); } catch(e) {}
        },

        close() {
            const overlay = document.getElementById('chatbotOverlay');
            if (!overlay) return;
            overlay.classList.remove('active');
            this.state.open = false;
            const btn = document.getElementById('chatbotLauncherBtn');
            if (btn) btn.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
            if (this._lastFocused && this._lastFocused.focus) {
                try { this._lastFocused.focus(); } catch(e) {}
            }
        },

        // -------- WELCOME --------
        welcome() {
            this.pushBot(tr('chatbotWelcome'));
            this.renderQuickReplies(this.defaultChips());
        },

        defaultChips() {
            return [
                { id: 'what_is',          label: tr('chip_what_is') },
                { id: 'how_search',       label: tr('chip_how_search') },
                { id: 'list_areas',       label: tr('chip_list_areas') },
                { id: 'layers_satellite', label: tr('chip_satellite') },
                { id: 'register_company', label: tr('chip_register') },
                { id: 'faq_open',         label: tr('chip_faq') }
            ];
        },

        // -------- INPUT HANDLING --------
        handleSubmit() {
            const input = document.getElementById('chatbotInput');
            if (!input) return;
            const text = (input.value || '').trim();
            if (!text) return;
            input.value = '';
            this.pushUser(text);
            this.process(text);
        },

        process(text) {
            const intent = this.matchIntent(text);
            try {
                Analytics && Analytics.track('chatbot_query', {
                    intent: intent ? intent.id : 'unmatched',
                    query: text.slice(0, 80)
                });
            } catch(e) {}

            if (intent) {
                this.state.lastIntentId = intent.id;
                this.runIntent(intent);
                return;
            }

            const companies = this.findCompanies(text);
            if (companies.length) {
                this.pushBot(tr('chatbotMatchedCompanies').replace('{n}', companies.length));
                this.renderCompanyResults(companies);
                return;
            }

            const sector = this.findSector(text);
            if (sector) {
                this.renderSectorMatch(sector);
                return;
            }

            const area = this.findArea(text);
            if (area) {
                this.renderAreaMatch(area);
                return;
            }

            try { Analytics && Analytics.track('chatbot_unmatched', { query: text.slice(0, 80) }); } catch(e) {}
            this.pushBot(tr('chatbotFallback'));
            this.renderQuickReplies(this.defaultChips());
        },

        // -------- INTENT MATCHING --------
        matchIntent(text) {
            const normText = norm(text);
            for (const intent of CHATBOT_INTENTS) {
                const pats = intent.patterns[currentLang] || intent.patterns.es || [];
                for (const re of pats) {
                    if (re.test(normText)) return intent;
                }
            }
            return null;
        },

        runIntent(intent) {
            const out = intent.handler(this) || {};
            if (out.text) this.pushBot(out.text);
            if (out.link) this.appendLink(out.link);
            if (out.action) this.appendActionButton(out.action);
            if (out.list) this.appendList(out.list);
            if (out.chips) this.renderQuickReplies(out.chips);
            else this.renderQuickReplies([]);
        },

        // -------- COMPANY / SECTOR / AREA SEARCH --------
        findCompanies(text) {
            const q = norm(text);
            if (q.length < 2) return [];
            const tokens = q.split(/\s+/).filter(Boolean);
            const results = [];
            const list = (typeof empresas !== 'undefined') ? empresas : [];
            for (const e of list) {
                const nombre = norm(e.nombre);
                const actividad = norm(e.actividad || '');
                const desc = norm(e.descripcion || '');
                const cnae = norm(e.cnae || '');
                let score = 0;
                if (nombre.includes(q)) score += 10;
                for (const tok of tokens) {
                    if (tok.length < 3) continue;
                    if (nombre.includes(tok)) score += 5;
                    if (actividad.includes(tok)) score += 3;
                    if (desc.includes(tok)) score += 3;
                    if (cnae.includes(tok)) score += 2;
                }
                if (score >= 5) results.push({ e, score });
            }
            results.sort((a, b) => b.score - a.score);
            return results.slice(0, 5).map(r => r.e);
        },

        findSector(text) {
            const q = norm(text);
            if (q.length < 4) return null;
            const sectors = (typeof SECTOR_COLORS !== 'undefined') ? Object.keys(SECTOR_COLORS) : [];
            for (const s of sectors) {
                if (s === 'default') continue;
                if (norm(s).includes(q) || q.includes(norm(s))) return s;
            }
            return null;
        },

        findArea(text) {
            const q = norm(text);
            if (q.length < 4) return null;
            const list = (typeof areasIndustriales !== 'undefined') ? areasIndustriales : [];
            for (const a of list) {
                if (norm(a.nombre).includes(q) || norm(a.nombre_en || '').includes(q) ||
                    norm(a.id).includes(q) || q.includes(norm(a.id))) {
                    return a;
                }
            }
            return null;
        },

        // -------- RENDERERS --------
        renderCompanyResults(companies) {
            const container = document.getElementById('chatbotMessages');
            if (!container) return;
            const wrap = document.createElement('div');
            wrap.className = 'chat-bubble chat-bubble-bot chat-results-wrap';
            for (const e of companies) {
                const sectorEmoji = (typeof SECTOR_EMOJIS !== 'undefined' && SECTOR_EMOJIS[e.sector]) || '🏢';
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'chat-company-card';
                card.innerHTML = `
                    <span class="ccc-icon">${sectorEmoji}</span>
                    <span class="ccc-text">
                        <span class="ccc-name">${safe(e.nombre)}</span>
                        <span class="ccc-meta">${safe(e.sector || '')} · ${safe(e.area || '')}</span>
                    </span>
                    <span class="ccc-arrow">›</span>`;
                card.addEventListener('click', () => this.openDetail(e.id));
                wrap.appendChild(card);
            }
            container.appendChild(wrap);
            this.scrollDown();
            this.renderQuickReplies([
                { id: 'how_filter', label: tr('chip_how_filter') },
                { id: 'register_company', label: tr('chip_register') }
            ]);
        },

        renderSectorMatch(sector) {
            const list = (typeof empresas !== 'undefined') ? empresas : [];
            const count = list.filter(e => e.sector === sector).length;
            const emoji = (typeof SECTOR_EMOJIS !== 'undefined' && SECTOR_EMOJIS[sector]) || '🏢';
            const text = tr('chatbotMatchedSector')
                .replace('{emoji}', emoji)
                .replace('{sector}', sector)
                .replace('{n}', count);
            this.pushBot(text);
            this.appendActionButton({
                label: tr('chatbotApplyFilter'),
                fn: () => {
                    if (typeof setSectorFilter === 'function') setSectorFilter(sector);
                    try { Analytics && Analytics.track('chatbot_action', { action: 'apply_sector', sector }); } catch(e) {}
                    this.close();
                }
            });
        },

        renderAreaMatch(area) {
            const name = currentLang === 'en' ? (area.nombre_en || area.nombre) : area.nombre;
            const list = (typeof empresas !== 'undefined') ? empresas : [];
            const count = list.filter(e => e.areaId === area.id).length;
            const text = tr('chatbotMatchedArea')
                .replace('{area}', name)
                .replace('{n}', count);
            this.pushBot(text);
            this.appendActionButton({
                label: tr('chatbotApplyFilter'),
                fn: () => {
                    if (typeof setAreaFilter === 'function') setAreaFilter(area.id);
                    try { Analytics && Analytics.track('chatbot_action', { action: 'apply_area', area: area.id }); } catch(e) {}
                    this.close();
                }
            });
        },

        // -------- MESSAGE PRIMITIVES --------
        pushUser(text) {
            this.state.history.push({ role: 'user', text });
            this.appendBubble('user', safe(text));
            this.persist();
        },

        pushBot(text) {
            this.state.history.push({ role: 'bot', text });
            this.appendBubble('bot', this.renderInline(text));
            this.persist();
        },

        appendBubble(role, html) {
            const container = document.getElementById('chatbotMessages');
            if (!container) return;
            const div = document.createElement('div');
            div.className = 'chat-bubble chat-bubble-' + role;
            div.innerHTML = html;
            container.appendChild(div);
            this.scrollDown();
        },

        // Render markdown-lite: [text](url) → <a>, preserve line breaks
        renderInline(text) {
            const escaped = safe(text);
            return escaped
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g,
                    (_, label, url) => `<a href="${safe(url)}" class="chat-link" target="_blank" rel="noopener">${label}</a>`)
                .replace(/\n/g, '<br>');
        },

        appendLink(link) {
            const container = document.getElementById('chatbotMessages');
            if (!container) return;
            const wrap = document.createElement('div');
            wrap.className = 'chat-action-row';
            const a = document.createElement('a');
            a.href = link.url;
            a.target = '_blank';
            a.rel = 'noopener';
            a.className = 'chat-action-btn';
            a.textContent = link.label;
            a.addEventListener('click', () => {
                try { Analytics && Analytics.track('chatbot_action', { action: 'navigate', url: link.url }); } catch(e) {}
            });
            wrap.appendChild(a);
            container.appendChild(wrap);
            this.scrollDown();
        },

        appendActionButton(action) {
            const container = document.getElementById('chatbotMessages');
            if (!container) return;
            const wrap = document.createElement('div');
            wrap.className = 'chat-action-row';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'chat-action-btn';
            btn.textContent = action.label;
            btn.addEventListener('click', () => {
                if (typeof action.fn === 'function') action.fn();
            });
            wrap.appendChild(btn);
            container.appendChild(wrap);
            this.scrollDown();
        },

        appendList(items) {
            const container = document.getElementById('chatbotMessages');
            if (!container) return;
            const wrap = document.createElement('div');
            wrap.className = 'chat-list';
            for (const it of items) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'chat-list-item';
                btn.innerHTML = `<span class="cli-label">${safe(it.label)}</span>` +
                    (it.count != null ? `<span class="cli-count">${it.count}</span>` : '');
                btn.addEventListener('click', () => {
                    if (typeof it.fn === 'function') it.fn();
                });
                wrap.appendChild(btn);
            }
            container.appendChild(wrap);
            this.scrollDown();
        },

        renderQuickReplies(chips) {
            const container = document.getElementById('chatbotQuickReplies');
            if (!container) return;
            container.innerHTML = '';
            if (!chips || !chips.length) return;
            for (const chip of chips) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'chat-quick-reply';
                btn.textContent = chip.label;
                btn.addEventListener('click', () => {
                    this.pushUser(chip.label);
                    const intent = CHATBOT_INTENTS.find(i => i.id === chip.id);
                    if (intent) {
                        try { Analytics && Analytics.track('chatbot_query', { intent: intent.id, query: chip.label, source: 'chip' }); } catch(e) {}
                        this.runIntent(intent);
                    } else {
                        this.process(chip.label);
                    }
                });
                container.appendChild(btn);
            }
        },

        renderAll() {
            const container = document.getElementById('chatbotMessages');
            if (!container) return;
            container.innerHTML = '';
            for (const m of this.state.history) {
                this.appendBubble(m.role, m.role === 'bot' ? this.renderInline(m.text) : safe(m.text));
            }
            this.renderQuickReplies(this.defaultChips());
            this.scrollDown();
        },

        scrollDown() {
            const c = document.getElementById('chatbotMessages');
            if (c) c.scrollTop = c.scrollHeight;
        },

        // -------- ACTIONS --------
        openDetail(id) {
            try { Analytics && Analytics.track('chatbot_action', { action: 'open_detail', id }); } catch(e) {}
            this.close();
            if (typeof openDetailById === 'function') openDetailById(id);
        },

        // -------- PERSISTENCE --------
        persist() {
            try {
                const trimmed = this.state.history.slice(-MAX_HISTORY);
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                    history: trimmed,
                    started: this.state.started
                }));
            } catch(e) {}
        },

        restore() {
            try {
                const raw = sessionStorage.getItem(STORAGE_KEY);
                if (!raw) return;
                const data = JSON.parse(raw);
                if (Array.isArray(data.history)) this.state.history = data.history;
                if (data.started) this.state.started = true;
            } catch(e) {}
        },

        // -------- I18N HOOK --------
        applyTranslations() {
            // Static texts
            const titleEl = document.getElementById('chatbotTitle');
            if (titleEl) titleEl.textContent = tr('chatbotTitle');
            const subEl = document.getElementById('chatbotSub');
            if (subEl) subEl.textContent = tr('chatbotDisclaimer');
            const labelEl = document.getElementById('chatbotLauncherLabel');
            if (labelEl) labelEl.textContent = tr('chatbotOpenLabel');
            const inputEl = document.getElementById('chatbotInput');
            if (inputEl) inputEl.placeholder = tr('chatbotPlaceholder');
            // Re-render quick replies (default chips reflect language)
            if (this.state.open) this.renderQuickReplies(this.defaultChips());
        }
    };

    // ============================================================
    // INTENT KNOWLEDGE BASE
    // Patterns are tested against normalized (no-tildes lowercase) text.
    // ============================================================
    const CHATBOT_INTENTS = [
        {
            id: 'greeting',
            patterns: {
                es: [/^(hola|holi|buenas|buenos dias|buenas tardes|buenas noches|hey)\b/i],
                en: [/^(hi|hello|hey|good (morning|afternoon|evening))\b/i]
            },
            handler: () => ({
                text: tr('answer_greeting'),
                chips: Chatbot.defaultChips()
            })
        },
        {
            id: 'what_is',
            patterns: {
                es: [/(que|cual) es( esta)?( la)?( app|aplicacion|web|herramienta|directorio|pagina)/i,
                     /para que sirve/i, /que( es lo que)? hace/i, /de que va/i, /cual es el objetivo/i],
                en: [/what is( this)?( the)?( app|tool|website|directory|page)/i,
                     /what.*for/i, /what does this do/i, /what.*purpose/i]
            },
            handler: () => ({
                text: tr('answer_what_is'),
                chips: [
                    { id: 'how_search', label: tr('chip_how_search') },
                    { id: 'list_areas', label: tr('chip_list_areas') },
                    { id: 'register_company', label: tr('chip_register') },
                    { id: 'faq_open', label: tr('chip_faq') }
                ]
            })
        },
        {
            id: 'how_search',
            patterns: {
                es: [/como (busco|buscar|encuentro|encontrar)/i, /buscador/i, /busqueda/i],
                en: [/how (do i |to )?(search|find|look for)/i, /search bar/i]
            },
            handler: () => ({
                text: tr('answer_how_search'),
                chips: [
                    { id: 'how_filter', label: tr('chip_how_filter') },
                    { id: 'list_areas', label: tr('chip_list_areas') }
                ]
            })
        },
        {
            id: 'how_filter',
            patterns: {
                es: [/como (filtro|filtrar|aplico filtros)/i, /filtros?( por)?( sector| zona| poligono| area)?/i],
                en: [/how (do i |to )?filter/i, /apply filter/i]
            },
            handler: () => ({
                text: tr('answer_how_filter'),
                chips: [
                    { id: 'list_areas', label: tr('chip_list_areas') },
                    { id: 'how_search', label: tr('chip_how_search') }
                ]
            })
        },
        {
            id: 'list_areas',
            patterns: {
                es: [/(lista|cuales|que|listado).*(poligono|area|zona)/i,
                     /(poligono|area)s? (industriale|empresariale)/i,
                     /^(poligonos|areas|zonas)$/i],
                en: [/(list|which|what).*estate/i, /industrial (estates|areas)/i, /^(estates|areas|zones)$/i]
            },
            handler: () => {
                const list = (typeof areasIndustriales !== 'undefined') ? areasIndustriales : [];
                const empList = (typeof empresas !== 'undefined') ? empresas : [];
                return {
                    text: tr('answer_areas'),
                    list: list.map(a => ({
                        label: (currentLang === 'en' ? (a.nombre_en || a.nombre) : a.nombre),
                        count: empList.filter(e => e.areaId === a.id).length,
                        fn: () => {
                            if (typeof setAreaFilter === 'function') setAreaFilter(a.id);
                            try { Analytics && Analytics.track('chatbot_action', { action: 'apply_area', area: a.id }); } catch(e) {}
                            Chatbot.close();
                        }
                    }))
                };
            }
        },
        {
            id: 'layers_satellite',
            patterns: {
                es: [/satelite/i, /vista aerea/i, /foto aerea/i],
                en: [/satellite/i, /aerial view/i]
            },
            handler: () => ({
                text: tr('answer_satellite'),
                action: {
                    label: tr('chatbotApplyAction'),
                    fn: () => {
                        if (typeof toggleSatellite === 'function') toggleSatellite();
                        try { Analytics && Analytics.track('chatbot_action', { action: 'toggle_satellite' }); } catch(e) {}
                        Chatbot.close();
                    }
                }
            })
        },
        {
            id: 'layers_panoramas',
            patterns: {
                es: [/panorama|360|street view/i, /vista 360/i],
                en: [/panorama|360|street view/i]
            },
            handler: () => ({
                text: tr('answer_panoramas'),
                action: {
                    label: tr('chatbotApplyAction'),
                    fn: () => {
                        if (typeof toggleStreetViewLayer === 'function') toggleStreetViewLayer();
                        try { Analytics && Analytics.track('chatbot_action', { action: 'toggle_panoramas' }); } catch(e) {}
                        Chatbot.close();
                    }
                }
            })
        },
        {
            id: 'layers_transport',
            patterns: {
                es: [/transporte( publico)?|autobus|bus|parada de bus/i],
                en: [/public transport|bus stop|transit/i]
            },
            handler: () => ({
                text: tr('answer_transport'),
                action: {
                    label: tr('chatbotApplyAction'),
                    fn: () => {
                        if (typeof toggleTransport === 'function') toggleTransport();
                        try { Analytics && Analytics.track('chatbot_action', { action: 'toggle_transport' }); } catch(e) {}
                        Chatbot.close();
                    }
                }
            })
        },
        {
            id: 'layers_ev',
            patterns: {
                es: [/cargador(es)?( electricos?)?|punto(s)? de carga|coche electrico|ev/i,
                     /recarga( electrica)?/i],
                en: [/charger|charging point|ev|electric (car|vehicle)/i]
            },
            handler: () => ({
                text: tr('answer_ev'),
                action: {
                    label: tr('chatbotApplyAction'),
                    fn: () => {
                        if (typeof toggleEVCharging === 'function') toggleEVCharging();
                        try { Analytics && Analytics.track('chatbot_action', { action: 'toggle_ev' }); } catch(e) {}
                        Chatbot.close();
                    }
                }
            })
        },
        {
            id: 'layers_parcels',
            patterns: {
                es: [/parcela(s)?( libre| disponible)?|suelo industrial|nave (libre|disponible)/i],
                en: [/(free |available )?(plot|parcel|land)/i, /(free|available) (warehouse|building)/i]
            },
            handler: () => ({
                text: tr('answer_parcels'),
                action: {
                    label: tr('chatbotApplyAction'),
                    fn: () => {
                        if (typeof toggleParcelas === 'function') toggleParcelas();
                        try { Analytics && Analytics.track('chatbot_action', { action: 'toggle_parcels' }); } catch(e) {}
                        Chatbot.close();
                    }
                }
            })
        },
        {
            id: 'layers_access',
            patterns: {
                es: [/accesos?( por carretera)?|entrada(s)? al poligono|salida(s)?/i],
                en: [/access points?|road access|entrance|exit/i]
            },
            handler: () => ({
                text: tr('answer_access'),
                action: {
                    label: tr('chatbotApplyAction'),
                    fn: () => {
                        if (typeof toggleAccessPoints === 'function') toggleAccessPoints();
                        try { Analytics && Analytics.track('chatbot_action', { action: 'toggle_access' }); } catch(e) {}
                        Chatbot.close();
                    }
                }
            })
        },
        {
            id: 'layers_pois',
            patterns: {
                es: [/punto(s)? clave|punto(s)? de interes|pois|hospital|aeropuerto|puerto/i],
                en: [/key points?|points? of interest|poi|hospital|airport|port/i]
            },
            handler: () => ({
                text: tr('answer_pois'),
                action: {
                    label: tr('chatbotApplyAction'),
                    fn: () => {
                        if (typeof togglePOIs === 'function') togglePOIs();
                        try { Analytics && Analytics.track('chatbot_action', { action: 'toggle_pois' }); } catch(e) {}
                        Chatbot.close();
                    }
                }
            })
        },
        {
            id: 'register_company',
            patterns: {
                es: [/(añadir|agregar|alta|registrar|aparecer|incluir).*empresa/i,
                     /(actualizar|modificar|cambiar|corregir).*(datos|informacion|ficha)/i,
                     /soy (una )?empresa/i, /como salgo/i, /quiero salir en/i, /como aparezco/i],
                en: [/(add|register|include|list).*compan/i,
                     /(update|change|fix|edit).*(data|info|listing|details)/i,
                     /i('?m| am) a (compan|business)/i]
            },
            handler: () => ({
                text: tr('answer_register'),
                link: { url: 'formulario-empresas.html', label: tr('chatbotOpenForm') }
            })
        },
        {
            id: 'change_lang',
            patterns: {
                es: [/(cambiar|cambio).*idioma/i, /poner( lo)? en (espanol|ingles)/i, /idioma/i],
                en: [/change.*language/i, /switch to (spanish|english)/i, /^language$/i]
            },
            handler: () => ({
                text: tr('answer_lang'),
                action: {
                    label: tr('chatbotApplyAction'),
                    fn: () => {
                        if (typeof toggleLanguage === 'function') toggleLanguage();
                        try { Analytics && Analytics.track('chatbot_action', { action: 'toggle_lang' }); } catch(e) {}
                        Chatbot.applyTranslations();
                    }
                }
            })
        },
        {
            id: 'install_pwa',
            patterns: {
                es: [/(instalar|descargar|bajar).*app/i, /pwa/i, /usar sin internet|modo offline|sin conexion/i],
                en: [/install.*app/i, /pwa/i, /offline mode|use offline|no connection/i]
            },
            handler: () => ({
                text: tr('answer_install'),
                chips: [
                    { id: 'faq_open', label: tr('chip_faq') }
                ]
            })
        },
        {
            id: 'audio',
            patterns: {
                es: [/audio|spot|escuchar|voz|narracion|podcast/i],
                en: [/audio|spot|listen|voice|narration|podcast/i]
            },
            handler: () => ({
                text: tr('answer_audio')
            })
        },
        {
            id: 'contact',
            patterns: {
                es: [/contacto|email|correo|escribir|reportar|incidencia|error|fallo|bug|soporte|ayuda humana/i],
                en: [/contact|email|report|issue|bug|support|human help/i]
            },
            handler: () => ({
                text: tr('answer_contact'),
                link: { url: 'mailto:info@clotitec.com', label: 'info@clotitec.com' }
            })
        },
        {
            id: 'who',
            patterns: {
                es: [/quien (lo )?(hace|desarrolla|esta detras|gestiona)/i, /clotitec|ayuntamiento de santander/i,
                     /quien.*responsable/i],
                en: [/who (made|developed|runs|is behind)/i, /clotitec|santander city council/i]
            },
            handler: () => ({
                text: tr('answer_who'),
                chips: [{ id: 'faq_open', label: tr('chip_faq') }]
            })
        },
        {
            id: 'blurring',
            patterns: {
                es: [/blur(ring)?|difumin|pixel|cara(s)?|rostro(s)?|matricula(s)?|placa(s)?|anonimi/i],
                en: [/blur(ring)?|pixel|face(s)?|number plate|license plate|anonymi/i]
            },
            handler: () => ({
                text: tr('answer_blurring'),
                link: { url: 'preguntas-frecuentes.html', label: tr('chip_faq') }
            })
        },
        {
            id: 'privacy',
            patterns: {
                es: [/privacidad|cookies|datos personales|gdpr|rgpd|analitica/i],
                en: [/privacy|cookies|personal data|gdpr|analytics/i]
            },
            handler: () => ({
                text: tr('answer_privacy'),
                link: { url: 'politica-privacidad.html', label: tr('chip_privacy') }
            })
        },
        {
            id: 'faq_open',
            patterns: {
                es: [/(faq|preguntas frecuentes|mas ayuda|mas informacion|mas info|necesito ayuda)/i],
                en: [/(faq|frequently asked|more help|more info|i need help)/i]
            },
            handler: () => ({
                text: tr('answer_faq'),
                link: { url: 'preguntas-frecuentes.html', label: tr('chip_faq') }
            })
        },
        {
            id: 'thanks',
            patterns: {
                es: [/^(gracias|muchas gracias|mil gracias|perfecto|genial|ok|vale|adios|hasta luego)\b/i],
                en: [/^(thanks|thank you|cheers|great|ok|bye|goodbye)\b/i]
            },
            handler: () => ({ text: tr('answer_thanks') })
        }
    ];

    // Expose
    window.Chatbot = Chatbot;
    window.CHATBOT_INTENTS = CHATBOT_INTENTS;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Chatbot.init());
    } else {
        Chatbot.init();
    }
})();
