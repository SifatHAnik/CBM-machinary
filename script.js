// ========================================================
// 1. IMPORTS (ALL MUST BE AT THE TOP OF THE MODULE)
// ========================================================
import { db } from "./firebase-config.js";
import { 
    collection, 
    query, 
    where, 
    onSnapshot, 
    doc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ========================================================
// 2. STATE VARIABLES
// ========================================================
let targetStats = { machines: 0, clients: 0, years: 0 };
let hasAnimated = false;

// UNIFIED LOCAL STORAGE KEY: Uses 'cart' to sync across all pages
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// ========================================================
// 3. MAIN INITIALIZATION
// ========================================================
document.addEventListener("DOMContentLoaded", async () => {
    // DOM Elements
    const navbar = document.getElementById("main-navbar");
    const hero = document.getElementById("hero");
    const dropdownBtn = document.getElementById("category-dropdown-btn");
    const navCategoryDropdown = document.getElementById("nav-category-dropdown");
    const mobileToggle = document.getElementById("mobile-toggle");
    const mobileClose = document.getElementById("mobile-close");
    const navMenuWrapper = document.getElementById("nav-menu");
    const menuOverlay = document.getElementById("menu-overlay");
    const categoriesContainer = document.getElementById('categories-container');

    // ----------------------------------------------------
    // Mobile Drawer Functions
    // ----------------------------------------------------
    const openMenu = () => {
        if (navMenuWrapper) navMenuWrapper.classList.add("open");
        if (menuOverlay) menuOverlay.classList.add("active");
        document.body.style.overflow = "hidden";
    };

    const closeMenu = () => {
        if (navMenuWrapper) navMenuWrapper.classList.remove("open");
        if (menuOverlay) menuOverlay.classList.remove("active");
        document.body.style.overflow = "auto";
    };

    if (mobileToggle) mobileToggle.addEventListener("click", openMenu);
    if (mobileClose) mobileClose.addEventListener("click", closeMenu);
    if (menuOverlay) menuOverlay.addEventListener("click", closeMenu);

    // ----------------------------------------------------
    // Navbar Dropdown Toggle
    // ----------------------------------------------------
    if (dropdownBtn && navCategoryDropdown) {
        dropdownBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            navCategoryDropdown.classList.toggle("hidden");
            dropdownBtn.classList.toggle("active");
        });

        document.addEventListener("click", (e) => {
            if (!dropdownBtn.contains(e.target) && !navCategoryDropdown.contains(e.target)) {
                navCategoryDropdown.classList.add("hidden");
                dropdownBtn.classList.remove("active");
            }
        });
    }

    // ----------------------------------------------------
    // Navbar Scroll Observer
    // ----------------------------------------------------
    if (navbar && hero) {
        const heroObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    navbar.classList.add("scrolled");
                } else {
                    navbar.classList.remove("scrolled");
                }
            });
        }, { threshold: 0.2 });

        heroObserver.observe(hero);
    }

    // ----------------------------------------------------
    // Real-time Category Loader & Dropdown Sync
    // ----------------------------------------------------
    function loadDynamicCategories() {
        onSnapshot(collection(db, "categories"), (catSnapshot) => {
            if (categoriesContainer) categoriesContainer.innerHTML = '';
            if (navCategoryDropdown) navCategoryDropdown.innerHTML = '';

            if (catSnapshot.empty) return;

            let fetchedCategories = [];
            catSnapshot.forEach((catDoc) => {
                fetchedCategories.push({
                    id: catDoc.id,
                    name: catDoc.data().name || catDoc.id
                });
            });

            // Clean string comparison for category IDs
            const hasNewArrivals = fetchedCategories.find(c => {
                const cleanId = c.id.toLowerCase().replace(/[\s_]+/g, '-');
                return cleanId === 'new-arrivals' || cleanId === 'newarrivals';
            });

            const hasOtherProducts = fetchedCategories.find(c => {
                const cleanId = c.id.toLowerCase().replace(/[\s_]+/g, '-');
                return cleanId === 'other-products' || cleanId === 'otherproducts';
            });

            const middleCategories = fetchedCategories.filter(
                c => c.id !== hasNewArrivals?.id && c.id !== hasOtherProducts?.id
            );

            // 1. First, render New Arrivals
            if (hasNewArrivals) {
                renderCategorySection(hasNewArrivals);
            }

            // 2. Second, inject the Stats Section directly after New Arrivals
            renderStatsSectionBlock();

            // 3. Third, render middle categories below stats
            middleCategories.forEach(cat => renderCategorySection(cat));

            // 4. Finally, render Other Products at the end
            if (hasOtherProducts) {
                renderCategorySection(hasOtherProducts);
            }

            // Re-bind the scroll observer AFTER elements exist in DOM
            observeStatsSection();
        });
    }

    // Helper: Dynamically creates and places the Stats Section in sequence
    function renderStatsSectionBlock() {
        if (!categoriesContainer) return;

        const statsSection = document.createElement('section');
        statsSection.id = 'impact-stats-section';
        statsSection.style.cssText = `background: #121616; border-top: 1px solid #0b4f37; border-bottom: 1px solid #0b4f37; padding: 3rem 1rem; margin: 1.5rem 0;`;

        statsSection.innerHTML = `
            <div style="max-width: 1100px; margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: space-around; gap: 2rem; text-align: center;">
                <div style="flex: 1; min-width: 200px;">
                    <div id="stat-machines-display" style="font-size: 2.8rem; font-weight: bold; color: #d4a373;">0</div>
                    <div style="color: #ffffff; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 1px; margin-top: 0.5rem;">Machines Delivered</div>
                </div>
                <div style="flex: 1; min-width: 200px;">
                    <div id="stat-clients-display" style="font-size: 2.8rem; font-weight: bold; color: #d4a373;">0</div>
                    <div style="color: #ffffff; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 1px; margin-top: 0.5rem;">Industrial Clients</div>
                </div>
                <div style="flex: 1; min-width: 200px;">
                    <div id="stat-years-display" style="font-size: 2.8rem; font-weight: bold; color: #d4a373;">0</div>
                    <div style="color: #ffffff; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 1px; margin-top: 0.5rem;">Positive Reviews</div>
                </div>
            </div>
        `;

        categoriesContainer.appendChild(statsSection);
    }

    // Helper: Observes stats element ONLY after it is rendered on screen
    function observeStatsSection() {
        const statsEl = document.getElementById('impact-stats-section');
        if (statsEl) {
            const statsObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !hasAnimated) {
                        hasAnimated = true;
                        animateCounter('stat-machines-display', targetStats.machines, "+");
                        animateCounter('stat-clients-display', targetStats.clients, "+");
                        animateCounter('stat-years-display', targetStats.years, "%");
                    }
                });
            }, { threshold: 0.5 });

            statsObserver.observe(statsEl);
        }
    }

    // Category Sections & Dropdown Links Helper
    function renderCategorySection(cat) {
        if (!categoriesContainer) return;

        if (navCategoryDropdown) {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `#category-${cat.id}`;
            a.textContent = cat.name;
            a.style.cssText = `display: block; padding: 0.6rem 1rem; color: #fff; text-decoration: none; transition: background 0.2s ease;`;
            a.addEventListener('mouseenter', () => a.style.background = '#0b4f37');
            a.addEventListener('mouseleave', () => a.style.background = 'transparent');
            a.addEventListener('click', () => {
                navCategoryDropdown.classList.add('hidden');
                if (dropdownBtn) dropdownBtn.classList.remove('active');
            });
            li.appendChild(a);
            navCategoryDropdown.appendChild(li);
        }

        const section = document.createElement('section');
        section.id = `category-${cat.id}`;
        section.style.cssText = `padding: 2rem; margin-bottom: 1rem; scroll-margin-top: 90px;`;
        
        section.innerHTML = `
            <h2 style="color: #d4a373; text-transform: uppercase; font-size: 1.4rem; letter-spacing: 2px; margin-bottom: 1.2rem; border-left: 4px solid #0b4f37; padding-left: 0.8rem;">
                ${escapeHtml(cat.name)}
            </h2>
            <div id="slider-${cat.id}" style="display: flex; gap: 1.5rem; overflow-x: auto; padding-bottom: 1rem; scroll-behavior: smooth;">
                <p style="color: #666; font-size: 0.9rem;">Loading products...</p>
            </div>
        `;

        categoriesContainer.appendChild(section);
        loadProductsForCategory(cat.id);
    }

    // Query Products per Category Slider
    function loadProductsForCategory(categorySlug) {
        const sliderEl = document.getElementById(`slider-${categorySlug}`);
        if (!sliderEl) return;

        const q = query(collection(db, "products"), where("category", "==", categorySlug));

        onSnapshot(q, (prodSnapshot) => {
            sliderEl.innerHTML = '';

            if (prodSnapshot.empty) {
                sliderEl.innerHTML = `<p style="color: #666; font-size: 0.85rem; font-style: italic;">No items currently listed in this category.</p>`;
                return;
            }

            prodSnapshot.forEach((prodDoc) => {
                const product = prodDoc.data();
                const productId = prodDoc.id;

                const card = document.createElement('div');
                card.style.cssText = `
                    min-width: 280px;
                    max-width: 280px;
                    background: #161b1b;
                    border: 1px solid rgba(212, 163, 115, 0.2);
                    border-radius: 12px;
                    overflow: hidden;
                    cursor: pointer;
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                    flex-shrink: 0;
                `;

                card.innerHTML = `
                    <div style="width: 100%; height: 200px; overflow: hidden; background: #000;">
                        <img src="${escapeHtml(product.imageUrl || '')}" alt="${escapeHtml(product.title || '')}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div style="padding: 1.2rem; background: #161b1b;">
                        <h3 style="color: #fff; font-size: 1.1rem; margin: 0 0 0.5rem 0; font-weight: 600;">${escapeHtml(product.title || '')}</h3>
                        <p style="color: #a0a0a0; font-size: 0.85rem; margin: 0 0 0.8rem 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${escapeHtml(product.shortDescription || '')}
                        </p>
                        <div style="color: #d4a373; font-weight: bold; font-size: 1.1rem;">
                            ৳ ${Number(product.price || 0).toLocaleString()}
                        </div>
                    </div>
                `;

                card.addEventListener('mouseenter', () => card.style.transform = 'translateY(-5px)');
                card.addEventListener('mouseleave', () => card.style.transform = 'translateY(0)');

                card.addEventListener('click', () => {
                    window.location.href = `product.html?id=${productId}`;
                });

                sliderEl.appendChild(card);
            });
        });
    }

    // Initializations
    await initStats();
    initCart();
    loadDynamicCategories();
});

