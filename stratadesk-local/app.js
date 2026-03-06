// StrataDesk - Standalone Application
// Data Storage and State Management

const STORAGE_KEY = 'stratadesk-borewells';
const DEFAULT_MATERIALS = [
    { name: 'Clay', color: '#8D6E63' },
    { name: 'Sand', color: '#E0C097' },
    { name: 'Kankar', color: '#A1887F' },
    { name: 'Sandy Kankar', color: '#BCAAA4' },
    { name: 'Gravel', color: '#9E9E9E' },
    { name: 'Rock', color: '#616161' },
    { name: 'Hard Rock', color: '#424242' },
    { name: 'Clay Kankar', color: '#6D4C41' }
];

let state = {
    borewells: [],
    activeBorewellId: null,
    pendingLatLng: null,
    sidebarOpen: true,
    viewMode: 'smooth'
};

// Load data from localStorage
function loadData() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            state.borewells = JSON.parse(data);
        }
    } catch (e) {
        console.error('Failed to load data:', e);
    }
}

// Save data to localStorage
function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.borewells));
    } catch (e) {
        console.error('Failed to save data:', e);
    }
}

// Get active borewell
function getActiveBorewell() {
    return state.borewells.find(b => b.id === state.activeBorewellId) || null;
}

// Create new borewell
function createBorewell(data) {
    const borewell = {
        id: generateId(),
        name: data.name || '',
        location: data.location || '',
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        diameter: data.diameter || 8,
        totalDepth: data.totalDepth || 0,
        notes: data.notes || '',
        layers: data.layers || [],
        selectedForCrossSection: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    return borewell;
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}


// Toast Notifications
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialize Map
let map, markers = {};
let searchTimeout = null;
let searchController = null;

function initMap() {
    map = L.map('map').setView([20.5937, 78.9629], 5);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19
    }).addTo(map);
    
    map.on('click', handleMapClick);
    
    // Initialize search
    initMapSearch();
}

// Map Search Functionality
function initMapSearch() {
    const searchInput = document.getElementById('mapSearch');
    const searchResults = document.getElementById('searchResults');
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length === 0) {
            searchResults.classList.remove('show');
            return;
        }
        
        if (query.length >= 3) {
            searchTimeout = setTimeout(() => performSearch(query), 500);
        }
    });
    
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchResults.classList.remove('show');
            searchInput.blur();
        }
    });
    
    // Close results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('show');
        }
    });
}

async function performSearch(query) {
    const searchInput = document.getElementById('mapSearch');
    const searchResults = document.getElementById('searchResults');
    
    searchInput.classList.add('loading');
    searchResults.innerHTML = '<div class="search-loading">🔍 Searching...</div>';
    searchResults.classList.add('show');
    
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
        );
        const results = await response.json();
        
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-empty">No locations found</div>';
        } else {
            displaySearchResults(results);
        }
    } catch (error) {
        searchResults.innerHTML = '<div class="search-error">Search failed. Please try again.</div>';
        console.error('Search error:', error);
    } finally {
        searchInput.classList.remove('loading');
    }
}

function displaySearchResults(results) {
    const searchResults = document.getElementById('searchResults');
    
    searchResults.innerHTML = results.map((result, index) => `
        <div class="search-result-item" data-index="${index}" onclick="selectSearchResult(${index})">
            <div class="search-result-name">${result.display_name.split(',')[0]}</div>
            <div class="search-result-details">${result.display_name}</div>
        </div>
    `).join('');
    
    // Store results for selection
    searchResults.dataset.results = JSON.stringify(results);
    
    // Keyboard navigation
    const items = searchResults.querySelectorAll('.search-result-item');
    let activeIndex = -1;
    
    document.getElementById('mapSearch').addEventListener('keydown', function handler(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, items.length - 1);
            updateActiveItem();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, -1);
            updateActiveItem();
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            selectSearchResult(activeIndex);
        }
    });
    
    function updateActiveItem() {
        items.forEach((item, idx) => {
            item.classList.toggle('active', idx === activeIndex);
        });
        if (activeIndex >= 0) {
            items[activeIndex].scrollIntoView({ block: 'nearest' });
        }
    }
}

function selectSearchResult(index) {
    const searchResults = document.getElementById('searchResults');
    const results = JSON.parse(searchResults.dataset.results || '[]');
    const result = results[index];
    
    if (!result) return;
    
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    // Fly to location
    map.flyTo([lat, lng], 14, {
        duration: 1.5
    });
    
    // Set location in form
    document.getElementById('location').value = result.display_name;
    document.getElementById('latitude').value = lat.toFixed(6);
    document.getElementById('longitude').value = lng.toFixed(6);
    
    // Clear search
    document.getElementById('mapSearch').value = '';
    searchResults.classList.remove('show');
    
    // Update pending location
    state.pendingLatLng = { lat, lng };
    
    showToast(`Location selected: ${result.display_name.split(',')[0]}`, 'success');
}

async function handleMapClick(e) {
    const { lat, lng } = e.latlng;
    state.pendingLatLng = { lat, lng };
    state.activeBorewellId = null;
    
    // Reverse geocode
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        document.getElementById('location').value = data.display_name || '';
    } catch (e) {
        console.error('Geocoding failed:', e);
    }
    
    document.getElementById('latitude').value = lat.toFixed(6);
    document.getElementById('longitude').value = lng.toFixed(6);
    updateUI();
}

function addMarker(borewell) {
    const isActive = borewell.id === state.activeBorewellId;
    const color = isActive ? 'hsl(38,42%,60%)' : 'hsl(196,65%,33%)';
    const size = isActive ? 28 : 24;
    
    const icon = L.divIcon({
        html: `<svg width="${size}" height="${size + 12}" viewBox="0 0 24 36" style="${isActive ? 'filter: drop-shadow(0 0 6px hsl(38,42%,60%))' : ''}">
            <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}"/>
            <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
        </svg>`,
        iconSize: [size, size + 12],
        iconAnchor: [size / 2, size + 12],
        popupAnchor: [0, -(size + 12)]
    });
    
    const marker = L.marker([borewell.latitude, borewell.longitude], { icon })
        .addTo(map)
        .bindPopup(createPopupContent(borewell));
    
    marker.on('click', () => {
        state.activeBorewellId = borewell.id;
        state.pendingLatLng = null;
        updateUI();
    });
    
    markers[borewell.id] = marker;
}

function createPopupContent(borewell) {
    return `
        <div style="min-width: 140px; font-size: 0.875rem;">
            <p style="font-weight: 600; margin-bottom: 0.25rem;">${borewell.name || 'Unnamed'}</p>
            <p style="font-size: 0.75rem; opacity: 0.7;">Depth: ${borewell.totalDepth} ft</p>
            <label style="display: flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; margin-top: 0.5rem; cursor: pointer;">
                <input type="checkbox" ${borewell.selectedForCrossSection ? 'checked' : ''} 
                    onchange="toggleCrossSection('${borewell.id}')">
                Cross-section
            </label>
        </div>
    `;
}

function toggleCrossSection(id) {
    const borewell = state.borewells.find(b => b.id === id);
    if (borewell) {
        borewell.selectedForCrossSection = !borewell.selectedForCrossSection;
        saveData();
        updateCrossSection();
    }
}

function updateMarkers() {
    // Remove old markers
    Object.values(markers).forEach(m => m.remove());
    markers = {};
    
    // Add new markers
    state.borewells.forEach(b => {
        if (b.latitude && b.longitude) {
            addMarker(b);
        }
    });
}


