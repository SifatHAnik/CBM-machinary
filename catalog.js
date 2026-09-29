import { db } from "./firebase-config.js";
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ============================================================
// STATE
// ============================================================
let allProducts = [];
let allCategories = [];
let activeCategorySlug = null;
let priceFloor = 0;
let priceCeiling = 0;

// ============================================================
// BOOT
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    activeCategorySlug = urlParams.get('category');

    bindUI();
    await loadCategories();
    await loadProducts();
    initFooterInfo();
    initFab();
});

// ============================================================
// DATA LOADING
// ============================================================
async function loadCategories() {
    try {
        const snap = await getDocs(collection(db, "categories"));
        allCategories = [];
        snap.forEach(d => allCategories.push({ id: d.id, ...d.data() }));

        const listEl = document.getElementById('cat-filter-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        if (activeCategorySlug) {
            listEl.closest('.filter-group').style.display = 'none';
            const cat = allCategories.find(c => c.id === activeCategorySlug);
            if (cat) {
                document.getElementById('page-title').textContent = cat.name;
                document.getElementById('page-subtitle').innerHTML =
                    `Showing all products in <strong>${escapeHtml(cat.name)}</strong>`;
                document.title = `${cat.name} - CBM Machineries`;
            }
            return;
        }

        if (allCategories.length === 0) {
            listEl.innerHTML = `<p style="color:#666; font-size:0.8rem;">No categories yet.</p>`;
            return;
        }

        allCategories.forEach(cat => {
            const label = document.createElement('label');
            label.className = 'cat-filter-item';
            label.innerHTML = `
                <input type="checkbox" value="${escapeHtml(cat.id)}" class="cat-checkbox">
                <span>${escapeHtml(cat.name || cat.id)}</span>
            `;
            listEl.appendChild(label);
        });

        listEl.querySelectorAll('.cat-checkbox').forEach(cb => {
            cb.addEventListener('change', applyFilters);
        });
    } catch (err) {
        console.error("Category load failed:", err);
    }
}

async function loadProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#666;">Loading products...</p>`;

    try {
        const snap = await getDocs(collection(db, "products"));
        allProducts = [];
        snap.forEach(d => allProducts.push({ id: d.id, ...d.data() }));

        if (allProducts.length > 0) {
            const prices = allProducts.map(p => Number(p.price) || 0);
            priceFloor = 0;
            priceCeiling = Math.ceil(Math.max(...prices) / 1000) * 1000;
            if (priceCeiling < 1000) priceCeiling = 1000;

            const minSlider = document.getElementById('price-min');
            const maxSlider = document.getElementById('price-max');
            minSlider.min = priceFloor;
            minSlider.max = priceCeiling;
            minSlider.value = priceFloor;
            maxSlider.min = priceFloor;
            maxSlider.max = priceCeiling;
            maxSlider.value = priceCeiling;

            updatePriceLabels();
        }

        applyFilters();
    } catch (err) {
        console.error("Product load failed:", err);
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#e2136e;">Failed to load products.</p>`;
    }
}

// ============================================================
// FILTER + RENDER
// ============================================================
function applyFilters() {
    const grid = document.getElementById('products-grid');
    const countEl = document.getElementById('results-count');
    if (!grid) return;

    const minVal = Number(document.getElementById('price-min').value);
    const maxVal = Number(document.getElementById('price-max').value);
    const sortVal = document.getElementById('sort-select').value;

    const checkedCats = [...document.querySelectorAll('.cat-checkbox:checked')]
        .map(cb => cb.value);

    let filtered = allProducts.filter(p => {
        const price = Number(p.price) || 0;
        if (price < minVal || price > maxVal) return false;

        if (activeCategorySlug) {
            if (p.category !== activeCategorySlug) return false;
        } else if (checkedCats.length > 0) {
            if (!checkedCats.includes(p.category)) return false;
        }
        return true;
    });

    filtered.sort((a, b) => {
        if (sortVal === 'price-asc') return (Number(a.price) || 0) - (Number(b.price) || 0);
        if (sortVal === 'price-desc') return (Number(b.price) || 0) - (Number(a.price) || 0);
        if (sortVal === 'name-asc') return String(a.title || '').localeCompare(String(b.title || ''));
        const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return tb - ta;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <i class="fa-solid fa-box-open"></i>
                No products match your filters.
            </div>`;
        if (countEl) countEl.textContent = `0 products found`;
        return;
    }

    grid.innerHTML = filtered.map(p => {
        const hasImg = !!p.imageUrl;
        const imgHtml = hasImg
            ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.title || '')}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
               <div class="img-placeholder" style="display:none;position:absolute;inset:0;">
                   <i class="fa-solid fa-image"></i>
                   <span class="ph-main">Photo not available</span>
                   <span class="ph-sub">Sorry about that</span>
               </div>`
            : `<div class="img-placeholder" style="position:absolute;inset:0;">
                   <i class="fa-solid fa-image"></i>
                   <span class="ph-main">Photo not available</span>
                   <span class="ph-sub">Sorry about that</span>
               </div>`;

        return `
            <a class="product-tile" href="product.html?id=${encodeURIComponent(p.id)}">
                <div class="product-tile-img">${imgHtml}</div>
                <div class="product-tile-body">
                    <h3 class="product-tile-title">${escapeHtml(p.title || 'Untitled')}</h3>
                    <p class="product-tile-desc">${escapeHtml(p.shortDescription || '')}</p>
                    <div class="product-tile-price">৳ ${Number(p.price || 0).toLocaleString()}</div>
                </div>
            </a>`;
    }).join('');

    if (countEl) countEl.textContent = `${filtered.length} product${filtered.length === 1 ? '' : 's'} found`;
}