// Sync cart dynamically when user navigates back to index.html
window.addEventListener('pageshow', () => {
    cart = JSON.parse(localStorage.getItem('cart')) || [];
    updateCartUI();
});

// ========================================================
// 4. CART & DRAWER FUNCTIONALITY
// ========================================================
function initCart() {
    const cartBtn = document.getElementById('nav-cart-btn');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartDrawer = document.getElementById('cart-drawer');
    const cartOverlay = document.getElementById('cart-overlay');
    const bkashModalOverlay = document.getElementById('bkash-modal-overlay');
    const closeBkashModalBtn = document.getElementById('close-bkash-modal-btn');
    const cartWhatsappBtn = document.getElementById('cart-whatsapp-btn');
    const cartBkashBtn = document.getElementById('cart-bkash-btn');

    const openCart = () => {
        if (cartDrawer) cartDrawer.classList.add('open');
        if (cartOverlay) cartOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeCart = () => {
        if (cartDrawer) cartDrawer.classList.remove('open');
        if (cartOverlay) cartOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    };

    if (cartBtn) cartBtn.addEventListener('click', openCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

    if (closeBkashModalBtn && bkashModalOverlay) {
        closeBkashModalBtn.addEventListener('click', () => {
            bkashModalOverlay.classList.remove('active');
        });
    }

    if (cartWhatsappBtn) {
        cartWhatsappBtn.addEventListener('click', async () => {
            if (cart.length === 0) {
                alert("Your cart is empty!");
                return;
            }

            let phone = "8801700000000"; // Fallback phone
            try {
                const statsSnap = await getDoc(doc(db, "site_stats", "global"));
                if (statsSnap.exists() && statsSnap.data().whatsappNumber) {
                    phone = statsSnap.data().whatsappNumber.replace(/[^0-9]/g, '');
                }
            } catch (e) {
                console.error("Error fetching WhatsApp phone:", e);
            }

            let message = "Hello CBM Machineries, I would like to order the following items:\n\n";
            let total = 0;
            cart.forEach((item, index) => {
                const subtotal = item.price * item.quantity;
                total += subtotal;
                message += `${index + 1}. ${item.title} x ${item.quantity} - ৳${subtotal.toLocaleString()}\n`;
            });
            message += `\nTotal Amount: ৳${total.toLocaleString()}`;

            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
        });
    }

    if (cartBkashBtn) {
        cartBkashBtn.addEventListener('click', async () => {
            if (cart.length === 0) {
                alert("Your cart is empty!");
                return;
            }

            let bkashAcc = "01700000000"; // Fallback account
            try {
                const statsSnap = await getDoc(doc(db, "site_stats", "global"));
                if (statsSnap.exists() && statsSnap.data().bkashNumber) {
                    bkashAcc = statsSnap.data().bkashNumber;
                }
            } catch (e) {
                console.error("Error fetching bKash info:", e);
            }

            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            const modalAccount = document.getElementById('bkash-modal-account');
            const modalAmount = document.getElementById('bkash-modal-amount');

            if (modalAccount) modalAccount.textContent = bkashAcc;
            if (modalAmount) modalAmount.textContent = `৳ ${total.toLocaleString()}`;

            if (bkashModalOverlay) bkashModalOverlay.classList.add('active');
        });
    }

    updateCartUI();
}

function updateCartUI() {
    const badge = document.getElementById('cart-badge-count');
    const container = document.getElementById('cart-items-container');
    const totalEl = document.getElementById('cart-total-price');

    // UNIFIED STORAGE SAVING: Using 'cart'
    localStorage.setItem('cart', JSON.stringify(cart));

    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (badge) badge.textContent = totalCount;

    if (!container) return;
    container.innerHTML = '';

    if (cart.length === 0) {
        container.innerHTML = `<p style="color: #666; font-size: 0.85rem; text-align: center; margin-top: 2rem;">Your cart is currently empty.</p>`;
        if (totalEl) totalEl.textContent = "৳ 0";
        return;
    }

    let grandTotal = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        grandTotal += itemTotal;

        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <img src="${escapeHtml(item.imageUrl || '')}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
            <div style="flex: 1;">
                <div style="color: #fff; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">${escapeHtml(item.title)}</div>
                <div style="color: #d4a373; font-size: 0.8rem; font-weight: bold;">৳ ${Number(item.price).toLocaleString()}</div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.4rem;">
                    <button class="cart-qty-btn" data-action="dec" data-index="${index}" style="background: #222; border: 1px solid #444; color: #fff; width: 22px; height: 22px; cursor: pointer; border-radius: 4px;">-</button>
                    <span style="color: #fff; font-size: 0.8rem;">${item.quantity}</span>
                    <button class="cart-qty-btn" data-action="inc" data-index="${index}" style="background: #222; border: 1px solid #444; color: #fff; width: 22px; height: 22px; cursor: pointer; border-radius: 4px;">+</button>
                </div>
            </div>
            <button class="cart-remove-btn" data-index="${index}" style="background: none; border: none; color: #e2136e; font-size: 0.9rem; cursor: pointer; align-self: flex-start;">&times;</button>
        `;

        container.appendChild(itemEl);
    });

    if (totalEl) totalEl.textContent = `৳ ${grandTotal.toLocaleString()}`;

    // Event Delegation for Cart Item Actions
    container.querySelectorAll('.cart-qty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'));
            const action = e.target.getAttribute('data-action');

            if (action === 'inc') {
                cart[idx].quantity += 1;
            } else if (action === 'dec') {
                if (cart[idx].quantity > 1) {
                    cart[idx].quantity -= 1;
                } else {
                    cart.splice(idx, 1);
                }
            }
            updateCartUI();
        });
    });

    container.querySelectorAll('.cart-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'));
            cart.splice(idx, 1);
            updateCartUI();
        });
    });
}

// ========================================================
// 5. HELPER FUNCTIONS & ANIMATION COUNTER
// ========================================================
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function animateCounter(elementId, targetValue, suffix = "+") {
    const el = document.getElementById(elementId);
    if (!el) return;

    const duration = 2000;
    const frameDuration = 1000 / 60; 
    const totalFrames = Math.round(duration / frameDuration);
    let frame = 0;

    const counterInterval = setInterval(() => {
        frame++;
        const progress = frame / totalFrames;
        const currentCount = Math.floor(targetValue * (1 - Math.pow(1 - progress, 3)));

        el.textContent = currentCount.toLocaleString() + suffix;

        if (frame >= totalFrames) {
            el.textContent = targetValue.toLocaleString() + suffix;
            clearInterval(counterInterval);
        }
    }, frameDuration);
}

async function initStats() {
    try {
        const docRef = doc(db, "site_stats", "global");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            targetStats = {
                machines: data.machinesSold || 0,
                clients: data.clientsServed || 0,
                years: data.yearsExperience || 0
            };
        }
    } catch (err) {
        console.error("Failed to load site stats:", err);
    }
}