// Form Handling
function updateForm() {
    const borewell = getActiveBorewell();
    const isNew = !borewell;
    
    document.getElementById('formTitle').textContent = isNew ? 'NEW BOREWELL' : 'EDIT BOREWELL';
    document.getElementById('borewellName').value = borewell?.name || '';
    document.getElementById('location').value = borewell?.location || '';
    document.getElementById('latitude').value = borewell?.latitude || state.pendingLatLng?.lat || '';
    document.getElementById('longitude').value = borewell?.longitude || state.pendingLatLng?.lng || '';
    document.getElementById('diameter').value = borewell?.diameter || 8;
    document.getElementById('totalDepth').value = borewell?.totalDepth || '';
    document.getElementById('notes').value = borewell?.notes || '';
    
    document.getElementById('deleteBorewell').style.display = isNew ? 'none' : 'inline-flex';
    
    checkDepthMismatch();
}

function checkDepthMismatch() {
    const borewell = getActiveBorewell();
    const totalDepth = parseFloat(document.getElementById('totalDepth').value) || 0;
    
    if (borewell && borewell.layers.length > 0 && totalDepth > 0) {
        const deepestEnd = Math.max(...borewell.layers.map(l => l.endDepth));
        if (deepestEnd !== totalDepth) {
            document.getElementById('depthWarning').style.display = 'flex';
            document.getElementById('warningText').textContent = 
                `Deepest layer (${deepestEnd} ft) ≠ total depth (${totalDepth} ft)`;
            return;
        }
    }
    
    document.getElementById('depthWarning').style.display = 'none';
}

function saveBorewell() {
    const name = document.getElementById('borewellName').value.trim();
    const totalDepth = parseFloat(document.getElementById('totalDepth').value) || 0;
    
    if (!name) {
        showToast('Borewell name is required', 'error');
        return;
    }
    
    if (totalDepth <= 0) {
        showToast('Total depth must be greater than 0', 'error');
        return;
    }
    
    const data = {
        name,
        location: document.getElementById('location').value,
        latitude: parseFloat(document.getElementById('latitude').value) || 0,
        longitude: parseFloat(document.getElementById('longitude').value) || 0,
        diameter: parseInt(document.getElementById('diameter').value) || 8,
        totalDepth,
        notes: document.getElementById('notes').value
    };
    
    const existing = getActiveBorewell();
    if (existing) {
        Object.assign(existing, data, { updatedAt: new Date().toISOString() });
    } else {
        const newBorewell = createBorewell(data);
        state.borewells.push(newBorewell);
        state.activeBorewellId = newBorewell.id;
    }
    
    state.pendingLatLng = null;
    saveData();
    showToast('Borewell saved', 'success');
    updateUI();
}

function deleteBorewell() {
    if (!state.activeBorewellId) return;
    
    if (confirm('Delete this borewell?')) {
        state.borewells = state.borewells.filter(b => b.id !== state.activeBorewellId);
        state.activeBorewellId = null;
        saveData();
        showToast('Borewell deleted', 'success');
        updateUI();
    }
}


