import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Business Phone for WhatsApp Orders
const WHATSAPP_NUMBER = "8801700000000"; // Replace with client's phone number
const BKASH_MERCHANT_NUMBER = "01700000000"; // Replace with client's bKash Personal/Merchant number

let currentProduct = null;
let cart = JSON.parse(localStorage.getItem('cbm_cart')) || [];

document.addEventListener("DOMContentLoaded", async () => {
    setupCartDrawerUI();
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
        document.getElementById('product-img').src = currentProduct.imageUrl || '';
        document.getElementById('product-img').alt = currentProduct.title || 'Product Image';
        document.getElementById('product-title').textContent = currentProduct.title || 'Untitled Product';
        document.getElementById('product-category').textContent = currentProduct.category || 'General';
        document.getElementById('product-price').textContent = `৳ ${Number(currentProduct.price || 0).toLocaleString()}`;
        document.getElementById('product-short-desc').textContent = currentProduct.shortDescription || '';
        
        document.getElementById('product-full-desc').textContent = 
            currentProduct.longDescription || currentProduct.detailedDescription || currentProduct.description || currentProduct.fullDescription || currentProduct.shortDescription || 'No additional specifications listed.';
        
        // Single Product Direct WhatsApp Order
        const directWaBtn = document.getElementById('direct-whatsapp-btn');
        if (directWaBtn) {
            const waMsg = encodeURIComponent(`Hello CBM Machineries, I want to order this machine:\n\n- Product: ${currentProduct.title}\n- ID: ${productId}\n- Price: ৳${Number(currentProduct.price || 0).toLocaleString()}`);
            directWaBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`;
        }

        // Single Product Direct bKash Checkout
        const directBkashBtn = document.getElementById('direct-bkash-btn');
        if (directBkashBtn) {
            directBkashBtn.addEventListener('click', () => initiateBkashCheckout(currentProduct.price || 0, [currentProduct]));
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

// --- CART STATE MANAGEMENT ---

function addToCart(product) {
    const existingIndex = cart.findIndex(item => item.id === product.id);
    if (existingIndex > -1) {
        cart[existingIndex].qty += 1;
    } else {
        cart.push({
            id: product.id,
            title: product.title,
            price: Number(product.price || 0),
            imageUrl: product.imageUrl,
            qty: 1
        });
    }
    saveAndUpdateCart();
}

function updateQuantity(id, delta) {
    const index = cart.findIndex(item => item.id === id);
    if (index > -1) {
        cart[index].qty += delta;
        if (cart[index].qty <= 0) {
            cart.splice(index, 1);
        }
    }
    saveAndUpdateCart();
}

function saveAndUpdateCart() {
    localStorage.setItem('cbm_cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const container = document.getElementById('cart-items-container');
    const badge = document.getElementById('cart-badge-count');
    const totalEl = document.getElementById('cart-total-price');

    const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);
    const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

    if (badge) badge.textContent = totalItems;
    if (totalEl) totalEl.textContent = `৳ ${totalPrice.toLocaleString()}`;

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `<p style="color: #888; text-align: center; padding: 2rem;">Your cart is empty.</p>`;
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.imageUrl || ''}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px;">
            <div style="flex: 1;">
                <div style="color: #fff; font-size: 0.9rem; font-weight: 600;">${item.title}</div>
                <div style="color: #d4a373; font-size: 0.85rem; margin-top: 0.2rem;">৳ ${item.price.toLocaleString()}</div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
                    <button onclick="window.adjustCartQty('${item.id}', -1)" style="background: #222; border: 1px solid #444; color: #fff; width: 24px; height: 24px; border-radius: 4px; cursor: pointer;">-</button>
                    <span style="font-size: 0.85rem; color: #fff;">${item.qty}</span>
                    <button onclick="window.adjustCartQty('${item.id}', 1)" style="background: #222; border: 1px solid #444; color: #fff; width: 24px; height: 24px; border-radius: 4px; cursor: pointer;">+</button>
                </div>
            </div>
        </div>
    `).join('');
}

window.adjustCartQty = (id, delta) => updateQuantity(id, delta);

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
            
            let message = "Hello CBM Machineries, I would like to order the following items from my cart:\n\n";
            let grandTotal = 0;

            cart.forEach((item, index) => {
                const subtotal = item.price * item.qty;
                grandTotal += subtotal;
                message += `${index + 1}. ${item.title} x ${item.qty} = ৳${subtotal.toLocaleString()}\n`;
            });

            message += `\nTotal Payable Amount: ৳${grandTotal.toLocaleString()}`;
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
        });
    }

    if (cartBkashBtn) {
        cartBkashBtn.addEventListener('click', () => {
            if (cart.length === 0) return alert('Your cart is empty.');
            const grandTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
            initiateBkashCheckout(grandTotal, cart);
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

// --- BKASH CHECKOUT ENGINE ---

function initiateBkashCheckout(amount, items) {
    // If you have configured a server backend endpoint for bKash Tokenized PGW API:
    // window.location.href = `/api/bkash-create-payment?amount=${amount}`;

    // Standard Direct Merchant Payment Validation Flow
    const userTrxId = prompt(
        `CBM Machineries - bKash Payment\n\n` +
        `Total Amount: ৳ ${amount.toLocaleString()}\n` +
        `Please Send Money / Merchant Pay to bKash Number: ${BKASH_MERCHANT_NUMBER}\n\n` +
        `Enter your 10-digit bKash Transaction ID (TrxID) below to confirm order:`
    );

    if (userTrxId && userTrxId.trim() !== "") {
        alert(`Thank you! Your Transaction ID (${userTrxId}) has been received. Our support team will verify and contact you shortly.`);
        cart = [];
        saveAndUpdateCart();
        closeCart();
    }
}