import { db } from "./firebase-config.js";
import { doc, getDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// Business Phone Numbers
let WHATSAPP_NUMBER = "8801700000000"; 
let BKASH_ACCOUNT_NUMBER = "01700000000"; 

let currentProduct = null;

// FIXED: Uses unified storage key 'cart'
let cart = JSON.parse(localStorage.getItem('cart')) || [];

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const statsSnap = await getDoc(doc(db, "site_stats", "global"));
        if (statsSnap.exists()) {
            const statsData = statsSnap.data();
            if (statsData.whatsappNumber) {
                WHATSAPP_NUMBER = String(statsData.whatsappNumber).replace(/[^0-9]/g, '');
            }
            if (statsData.bkashNumber) {
                BKASH_ACCOUNT_NUMBER = statsData.bkashNumber;
            }
        }
    } catch (e) {
        console.warn("Using fallback contact numbers:", e);
    }

    setupCartDrawerUI();
    loadFooterPages();
    setupBkashModal();
    updateCartUI();

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    const loadingSpinner = document.getElementById('loading-spinner');
    const detailCard = document.getElementById('product-detail-card');

    if (!productId) {
        if (loadingSpinner) loadingSpinner.innerHTML = `<p style="color: #ff6b6b;">No product specified.</p>`;
        return;
    }

    try {
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            if (loadingSpinner) loadingSpinner.innerHTML = `<p style="color: #ff6b6b;">Product not found.</p>`;
            return;
        }

        currentProduct = { id: docSnap.id, ...docSnap.data() };

        // Populate DOM
const imgEl = document.getElementById('product-img');
const imgBox = imgEl.parentElement;
const placeholderHtml = `<div class="img-placeholder" style="position:absolute;inset:0;">
    <i class="fa-solid fa-image"></i>
    <span class="ph-main">Photo not available</span>
    <span class="ph-sub">Sorry about that</span>
</div>`;

if (currentProduct.imageUrl) {
    imgEl.src = currentProduct.imageUrl;
    imgEl.alt = currentProduct.title || 'Product Image';
    imgEl.onerror = () => {
        imgEl.style.display = 'none';
        if (!imgBox.querySelector('.img-placeholder')) {
            imgBox.insertAdjacentHTML('beforeend', placeholderHtml);
        }
    };
} else {
    imgEl.style.display = 'none';
    imgBox.insertAdjacentHTML('beforeend', placeholderHtml);
}
        document.getElementById('product-title').textContent = currentProduct.title || 'Untitled Product';
        document.getElementById('product-category').textContent = currentProduct.category || 'Machinery';
        document.getElementById('product-price').textContent = `৳ ${Number(currentProduct.price || 0).toLocaleString()}`;
        document.getElementById('product-short-desc').textContent = currentProduct.shortDescription || '';
        if (window.trackProductView) window.trackProductView(currentProduct.title, { prompt: true });
        
        document.getElementById('product-full-desc').textContent = 
            currentProduct.longDescription || currentProduct.detailedDescription || currentProduct.description || currentProduct.shortDescription || 'No detailed specifications available.';

            // --- YouTube Video ---
const videoSection = document.getElementById('product-video-section');
const videoId = extractYouTubeId(currentProduct.youtubeUrl);
if (videoId && videoSection) {
    videoSection.style.display = 'block';
    document.getElementById('product-video-thumb').src =
        `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    document.getElementById('product-video-play').addEventListener('click', (e) => {
        e.stopPropagation();
        const wrapper = document.getElementById('product-video-wrapper');
        wrapper.style.cursor = 'default';
        wrapper.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0" style="width:100%;height:100%;border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    });
}
        
        // Single Product Direct WhatsApp Order
        const directWaBtn = document.getElementById('direct-whatsapp-btn');
        if (directWaBtn) {
            const waMsg = encodeURIComponent(`Hello CBM Machineries, I want to order this machine:\n\n- Product: ${currentProduct.title}\n- ID: ${productId}\n- Price: ৳${Number(currentProduct.price || 0).toLocaleString()}`);
            directWaBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`;
        }

        // Single Product Direct bKash Checkout
        const directBkashBtn = document.getElementById('direct-bkash-btn');
        if (directBkashBtn) {
            directBkashBtn.addEventListener('click', () => showBkashModal(currentProduct.price || 0));
        }

        // Add To Cart Event
        const addToCartBtn = document.getElementById('add-to-cart-btn');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', () => {
                addToCart(currentProduct);
                openCart();
            });
        }

        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (detailCard) detailCard.style.display = 'block';

    } catch (error) {
        console.error("Error loading product detail:", error);
        if (loadingSpinner) loadingSpinner.innerHTML = `<p style="color: #ff6b6b;">Failed to load product details.</p>`;
    }
});








// --- CART MANAGEMENT ---

function addToCart(product) {
        if (window.trackCartAdd) window.trackCartAdd(product.title, 1);   // <-- ADD THIS

    const existingIndex = cart.findIndex(item => item.id === product.id);
    if (existingIndex > -1) {
        // FIXED: Uses 'quantity' instead of 'qty'
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({
            id: product.id,
            title: product.title,
            price: Number(product.price || 0),
            imageUrl: product.imageUrl,
            quantity: 1
        });
    }
    saveAndUpdateCart();
}

function updateQuantity(id, delta) {
    const index = cart.findIndex(item => item.id === id);
    if (index > -1) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
    }
    saveAndUpdateCart();
}