// Layers Table
function updateLayersTable() {
    const borewell = getActiveBorewell();
    const section = document.getElementById('layersSection');
    const uploadSection = document.getElementById('uploadSection');
    const uploadSeparator = document.getElementById('uploadSeparator');
    
    if (!borewell) {
        section.style.display = 'none';
        uploadSection.style.display = 'none';
        uploadSeparator.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    uploadSection.style.display = 'block';
    uploadSeparator.style.display = 'block';
    
    const container = document.getElementById('layersTable');
    const layers = borewell.layers || [];
    
    if (layers.length === 0) {
        container.innerHTML = '<p class="empty-layers">No layers yet. Click "Add" to begin.</p>';
        document.getElementById('overlapWarning').style.display = 'none';
        return;
    }
    
    const hasOverlap = checkOverlap(layers);
    document.getElementById('overlapWarning').style.display = hasOverlap ? 'block' : 'none';
    
    const table = document.createElement('table');
    table.className = 'layers-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Start</th>
                <th>End</th>
                <th>Material</th>
                <th style="width: 24px;"></th>
                <th style="width: 24px;"></th>
            </tr>
        </thead>
        <tbody>
            ${layers.map((layer, i) => {
                const isOverlap = i > 0 && layer.startDepth < layers[i - 1].endDepth;
                return `
                    <tr class="${isOverlap ? 'overlap' : ''}">
                        <td>
                            <span class="layer-depth" onclick="editDepth('${layer.id}', 'startDepth', ${layer.startDepth})">
                                ${layer.startDepth}
                            </span>
                        </td>
                        <td>
                            <span class="layer-depth" onclick="editDepth('${layer.id}', 'endDepth', ${layer.endDepth})">
                                ${layer.endDepth}
                            </span>
                        </td>
                        <td>
                            <select class="material-select" onchange="updateMaterial('${layer.id}', this.value)">
                                ${DEFAULT_MATERIALS.map(m => `
                                    <option value="${m.name}" ${m.name === layer.material ? 'selected' : ''}>
                                        ${m.name}
                                    </option>
                                `).join('')}
                            </select>
                        </td>
                        <td>
                            <div class="color-swatch" style="background: ${layer.color};"></div>
                        </td>
                        <td>
                            <button class="delete-layer" onclick="deleteLayer('${layer.id}')">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;
    
    container.innerHTML = '';
    container.appendChild(table);
}

function checkOverlap(layers) {
    const sorted = [...layers].sort((a, b) => a.startDepth - b.startDepth);
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].startDepth < sorted[i - 1].endDepth) return true;
    }
    return false;
}

function addLayer() {
    const borewell = getActiveBorewell();
    if (!borewell) return;
    
    const lastEnd = borewell.layers.length > 0 
        ? Math.max(...borewell.layers.map(l => l.endDepth)) 
        : 0;
    
    const newLayer = {
        id: generateId(),
        startDepth: lastEnd,
        endDepth: lastEnd,
        material: DEFAULT_MATERIALS[0].name,
        color: DEFAULT_MATERIALS[0].color
    };
    
    borewell.layers.push(newLayer);
    borewell.layers.sort((a, b) => a.startDepth - b.startDepth);
    borewell.updatedAt = new Date().toISOString();
    
    saveData();
    updateUI();
}

function deleteLayer(id) {
    const borewell = getActiveBorewell();
    if (!borewell) return;
    
    borewell.layers = borewell.layers.filter(l => l.id !== id);
    borewell.updatedAt = new Date().toISOString();
    
    saveData();
    updateUI();
}

function editDepth(layerId, field, currentValue) {
    const newValue = prompt(`Enter ${field}:`, currentValue);
    if (newValue === null) return;
    
    const value = parseFloat(newValue);
    if (isNaN(value)) {
        showToast('Invalid number', 'error');
        return;
    }
    
    const borewell = getActiveBorewell();
    const layer = borewell.layers.find(l => l.id === layerId);
    if (layer) {
        layer[field] = value;
        borewell.layers.sort((a, b) => a.startDepth - b.startDepth);
        
        if (checkOverlap(borewell.layers)) {
            showToast('Layer depth overlap detected!', 'error');
        }
        
        borewell.updatedAt = new Date().toISOString();
        saveData();
        updateUI();
    }
}

function updateMaterial(layerId, materialName) {
    const borewell = getActiveBorewell();
    const layer = borewell.layers.find(l => l.id === layerId);
    const material = DEFAULT_MATERIALS.find(m => m.name === materialName);
    
    if (layer && material) {
        layer.material = material.name;
        layer.color = material.color;
        borewell.updatedAt = new Date().toISOString();
        saveData();
        updateUI();
    }
}

function autoCloseDepth() {
    const borewell = getActiveBorewell();
    if (!borewell || borewell.layers.length === 0 || borewell.totalDepth <= 0) return;
    
    const sorted = [...borewell.layers].sort((a, b) => a.startDepth - b.startDepth);
    sorted[sorted.length - 1].endDepth = borewell.totalDepth;
    borewell.layers = sorted;
    borewell.updatedAt = new Date().toISOString();
    
    saveData();
    showToast('Last layer closed to total depth', 'success');
    updateUI();
}


// Strata Chart Rendering
function renderStrataChart() {
    const borewell = getActiveBorewell();
    const panel = document.getElementById('chartPanel');
    const container = document.getElementById('chartContainer');
    
    if (!borewell || borewell.layers.length === 0) {
        panel.style.display = 'none';
        return;
    }
    
    panel.style.display = 'block';
    document.getElementById('chartTitle').textContent = `${borewell.name || 'Borewell'} — Strata`;
    
    const width = 220;
    const height = 600;
    const labelMargin = 45;
    const barWidth = 100;
    const barX = labelMargin + 10;
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height + 20);
    
    // Defs
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // Noise filter
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'noise');
    filter.innerHTML = `
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" result="noise"/>
        <feComposite in="noise" in2="SourceGraphic" operator="in" result="clipped"/>
        <feBlend in="SourceGraphic" in2="clipped" mode="overlay"/>
    `;
    defs.appendChild(filter);
    
    // Gradients
    borewell.layers.forEach(layer => {
        const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        grad.setAttribute('id', `grad-${layer.id}`);
        grad.setAttribute('x1', '0');
        grad.setAttribute('y1', '0');
        grad.setAttribute('x2', '0');
        grad.setAttribute('y2', '1');
        grad.innerHTML = `
            <stop offset="0%" stop-color="${lightenColor(layer.color, 30)}"/>
            <stop offset="100%" stop-color="${darkenColor(layer.color, 20)}"/>
        `;
        defs.appendChild(grad);
    });
    
    svg.appendChild(defs);
    
    // Depth axis
    const depthTicks = generateDepthTicks(borewell.totalDepth);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', labelMargin);
    line.setAttribute('y1', 0);
    line.setAttribute('x2', labelMargin);
    line.setAttribute('y2', height);
    line.setAttribute('stroke', 'hsl(200,15%,25%)');
    line.setAttribute('stroke-width', 1);
    svg.appendChild(line);
    
    depthTicks.forEach(d => {
        const y = (d / borewell.totalDepth) * height;
        
        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tick.setAttribute('x1', labelMargin - 4);
        tick.setAttribute('y1', y);
        tick.setAttribute('x2', labelMargin);
        tick.setAttribute('y2', y);
        tick.setAttribute('stroke', 'hsl(200,15%,35%)');
        tick.setAttribute('stroke-width', 1);
        svg.appendChild(tick);
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', labelMargin - 6);
        text.setAttribute('y', y + 3);
        text.setAttribute('text-anchor', 'end');
        text.setAttribute('fill', 'hsl(200,15%,60%)');
        text.setAttribute('font-size', 9);
        text.textContent = d.toFixed(0);
        svg.appendChild(text);
    });
    
    // Layers
    borewell.layers.forEach((layer, i) => {
        const yStart = (layer.startDepth / borewell.totalDepth) * height;
        const yEnd = (layer.endDepth / borewell.totalDepth) * height;
        const h = Math.max(yEnd - yStart, 2);
        
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'strata-layer-animate');
        g.style.animationDelay = `${i * 0.08}s`;
        
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', barX);
        rect.setAttribute('y', yStart);
        rect.setAttribute('width', barWidth);
        rect.setAttribute('height', h);
        rect.setAttribute('fill', `url(#grad-${layer.id})`);
        rect.setAttribute('rx', 1);
        rect.setAttribute('filter', 'url(#noise)');
        rect.setAttribute('opacity', 0.92);
        g.appendChild(rect);
        
        if (i > 0) {
            const divider = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            divider.setAttribute('x1', barX);
            divider.setAttribute('y1', yStart);
            divider.setAttribute('x2', barX + barWidth);
            divider.setAttribute('y2', yStart);
            divider.setAttribute('stroke', 'rgba(0,0,0,0.2)');
            divider.setAttribute('stroke-width', 1);
            g.appendChild(divider);
        }
        
        if (h > 14) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', barX + barWidth / 2);
            text.setAttribute('y', yStart + h / 2 + 3);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', 'white');
            text.setAttribute('font-size', 10);
            text.setAttribute('font-weight', 500);
            text.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
            text.textContent = layer.material;
            g.appendChild(text);
        }
        
        const depthLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        depthLabel.setAttribute('x', barX + barWidth + 6);
        depthLabel.setAttribute('y', yStart + h / 2 + 3);
        depthLabel.setAttribute('fill', 'hsl(200,15%,55%)');
        depthLabel.setAttribute('font-size', 8);
        depthLabel.textContent = `${layer.startDepth}–${layer.endDepth} ft`;
        g.appendChild(depthLabel);
        
        svg.appendChild(g);
    });
    
    container.innerHTML = '';
    container.appendChild(svg);
}

function lightenColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `rgb(${r},${g},${b})`;
}

function darkenColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((num >> 16) & 0xff) - amount);
    const g = Math.max(0, ((num >> 8) & 0xff) - amount);
    const b = Math.max(0, (num & 0xff) - amount);
    return `rgb(${r},${g},${b})`;
}

function generateDepthTicks(totalDepth) {
    if (!totalDepth) return [];
    const step = totalDepth <= 50 ? 5 : totalDepth <= 200 ? 10 : 25;
    const ticks = [0];
    for (let d = step; d < totalDepth; d += step) {
        ticks.push(d);
    }
    ticks.push(totalDepth);
    return ticks;
}