// ============================================================
// UI BINDINGS
// ============================================================
function bindUI() {
    const minSlider = document.getElementById('price-min');
    const maxSlider = document.getElementById('price-max');
    const sortSelect = document.getElementById('sort-select');
    const clearBtn = document.getElementById('clear-filters');
    const mobileToggle = document.getElementById('mobile-filter-toggle');
    const filterPanel = document.getElementById('filter-panel');

    minSlider.addEventListener('input', () => {
        if (Number(minSlider.value) > Number(maxSlider.value)) {
            minSlider.value = maxSlider.value;
        }
        updatePriceLabels();
        applyFilters();
    });

    maxSlider.addEventListener('input', () => {
        if (Number(maxSlider.value) < Number(minSlider.value)) {
            maxSlider.value = minSlider.value;
        }
        updatePriceLabels();
        applyFilters();
    });

    sortSelect.addEventListener('change', applyFilters);

    clearBtn.addEventListener('click', () => {
        minSlider.value = priceFloor;
        maxSlider.value = priceCeiling;
        document.querySelectorAll('.cat-checkbox').forEach(cb => cb.checked = false);
        sortSelect.value = 'newest';
        updatePriceLabels();
        applyFilters();
    });

    if (mobileToggle && filterPanel) {
        mobileToggle.addEventListener('click', () => filterPanel.classList.toggle('open'));
    }
}

function updatePriceLabels() {
    const min = Number(document.getElementById('price-min').value);
    const max = Number(document.getElementById('price-max').value);
    document.getElementById('price-min-label').textContent = min.toLocaleString();
    document.getElementById('price-max-label').textContent = max.toLocaleString();
}

// ============================================================
// FOOTER INFO + FAB
// ============================================================
async function initFooterInfo() {
    try {
        const snap = await getDoc(doc(db, "site_stats", "global"));
        if (!snap.exists()) return;
        const data = snap.data();

        const setText = (id, val) => { const el = document.getElementById(id); if (el && val) el.textContent = val; };
        setText('footer-hotline', data.hotlineNumber);
        setText('footer-whatsapp', data.whatsappNumber);
        setText('footer-email', data.emailAddress);
        setText('footer-address', data.address);
        setText('footer-hours', data.businessHours);

        const setLink = (id, val) => { const el = document.getElementById(id); if (el && val) el.href = val; };
        setLink('footer-facebook', data.facebookUrl);
        setLink('footer-youtube', data.youtubeUrl);
        setLink('footer-linkedin', data.linkedinUrl);
        setLink('footer-instagram', data.instagramUrl);

        const waNum = sanitizePhone(data.whatsappNumber);
        const callNum = data.hotlineNumber ? String(data.hotlineNumber).replace(/[^0-9+]/g, '') : '';

        if (waNum) {
            const waLink = document.getElementById('footer-whatsapp-link');
            if (waLink) waLink.href = `https://wa.me/${waNum}`;
            const fabWa = document.getElementById('fab-whatsapp');
            if (fabWa) fabWa.href = `https://wa.me/${waNum}`;
        }
        if (callNum) {
            const callLink = document.getElementById('footer-hotline-link');
            if (callLink) callLink.href = `tel:${callNum}`;
            const fabCall = document.getElementById('fab-call');
            if (fabCall) fabCall.href = `tel:${callNum}`;
        }
        if (data.emailAddress) {
            const emailLink = document.getElementById('footer-email-link');
            if (emailLink) emailLink.href = `mailto:${data.emailAddress}`;
            const fabEmail = document.getElementById('fab-email');
            if (fabEmail) fabEmail.href = `mailto:${data.emailAddress}`;
        }
        if (data.address) {
            const addrLink = document.getElementById('footer-address-link');
            if (addrLink) addrLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address)}`;
        }
    } catch (err) {
        console.error("Footer info load failed:", err);
    }
}

function initFab() {
    const fab = document.getElementById('fab-container');
    const toggle = document.getElementById('fab-toggle');
    if (!fab || !toggle) return;
    toggle.addEventListener('click', (e) => { e.stopPropagation(); fab.classList.toggle('open'); });
    document.addEventListener('click', (e) => { if (!fab.contains(e.target)) fab.classList.remove('open'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fab.classList.remove('open'); });
}

// ============================================================
// HELPERS
// ============================================================
function sanitizePhone(num) {
    if (!num) return '';
    let n = String(num).replace(/[^0-9]/g, '');
    if (n.startsWith('0')) n = '880' + n.substring(1);
    if (!n.startsWith('880') && n.length === 10) n = '880' + n;
    return n;
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}