function saveAndUpdateCart() {
    // FIXED: Saves to key 'cart'
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const container = document.getElementById('cart-items-container');
    const badge = document.getElementById('cart-badge-count');
    const totalEl = document.getElementById('cart-total-price');

    // FIXED: Uses 'quantity' for recalculation
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    if (badge) badge.textContent = totalItems;
    if (totalEl) totalEl.textContent = `৳ ${totalPrice.toLocaleString()}`;

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `<p style="color: #8a9090; text-align: center; padding: 2rem; font-size: 0.9rem;">Your cart is empty.</p>`;
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.imageUrl || ''}" style="width: 55px; height: 55px; object-fit: cover; border-radius: 6px;">
            <div style="flex: 1;">
                <div style="color: #fff; font-size: 0.85rem; font-weight: 600;">${item.title}</div>
                <div style="color: #d4a373; font-size: 0.8rem; margin-top: 0.2rem;">৳ ${item.price.toLocaleString()}</div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.4rem;">
                    <button onclick="window.adjustCartQty('${item.id}', -1)" style="background: #1a2020; border: 1px solid #333; color: #fff; width: 22px; height: 22px; border-radius: 4px; cursor: pointer;">-</button>
                    <span style="font-size: 0.8rem; color: #fff;">${item.quantity}</span>
                    <button onclick="window.adjustCartQty('${item.id}', 1)" style="background: #1a2020; border: 1px solid #333; color: #fff; width: 22px; height: 22px; border-radius: 4px; cursor: pointer;">+</button>
                </div>
            </div>
        </div>
    `).join('');
}

window.adjustCartQty = (id, delta) => updateQuantity(id, delta);

async function loadFooterPages() {
    const listEl = document.getElementById('footer-pages-list');
    if (!listEl) return;
    try {
        const snap = await getDocs(collection(db, "footer_pages"));
        const pages = [];
        snap.forEach(d => {
            const data = d.data();
            if (data.showInFooter !== false) pages.push({ id: d.id, ...data });
        });
        pages.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));

        if (pages.length === 0) {
            listEl.innerHTML = `<li style="color:#666; font-size:0.85rem;">No pages yet</li>`;
            return;
        }
        listEl.innerHTML = pages.map(p =>
            `<li><a href="page.html?slug=${encodeURIComponent(p.slug || p.id)}">${escapeHtml(p.title || 'Untitled')}</a></li>`
        ).join('');
    } catch (err) {
        console.error("Footer pages:", err);
    }
}

// --- CART DRAWER CONTROLS ---

function setupCartDrawerUI() {
    const navCartBtn = document.getElementById('nav-cart-btn');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const overlay = document.getElementById('cart-overlay');
    const cartWaBtn = document.getElementById('cart-whatsapp-btn');
    const cartBkashBtn = document.getElementById('cart-bkash-btn');

    if (navCartBtn) navCartBtn.addEventListener('click', openCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if (overlay) overlay.addEventListener('click', closeCart);

    if (cartWaBtn) {
        cartWaBtn.addEventListener('click', () => {
            if (cart.length === 0) return alert('Your cart is empty.');
            let message = "Hello CBM Machineries, I would like to order the following items:\n\n";
            let grandTotal = 0;

            cart.forEach((item, index) => {
                const subtotal = item.price * item.quantity;
                grandTotal += subtotal;
                message += `${index + 1}. ${item.title} x ${item.quantity} = ৳${subtotal.toLocaleString()}\n`;
            });

            message += `\nTotal Amount: ৳${grandTotal.toLocaleString()}`;
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
        });
    }

    if (cartBkashBtn) {
        cartBkashBtn.addEventListener('click', () => {
            if (cart.length === 0) return alert('Your cart is empty.');
            const grandTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            showBkashModal(grandTotal);
        });
    }
}

function openCart() {
    document.getElementById('cart-drawer')?.classList.add('open');
    document.getElementById('cart-overlay')?.classList.add('active');
}

function closeCart() {
    document.getElementById('cart-drawer')?.classList.remove('open');
    document.getElementById('cart-overlay')?.classList.remove('active');
}

// --- BKASH MODAL CONTROL ---

function setupBkashModal() {
    const closeBtn = document.getElementById('close-bkash-modal-btn');
    const overlay = document.getElementById('bkash-modal-overlay');

    if (closeBtn) closeBtn.addEventListener('click', hideBkashModal);
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) hideBkashModal();
        });
    }
}

function showBkashModal(amount) {
    const overlay = document.getElementById('bkash-modal-overlay');
    const accountEl = document.getElementById('bkash-modal-account');
    const amountEl = document.getElementById('bkash-modal-amount');

    if (accountEl) accountEl.textContent = BKASH_ACCOUNT_NUMBER;
    if (amountEl) amountEl.textContent = `৳ ${Number(amount).toLocaleString()}`;
    if (overlay) overlay.classList.add('active');
}

function hideBkashModal() {
    const overlay = document.getElementById('bkash-modal-overlay');
    if (overlay) overlay.classList.remove('active');
}



function extractYouTubeId(url) {
    if (!url) return null;
    const trimmed = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    const m = trimmed.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    );
    return m ? m[1] : null;
}

// --- FLOATING ACTION BUTTON ---
(function () {
    const fab = document.getElementById('fab-container');
    const toggle = document.getElementById('fab-toggle');
    if (!fab || !toggle) return;

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        fab.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!fab.contains(e.target)) fab.classList.remove('open');
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') fab.classList.remove('open');
    });
})();