// Cross-Section View
function updateCrossSection() {
    const selected = state.borewells.filter(b => b.selectedForCrossSection && b.layers.length > 0);
    const container = document.getElementById('crossSectionContainer');
    
    if (selected.length < 2) {
        container.innerHTML = '<div class="empty-state">Select 2+ borewells on the map (checkbox in popup) to view cross-section</div>';
        return;
    }
    
    const maxDepth = Math.max(...selected.map(b => b.totalDepth));
    const svgWidth = Math.max(800, selected.length * 200 + 100);
    const svgHeight = 600;
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', svgWidth);
    svg.setAttribute('height', svgHeight);
    svg.style.minWidth = svgWidth + 'px';
    svg.style.minHeight = svgHeight + 'px';
    
    // Defs
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'noise-cs');
    filter.innerHTML = `
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4"/>
        <feColorMatrix type="saturate" values="0"/>
        <feBlend mode="multiply" in="SourceGraphic"/>
    `;
    defs.appendChild(filter);
    svg.appendChild(defs);
    
    const depthScale = (depth) => (depth / maxDepth) * (svgHeight - 100) + 50;
    const xPosition = (index) => 100 + index * 200;
    
    // Depth axis
    const axisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    axisLine.setAttribute('x1', 50);
    axisLine.setAttribute('y1', 50);
    axisLine.setAttribute('x2', 50);
    axisLine.setAttribute('y2', svgHeight - 50);
    axisLine.setAttribute('stroke', 'hsl(var(--muted-foreground))');
    axisLine.setAttribute('stroke-width', 1);
    svg.appendChild(axisLine);
    
    for (let i = 0; i <= 10; i++) {
        const depth = (maxDepth / 10) * i;
        const y = depthScale(depth);
        
        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tick.setAttribute('x1', 45);
        tick.setAttribute('y1', y);
        tick.setAttribute('x2', 50);
        tick.setAttribute('y2', y);
        tick.setAttribute('stroke', 'hsl(var(--muted-foreground))');
        tick.setAttribute('stroke-width', 1);
        svg.appendChild(tick);
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', 40);
        text.setAttribute('y', y + 4);
        text.setAttribute('text-anchor', 'end');
        text.setAttribute('font-size', 10);
        text.setAttribute('fill', 'hsl(var(--muted-foreground))');
        text.textContent = depth.toFixed(0) + ' ft';
        svg.appendChild(text);
    }
    
    // Bezier paths (smooth mode)
    if (state.viewMode === 'smooth') {
        for (let i = 0; i < selected.length - 1; i++) {
            const bwA = selected[i];
            const bwB = selected[i + 1];
            const x1 = xPosition(i);
            const x2 = xPosition(i + 1);
            
            bwA.layers.forEach(layerA => {
                bwB.layers.forEach(layerB => {
                    const materialMatch = layerA.material.toLowerCase().trim() === layerB.material.toLowerCase().trim();
                    const depthMatch = Math.abs(layerA.startDepth - layerB.startDepth) <= 2 && 
                                      Math.abs(layerA.endDepth - layerB.endDepth) <= 2;
                    
                    if (materialMatch || depthMatch) {
                        const y1Start = depthScale(layerA.startDepth);
                        const y1End = depthScale(layerA.endDepth);
                        const y2Start = depthScale(layerB.startDepth);
                        const y2End = depthScale(layerB.endDepth);
                        const midX = (x1 + x2) / 2;
                        
                        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        path.setAttribute('d', `
                            M ${x1} ${y1Start}
                            L ${x1} ${y1End}
                            C ${midX} ${y1End}, ${midX} ${y2End}, ${x2} ${y2End}
                            L ${x2} ${y2Start}
                            C ${midX} ${y2Start}, ${midX} ${y1Start}, ${x1} ${y1Start}
                            Z
                        `);
                        path.setAttribute('fill', layerA.color);
                        path.setAttribute('fill-opacity', materialMatch ? 0.85 : 0.6);
                        path.setAttribute('stroke', 'none');
                        svg.appendChild(path);
                    }
                });
            });
        }
    }
    
    // Individual borewell columns
    selected.forEach((bw, idx) => {
        const x = xPosition(idx);
        
        // Name
        const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        nameText.setAttribute('x', x);
        nameText.setAttribute('y', 30);
        nameText.setAttribute('text-anchor', 'middle');
        nameText.setAttribute('font-size', 12);
        nameText.setAttribute('font-weight', 600);
        nameText.setAttribute('fill', 'hsl(var(--foreground))');
        nameText.textContent = bw.name || `Borewell ${idx + 1}`;
        svg.appendChild(nameText);
        
        // Layers
        bw.layers.forEach(layer => {
            const yStart = depthScale(layer.startDepth);
            const yEnd = depthScale(layer.endDepth);
            const height = yEnd - yStart;
            
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            
            const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
            grad.setAttribute('id', `grad-cs-${layer.id}`);
            grad.setAttribute('x1', '0%');
            grad.setAttribute('y1', '0%');
            grad.setAttribute('x2', '0%');
            grad.setAttribute('y2', '100%');
            grad.innerHTML = `
                <stop offset="0%" stop-color="${layer.color}" stop-opacity="1"/>
                <stop offset="100%" stop-color="${layer.color}" stop-opacity="0.7"/>
            `;
            defs.appendChild(grad);
            
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x - 40);
            rect.setAttribute('y', yStart);
            rect.setAttribute('width', 80);
            rect.setAttribute('height', height);
            rect.setAttribute('fill', `url(#grad-cs-${layer.id})`);
            rect.setAttribute('stroke', 'rgba(0,0,0,0.2)');
            rect.setAttribute('stroke-width', 1);
            rect.setAttribute('filter', 'url(#noise-cs)');
            g.appendChild(rect);
            
            if (height > 20) {
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', x);
                text.setAttribute('y', yStart + height / 2 + 4);
                text.setAttribute('text-anchor', 'middle');
                text.setAttribute('font-size', 9);
                text.setAttribute('fill', 'white');
                text.setAttribute('font-weight', 500);
                text.textContent = layer.material;
                g.appendChild(text);
            }
            
            svg.appendChild(g);
        });
    });
    
    container.innerHTML = '';
    container.appendChild(svg);
}


// File Upload and Parsing
let previewLayers = [];

function handleFileUpload(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext === 'xlsx' || ext === 'xls') {
        parseExcel(file);
    } else if (ext === 'pdf') {
        parsePDF(file);
    } else {
        showToast('Unsupported file type. Please upload .xlsx, .xls, or .pdf', 'error');
    }
}

function parseExcel(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
            
            console.log('Excel rows:', rows.slice(0, 15)); // Debug: show first 15 rows
            
            // Enhanced header detection with more patterns
            let headerIdx = -1;
            const headerPatterns = /from|to|depth|start|end|lithology|strata|material|description|layer|soil|type|formation|s\.?no|sr\.?no|serial/i;
            
            for (let i = 0; i < Math.min(15, rows.length); i++) {
                if (!rows[i] || rows[i].length === 0) continue;
                
                const cellsWithHeaders = rows[i].filter(cell => {
                    const cellStr = String(cell).trim();
                    return cellStr && headerPatterns.test(cellStr);
                }).length;
                
                // Need at least 2 matching headers
                if (cellsWithHeaders >= 2) {
                    headerIdx = i;
                    console.log('Found header at row:', i, rows[i]);
                    break;
                }
            }
            
            if (headerIdx === -1) {
                // Try alternative: look for numeric patterns in first 3 columns
                console.log('No headers found, trying numeric pattern detection...');
                for (let i = 0; i < Math.min(15, rows.length); i++) {
                    if (!rows[i] || rows[i].length < 3) continue;
                    
                    // Check if row has numbers in first few columns (likely data row)
                    const hasNumbers = rows[i].slice(0, 3).filter(cell => {
                        const num = parseFloat(String(cell).replace(/[^\d.]/g, ''));
                        return !isNaN(num) && num >= 0;
                    }).length >= 2;
                    
                    if (hasNumbers) {
                        headerIdx = Math.max(0, i - 1); // Header is likely one row before
                        console.log('Detected data at row', i, ', assuming header at', headerIdx);
                        break;
                    }
                }
            }
            
            if (headerIdx === -1) {
                showToast('Could not find header row. Trying to parse without headers...', 'warning');
                headerIdx = 0; // Start from beginning
            }
            
            const headers = rows[headerIdx].map(h => String(h).toLowerCase().trim());
            console.log('Headers:', headers);
            console.log('Header row full:', rows[headerIdx]);
            
            // Enhanced column detection with more patterns
            let fromIdx = headers.findIndex(h => /from|start|top|upper/i.test(h));
            let toIdx = headers.findIndex(h => /to|end|bottom|lower/i.test(h));
            let materialIdx = headers.findIndex(h => /lithology|strata|material|description|layer|soil|type|formation|encountered/i.test(h));
            
            console.log('Initial detection - From:', fromIdx, 'To:', toIdx, 'Material:', materialIdx);
            
            // If not found by name, try by position (common patterns)
            if (fromIdx === -1 || toIdx === -1 || materialIdx === -1) {
                console.log('Trying positional detection...');
                
                // Common pattern: S.No | From | To | Material
                // Or: From | To | Material
                for (let i = headerIdx + 1; i < Math.min(headerIdx + 5, rows.length); i++) {
                    const row = rows[i];
                    if (!row || row.length < 3) continue;
                    
                    // Try to find numeric columns
                    for (let col = 0; col < row.length - 2; col++) {
                        const val1 = parseFloat(String(row[col]).replace(/[^\d.]/g, ''));
                        const val2 = parseFloat(String(row[col + 1]).replace(/[^\d.]/g, ''));
                        const val3 = String(row[col + 2]).trim();
                        
                        if (!isNaN(val1) && !isNaN(val2) && val3 && val3.length > 1 && isNaN(parseFloat(val3))) {
                            fromIdx = col;
                            toIdx = col + 1;
                            materialIdx = col + 2;
                            console.log('Found columns by pattern:', fromIdx, toIdx, materialIdx);
                            break;
                        }
                    }
                    if (fromIdx !== -1) break;
                }
            }
            
            if (fromIdx === -1 || toIdx === -1 || materialIdx === -1) {
                showToast('Could not identify depth and material columns. Please check file format.', 'error');
                console.error('Column detection failed. Headers:', headers);
                return;
            }
            
            console.log('Using columns - From:', fromIdx, 'To:', toIdx, 'Material:', materialIdx);
            
            const layers = [];
            let totalConfidence = 0;
            let validRows = 0;
            
            for (let i = headerIdx + 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;
                
                // Skip rows that are clearly not data (all empty or headers repeated)
                const nonEmpty = row.filter(cell => cell && String(cell).trim()).length;
                if (nonEmpty === 0) continue;
                
                const startDepthStr = String(row[fromIdx] || '').trim();
                const endDepthStr = String(row[toIdx] || '').trim();
                const materialStr = String(row[materialIdx] || '').trim();
                
                console.log(`Row ${i}: From="${startDepthStr}" To="${endDepthStr}" Material="${materialStr}"`);
                
                // Extract numbers, handling formats like "0-5", "5.5", "5 m", etc.
                const startDepth = parseFloat(startDepthStr.replace(/[^\d.]/g, ''));
                const endDepth = parseFloat(endDepthStr.replace(/[^\d.]/g, ''));
                
                // Clean material name
                const material = materialStr
                    .replace(/[^\w\s-]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                if (!isNaN(startDepth) && !isNaN(endDepth) && material && material.length > 1) {
                    // Skip if material is just numbers
                    if (/^\d+$/.test(material)) continue;
                    
                    // Calculate confidence based on data quality
                    let confidence = 0.7; // Base confidence for Excel
                    
                    // Good material name
                    if (material.length > 3 && !/^\d+$/.test(material)) {
                        confidence += 0.1;
                    }
                    
                    // Valid depth range
                    if (endDepth > startDepth && (endDepth - startDepth) < 1000) {
                        confidence += 0.1;
                    }
                    
                    // Sequential depths
                    if (layers.length > 0) {
                        const prevLayer = layers[layers.length - 1];
                        if (Math.abs(startDepth - prevLayer.endDepth) < 2) {
                            confidence += 0.1;
                        }
                    }
                    
                    totalConfidence += confidence;
                    validRows++;
                    
                    layers.push({
                        id: generateId(),
                        startDepth,
                        endDepth,
                        material,
                        color: getColorForMaterial(material),
                        confidence
                    });
                    
                    console.log('Added layer:', startDepth, '-', endDepth, material);
                }
            }
            
            if (layers.length === 0) {
                showToast('No valid strata data found in file. Please check the format.', 'error');
                console.error('No layers extracted. Check console for details.');
                return;
            }
            
            console.log('Extracted', layers.length, 'layers');
            const avgConfidence = validRows > 0 ? totalConfidence / validRows : 0;
            showPreviewModal(layers, avgConfidence);
            
        } catch (err) {
            showToast(`Failed to parse Excel file: ${err.message}`, 'error');
            console.error('Excel parse error:', err);
        }
    };
    reader.readAsArrayBuffer(file);
}

function parsePDF(file) {
    showToast('Processing PDF... This may take a moment.', 'info');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const arrayBuffer = e.target.result;
            
            // Try to extract text from PDF
            // Method 1: Simple text extraction (works for text-based PDFs)
            const uint8Array = new Uint8Array(arrayBuffer);
            let text = '';
            
            // Convert to string and extract readable text
            for (let i = 0; i < uint8Array.length; i++) {
                const char = uint8Array[i];
                // Only include printable ASCII characters
                if ((char >= 32 && char <= 126) || char === 10 || char === 13) {
                    text += String.fromCharCode(char);
                }
            }
            
            console.log('Extracted PDF text length:', text.length);
            console.log('PDF text sample:', text.substring(0, 500));
            
            // Enhanced regex patterns for better extraction
            const patterns = [
                // Pattern 1: "0-10 ft Clay" or "0 to 10 ft Clay" or "0-10 Clay"
                /(\d+\.?\d*)\s*(?:-|–|to|TO|~)\s*(\d+\.?\d*)\s*(?:ft|feet|m|meters?|mts?)?\s*[:\-]?\s*([A-Za-z][A-Za-z\s,\-]+)/gi,
                // Pattern 2: "Clay: 0-10 ft" or "Clay 0 to 10"
                /([A-Za-z][A-Za-z\s,\-]+)\s*[:\-]\s*(\d+\.?\d*)\s*(?:-|–|to|TO|~)\s*(\d+\.?\d*)\s*(?:ft|feet|m|mts?)?/gi,
                // Pattern 3: Table format "0 | 10 | Clay" or "0  10  Clay"
                /(\d+\.?\d*)\s*[\|\s]{2,}\s*(\d+\.?\d*)\s*[\|\s]{2,}\s*([A-Za-z][A-Za-z\s,\-]+)/gi,
                // Pattern 4: "From 0 to 10: Clay" or "0 to 10 m: Clay"
                /(?:from\s+)?(\d+\.?\d*)\s+(?:to|TO|-|–)\s+(\d+\.?\d*)\s*(?:m|ft|mts?|feet)?[\s:]+([A-Za-z][A-Za-z\s,\-]+)/gi,
                // Pattern 5: Depth in parentheses "Clay (0-10 ft)"
                /([A-Za-z][A-Za-z\s,\-]+)\s*\((\d+\.?\d*)\s*(?:-|to)\s*(\d+\.?\d*)\s*(?:ft|m|mts?)?\)/gi
            ];
            
            const layers = [];
            const foundMatches = new Set();
            let totalConfidence = 0;
            
            for (const pattern of patterns) {
                let match;
                while ((match = pattern.exec(text)) !== null) {
                    let startDepth, endDepth, material;
                    
                    // Determine which pattern matched
                    if (match[3] && !isNaN(parseFloat(match[1]))) {
                        // Pattern 1, 3, or 4
                        startDepth = parseFloat(match[1]);
                        endDepth = parseFloat(match[2]);
                        material = match[3].trim();
                    } else if (match[3] && isNaN(parseFloat(match[1]))) {
                        // Pattern 2 or 5
                        material = match[1].trim();
                        startDepth = parseFloat(match[2]);
                        endDepth = parseFloat(match[3]);
                    } else {
                        continue;
                    }
                    
                    // Clean material name
                    material = material
                        .replace(/[^\w\s,\-]/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    
                    // Validate
                    if (material.length > 2 && material.length < 100 && 
                        endDepth > startDepth && endDepth < 10000) {
                        
                        // Skip if material is just numbers
                        if (/^\d+$/.test(material)) continue;
                        
                        // Create unique key to avoid duplicates
                        const key = `${startDepth.toFixed(1)}-${endDepth.toFixed(1)}-${material.toLowerCase()}`;
                        
                        if (!foundMatches.has(key)) {
                            foundMatches.add(key);
                            
                            // Calculate confidence
                            let confidence = 0.6; // Base confidence for PDF
                            
                            // Good material name
                            if (material.length > 3 && /^[A-Z]/.test(material)) {
                                confidence += 0.1;
                            }
                            
                            // Reasonable depth range
                            if ((endDepth - startDepth) > 0 && (endDepth - startDepth) < 100) {
                                confidence += 0.1;
                            }
                            
                            // Sequential with previous layer
                            if (layers.length > 0) {
                                const prevLayer = layers[layers.length - 1];
                                if (Math.abs(startDepth - prevLayer.endDepth) < 2) {
                                    confidence += 0.1;
                                }
                            }
                            
                            totalConfidence += confidence;
                            
                            layers.push({
                                id: generateId(),
                                startDepth,
                                endDepth,
                                material,
                                color: getColorForMaterial(material),
                                confidence
                            });
                            
                            console.log('Found layer:', startDepth, '-', endDepth, material);
                        }
                    }
                }
            }
            
            if (layers.length === 0) {
                showToast('No strata data found in PDF. The PDF may be image-based or use an unsupported format. Try Excel or extract text first.', 'error');
                console.error('No layers found. PDF text sample:', text.substring(0, 1000));
                return;
            }
            
            // Sort by start depth
            layers.sort((a, b) => a.startDepth - b.startDepth);
            
            // Remove duplicates based on proximity
            const uniqueLayers = [];
            for (let i = 0; i < layers.length; i++) {
                const layer = layers[i];
                const isDuplicate = uniqueLayers.some(ul => 
                    Math.abs(ul.startDepth - layer.startDepth) < 0.5 &&
                    Math.abs(ul.endDepth - layer.endDepth) < 0.5
                );
                if (!isDuplicate) {
                    uniqueLayers.push(layer);
                }
            }
            
            console.log('Extracted', uniqueLayers.length, 'unique layers from PDF');
            const avgConfidence = uniqueLayers.length > 0 ? totalConfidence / uniqueLayers.length : 0;
            showPreviewModal(uniqueLayers, avgConfidence);
            
        } catch (err) {
            showToast(`Failed to parse PDF: ${err.message}`, 'error');
            console.error('PDF parse error:', err);
        }
    };
    reader.readAsArrayBuffer(file);
}

function getColorForMaterial(material) {
    const normalized = material.toLowerCase().trim();
    
    // Extended material matching with more variations
    const materialMap = [
        { patterns: ['clay', 'clayey', 'clays'], color: '#8D6E63' },
        { patterns: ['sand', 'sandy', 'sands'], color: '#E0C097' },
        { patterns: ['kankar', 'calcareous', 'calcrete'], color: '#A1887F' },
        { patterns: ['sandy kankar', 'sand kankar'], color: '#BCAAA4' },
        { patterns: ['gravel', 'gravelly', 'gravels', 'pebble'], color: '#9E9E9E' },
        { patterns: ['rock', 'rocky', 'stone'], color: '#616161' },
        { patterns: ['hard rock', 'bedrock', 'boulder'], color: '#424242' },
        { patterns: ['clay kankar', 'clayey kankar'], color: '#6D4C41' },
        { patterns: ['silt', 'silty', 'silts'], color: '#A0826D' },
        { patterns: ['loam', 'loamy'], color: '#9C7A5C' },
        { patterns: ['top soil', 'topsoil', 'soil'], color: '#6B5D4F' },
        { patterns: ['fill', 'filled', 'filling'], color: '#8B7355' },
        { patterns: ['murrum', 'moorum'], color: '#B8860B' },
        { patterns: ['weathered', 'decomposed'], color: '#CD853F' }
    ];
    
    // Check for exact or partial matches
    for (const { patterns, color } of materialMap) {
        for (const pattern of patterns) {
            if (normalized.includes(pattern)) {
                return color;
            }
        }
    }
    
    // Default color
    return '#78909C';
}

function showPreviewModal(layers, confidence) {
    previewLayers = layers;
    
    const badge = document.getElementById('confidenceBadge');
    const percent = (confidence * 100).toFixed(0);
    
    let badgeClass = 'confidence-badge ';
    let badgeIcon = '';
    
    if (confidence > 0.8) {
        badgeClass += 'high';
        badgeIcon = '✓';
    } else if (confidence > 0.5) {
        badgeClass += 'medium';
        badgeIcon = '⚠';
    } else {
        badgeClass += 'medium';
        badgeIcon = '⚠';
    }
    
    badge.className = badgeClass;
    badge.innerHTML = `${badgeIcon} ${percent}% confidence`;
    
    const table = document.createElement('table');
    table.className = 'preview-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th style="width: 80px;">Start (ft)</th>
                <th style="width: 80px;">End (ft)</th>
                <th>Material</th>
                <th style="width: 60px;">Color</th>
                <th style="width: 80px;">Confidence</th>
            </tr>
        </thead>
        <tbody>
            ${layers.map((layer, idx) => {
                const confIcon = layer.confidence > 0.8 ? '🟢' : layer.confidence > 0.5 ? '🟡' : '🟠';
                const confText = layer.confidence > 0.8 ? 'High' : layer.confidence > 0.5 ? 'Medium' : 'Low';
                return `
                <tr>
                    <td><input type="number" value="${layer.startDepth}" data-idx="${idx}" data-field="startDepth" step="0.1"></td>
                    <td><input type="number" value="${layer.endDepth}" data-idx="${idx}" data-field="endDepth" step="0.1"></td>
                    <td><input type="text" value="${layer.material}" data-idx="${idx}" data-field="material"></td>
                    <td><div class="color-swatch" style="background: ${layer.color}; width: 32px; height: 24px; margin: 0 auto;"></div></td>
                    <td style="text-align: center; font-size: 0.75rem;">${confIcon} ${confText}</td>
                </tr>
            `}).join('')}
        </tbody>
    `;
    
    document.getElementById('previewTable').innerHTML = '';
    document.getElementById('previewTable').appendChild(table);
    document.getElementById('previewModal').style.display = 'flex';
    
    // Add event listeners for editing
    table.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            const field = e.target.dataset.field;
            if (field === 'startDepth' || field === 'endDepth') {
                previewLayers[idx][field] = parseFloat(e.target.value) || 0;
            } else if (field === 'material') {
                previewLayers[idx][field] = e.target.value;
                // Update color based on material
                previewLayers[idx].color = getColorForMaterial(e.target.value);
                // Update color swatch
                const row = e.target.closest('tr');
                const swatch = row.querySelector('.color-swatch');
                if (swatch) {
                    swatch.style.background = previewLayers[idx].color;
                }
            }
        });
    });
}

function confirmImport() {
    const borewell = getActiveBorewell();
    if (!borewell) {
        showToast('Please create or select a borewell first', 'error');
        return;
    }
    
    borewell.layers = previewLayers.map(l => ({
        id: l.id,
        startDepth: l.startDepth,
        endDepth: l.endDepth,
        material: l.material,
        color: l.color
    }));
    borewell.updatedAt = new Date().toISOString();
    
    saveData();
    showToast(`Imported ${previewLayers.length} strata layers`, 'success');
    document.getElementById('previewModal').style.display = 'none';
    updateUI();
}


// PDF Export
async function exportPDF() {
    const borewell = getActiveBorewell();
    if (!borewell) {
        showToast('No borewell selected', 'error');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;
    
    // Header
    pdf.setFontSize(20);
    pdf.setTextColor(31, 111, 139);
    pdf.text('StrataDesk', margin, yPos);
    yPos += 10;
    
    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Borewell Report', margin, yPos);
    yPos += 10;
    
    // Date
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
    yPos += 15;
    
    // Metadata
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Borewell Information', margin, yPos);
    yPos += 8;
    
    pdf.setFontSize(10);
    const metadata = [
        `Name: ${borewell.name || 'Unnamed'}`,
        `Location: ${borewell.location || 'N/A'}`,
        `Coordinates: ${borewell.latitude.toFixed(6)}, ${borewell.longitude.toFixed(6)}`,
        `Diameter: ${borewell.diameter} inches`,
        `Total Depth: ${borewell.totalDepth} ft`,
        `Notes: ${borewell.notes || 'None'}`
    ];
    
    metadata.forEach(line => {
        pdf.text(line, margin, yPos);
        yPos += 6;
    });
    
    yPos += 10;
    
    // Strata table
    pdf.setFontSize(12);
    pdf.text('Strata Layers', margin, yPos);
    yPos += 8;
    
    pdf.setFontSize(9);
    const tableHeaders = ['Start (ft)', 'End (ft)', 'Material', 'Thickness (ft)'];
    const colWidths = [25, 25, 80, 30];
    let xPos = margin;
    
    // Table header
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 7, 'F');
    tableHeaders.forEach((header, i) => {
        pdf.text(header, xPos, yPos);
        xPos += colWidths[i];
    });
    yPos += 8;
    
    // Table rows
    borewell.layers.forEach((layer, idx) => {
        if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = margin;
        }
        
        xPos = margin;
        const rowData = [
            layer.startDepth.toFixed(1),
            layer.endDepth.toFixed(1),
            layer.material,
            (layer.endDepth - layer.startDepth).toFixed(1)
        ];
        
        // Alternating row colors
        if (idx % 2 === 0) {
            pdf.setFillColor(250, 250, 250);
            pdf.rect(margin, yPos - 5, pageWidth - 2 * margin, 7, 'F');
        }
        
        // Color swatch
        const hexColor = layer.color;
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        pdf.setFillColor(r, g, b);
        pdf.rect(xPos - 5, yPos - 4, 3, 5, 'F');
        
        rowData.forEach((data, i) => {
            pdf.setTextColor(0, 0, 0);
            pdf.text(data, xPos, yPos);
            xPos += colWidths[i];
        });
        yPos += 7;
    });
    
    yPos += 10;
    
    // Chart
    if (yPos < pageHeight - 100) {
        try {
            pdf.setFontSize(12);
            pdf.text('Strata Visualization', margin, yPos);
            yPos += 8;
            
            const chartElement = document.querySelector('#chartContainer svg');
            if (chartElement) {
                const canvas = await html2canvas(chartElement, {
                    backgroundColor: '#ffffff',
                    scale: 2
                });
                
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = 80;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                if (yPos + imgHeight > pageHeight - margin) {
                    pdf.addPage();
                    yPos = margin;
                }
                
                pdf.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight);
            }
        } catch (err) {
            console.error('Failed to capture chart:', err);
        }
    }
    
    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
        'Generated by StrataDesk - Borewell Visualization System',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
    );
    
    // Save
    const filename = `${borewell.name || 'borewell'}_report_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
    showToast('Report exported successfully', 'success');
}

// UI Update
function updateUI() {
    updateForm();
    updateLayersTable();
    renderStrataChart();
    updateMarkers();
    checkDepthMismatch();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initMap();
    updateUI();
    
    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => {
        state.sidebarOpen = !state.sidebarOpen;
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        const toggle = document.getElementById('sidebarToggle');
        
        if (state.sidebarOpen) {
            sidebar.classList.remove('closed');
            mainContent.classList.remove('sidebar-closed');
            toggle.classList.remove('open');
        } else {
            sidebar.classList.add('closed');
            mainContent.classList.add('sidebar-closed');
            toggle.classList.add('open');
        }
        
        setTimeout(() => map.invalidateSize(), 300);
    });
    
    // Form buttons
    document.getElementById('saveBorewell').addEventListener('click', saveBorewell);
    document.getElementById('deleteBorewell').addEventListener('click', deleteBorewell);
    document.getElementById('addLayer').addEventListener('click', addLayer);
    document.getElementById('autoClose').addEventListener('click', autoCloseDepth);
    document.getElementById('locateOnMap').addEventListener('click', locateOnMap);
    
    // Import tabs
    document.querySelectorAll('.import-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const type = tab.dataset.type;
            
            document.querySelectorAll('.import-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.import-content').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(type === 'data' ? 'dataImport' : 'chartImport').classList.add('active');
        });
    });
    
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(tabName === 'map' ? 'mapTab' : 'crossSectionTab').classList.add('active');
            
            if (tabName === 'cross-section') {
                updateCrossSection();
            } else {
                setTimeout(() => map.invalidateSize(), 100);
            }
        });
    });
    
    // Cross-section view mode
    document.querySelectorAll('[data-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
            state.viewMode = btn.dataset.mode;
            document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateCrossSection();
        });
    });
    
    // File upload - Data files
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    
    uploadZone.addEventListener('click', () => fileInput.click());
    
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragging');
    });
    
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragging');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragging');
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFileUpload(file);
    });
    
    // File upload - Chart images
    const chartUploadZone = document.getElementById('chartUploadZone');
    const chartFileInput = document.getElementById('chartFileInput');
    
    chartUploadZone.addEventListener('click', () => chartFileInput.click());
    
    chartUploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        chartUploadZone.classList.add('dragging');
    });
    
    chartUploadZone.addEventListener('dragleave', () => {
        chartUploadZone.classList.remove('dragging');
    });
    
    chartUploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        chartUploadZone.classList.remove('dragging');
        const file = e.dataTransfer.files[0];
        if (file) handleChartImageUpload(file);
    });
    
    chartFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleChartImageUpload(file);
    });
    
    // PDF export
    document.getElementById('exportPDF').addEventListener('click', exportPDF);
    
    // Preview modal
    document.getElementById('closePreview').addEventListener('click', () => {
        document.getElementById('previewModal').style.display = 'none';
    });
    
    document.getElementById('cancelImport').addEventListener('click', () => {
        document.getElementById('previewModal').style.display = 'none';
    });
    
    document.getElementById('confirmImport').addEventListener('click', confirmImport);
    
    // Form change listeners
    document.getElementById('totalDepth').addEventListener('input', checkDepthMismatch);
});


// Locate on Map Feature
function locateOnMap() {
    const lat = parseFloat(document.getElementById('latitude').value);
    const lng = parseFloat(document.getElementById('longitude').value);
    
    if (isNaN(lat) || isNaN(lng)) {
        showToast('Please enter valid coordinates', 'error');
        return;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        showToast('Coordinates out of range', 'error');
        return;
    }
    
    // Fly to location with animation
    map.flyTo([lat, lng], 15, {
        duration: 1.5,
        easeLinearity: 0.5
    });
    
    // Add temporary marker
    const tempMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            html: `<div style="width: 40px; height: 40px; background: rgba(31, 111, 139, 0.3); border: 3px solid hsl(196, 65%, 33%); border-radius: 50%; animation: pulse 1.5s infinite;"></div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        })
    }).addTo(map);
    
    // Remove after 3 seconds
    setTimeout(() => {
        map.removeLayer(tempMarker);
    }, 3000);
    
    showToast('Location found on map', 'success');
}

// Chart Image Extraction
async function handleChartImageUpload(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    
    if (!validTypes.includes(file.type)) {
        showToast('Please upload PNG, JPG, or PDF file', 'error');
        return;
    }
    
    showToast('Processing chart image...', 'info');
    
    try {
        let imageData;
        
        if (file.type === 'application/pdf') {
            // For PDF, we'll extract text and look for patterns
            imageData = await extractFromPDFChart(file);
        } else {
            // For images, we'll use color analysis
            imageData = await extractFromChartImage(file);
        }
        
        if (imageData && imageData.length > 0) {
            showPreviewModal(imageData, 0.7); // Chart extraction has medium confidence
        } else {
            showToast('Could not extract layers from chart. Try data file instead.', 'error');
        }
    } catch (error) {
        console.error('Chart extraction error:', error);
        showToast('Failed to extract chart data', 'error');
    }
}

// Extract from PDF Chart
async function extractFromPDFChart(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                
                // Look for visual chart patterns in PDF text
                const layers = [];
                
                // Pattern 1: Color descriptions with depths
                const colorPattern = /(\d+\.?\d*)\s*(?:-|to)\s*(\d+\.?\d*)\s*(?:ft|feet)?\s*[:\-]?\s*([A-Za-z][A-Za-z\s]+)(?:\s*\(([^)]+)\))?/gi;
                
                let match;
                while ((match = colorPattern.exec(text)) !== null) {
                    const startDepth = parseFloat(match[1]);
                    const endDepth = parseFloat(match[2]);
                    const material = match[3].trim();
                    const colorHint = match[4] ? match[4].trim() : null;
                    
                    if (!isNaN(startDepth) && !isNaN(endDepth) && material) {
                        layers.push({
                            id: generateId(),
                            startDepth,
                            endDepth,
                            material,
                            color: colorHint ? getColorFromHint(colorHint) : getColorForMaterial(material),
                            confidence: 0.7
                        });
                    }
                }
                
                resolve(layers);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read PDF'));
        reader.readAsText(file);
    });
}

// Extract from Chart Image
async function extractFromChartImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                try {
                    // Create canvas to analyze image
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    // Analyze image for color bands
                    const layers = analyzeChartColors(canvas, ctx);
                    resolve(layers);
                } catch (err) {
                    reject(err);
                }
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// Analyze chart colors to extract layers
function analyzeChartColors(canvas, ctx) {
    const width = canvas.width;
    const height = canvas.height;
    const layers = [];
    
    // Sample vertical strip from middle of image
    const sampleX = Math.floor(width / 2);
    const sampleWidth = Math.min(50, Math.floor(width / 10));
    
    // Scan from top to bottom
    const colorBands = [];
    let currentColor = null;
    let currentStart = 0;
    
    for (let y = 0; y < height; y += 2) {
        // Sample multiple pixels horizontally
        const colors = [];
        for (let x = sampleX; x < sampleX + sampleWidth; x += 5) {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            colors.push({
                r: pixel[0],
                g: pixel[1],
                b: pixel[2]
            });
        }
        
        // Average color
        const avgColor = {
            r: Math.round(colors.reduce((sum, c) => sum + c.r, 0) / colors.length),
            g: Math.round(colors.reduce((sum, c) => sum + c.g, 0) / colors.length),
            b: Math.round(colors.reduce((sum, c) => sum + c.b, 0) / colors.length)
        };
        
        const colorKey = `${avgColor.r},${avgColor.g},${avgColor.b}`;
        
        // Detect color change
        if (currentColor === null) {
            currentColor = colorKey;
            currentStart = y;
        } else if (!colorsAreSimilar(currentColor, colorKey)) {
            // Color changed - save band
            colorBands.push({
                color: currentColor,
                startY: currentStart,
                endY: y,
                height: y - currentStart
            });
            currentColor = colorKey;
            currentStart = y;
        }
    }
    
    // Add last band
    if (currentColor) {
        colorBands.push({
            color: currentColor,
            startY: currentStart,
            endY: height,
            height: height - currentStart
        });
    }
    
    // Filter out noise (very small bands)
    const significantBands = colorBands.filter(band => band.height > height * 0.02);
    
    // Convert to layers with estimated depths
    const totalHeight = height;
    const estimatedTotalDepth = 100; // Assume 100ft if not specified
    
    significantBands.forEach((band, index) => {
        const startDepth = (band.startY / totalHeight) * estimatedTotalDepth;
        const endDepth = (band.endY / totalHeight) * estimatedTotalDepth;
        
        // Parse color
        const [r, g, b] = band.color.split(',').map(Number);
        const hexColor = rgbToHex(r, g, b);
        
        // Guess material from color
        const material = guessMaterialFromColor(hexColor);
        
        layers.push({
            id: generateId(),
            startDepth: Math.round(startDepth * 10) / 10,
            endDepth: Math.round(endDepth * 10) / 10,
            material: material || `Layer ${index + 1}`,
            color: hexColor,
            confidence: 0.6 // Lower confidence for image extraction
        });
    });
    
    return layers;
}

// Helper: Check if colors are similar
function colorsAreSimilar(color1, color2, threshold = 30) {
    const [r1, g1, b1] = color1.split(',').map(Number);
    const [r2, g2, b2] = color2.split(',').map(Number);
    
    const diff = Math.sqrt(
        Math.pow(r1 - r2, 2) +
        Math.pow(g1 - g2, 2) +
        Math.pow(b1 - b2, 2)
    );
    
    return diff < threshold;
}

// Helper: RGB to Hex
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

// Helper: Guess material from color
function guessMaterialFromColor(hexColor) {
    const colorMap = {
        '#8D6E63': 'Clay',
        '#E0C097': 'Sand',
        '#A1887F': 'Kankar',
        '#BCAAA4': 'Sandy Kankar',
        '#9E9E9E': 'Gravel',
        '#616161': 'Rock',
        '#424242': 'Hard Rock',
        '#6D4C41': 'Clay Kankar'
    };
    
    // Find closest color
    let closestMaterial = null;
    let minDistance = Infinity;
    
    const targetRgb = hexToRgb(hexColor);
    
    for (const [color, material] of Object.entries(colorMap)) {
        const rgb = hexToRgb(color);
        const distance = Math.sqrt(
            Math.pow(targetRgb.r - rgb.r, 2) +
            Math.pow(targetRgb.g - rgb.g, 2) +
            Math.pow(targetRgb.b - rgb.b, 2)
        );
        
        if (distance < minDistance) {
            minDistance = distance;
            closestMaterial = material;
        }
    }
    
    return minDistance < 100 ? closestMaterial : null;
}

// Helper: Hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

// Helper: Get color from hint text
function getColorFromHint(hint) {
    const hintLower = hint.toLowerCase();
    
    if (hintLower.includes('brown') || hintLower.includes('clay')) return '#8D6E63';
    if (hintLower.includes('beige') || hintLower.includes('sand')) return '#E0C097';
    if (hintLower.includes('tan') || hintLower.includes('kankar')) return '#A1887F';
    if (hintLower.includes('gray') || hintLower.includes('grey') || hintLower.includes('gravel')) return '#9E9E9E';
    if (hintLower.includes('dark') || hintLower.includes('rock')) return '#616161';
    
    return '#78909C'; // Default gray
}

// Add pulse animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0%, 100% {
            transform: scale(1);
            opacity: 1;
        }
        50% {
            transform: scale(1.2);
            opacity: 0.7;
        }
    }
`;
document.head.appendChild(style);
