import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Get Product ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    const loadingSpinner = document.getElementById('loading-spinner');
    const detailCard = document.getElementById('product-detail-card');

    if (!productId) {
        if (loadingSpinner) loadingSpinner.innerHTML = `<p style="color: #ff6b6b;">No product specified.</p>`;
        return;
    }

    try {
        // 2. Fetch Single Product Document from Firestore
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            if (loadingSpinner) loadingSpinner.innerHTML = `<p style="color: #ff6b6b;">Product not found.</p>`;
            return;
        }

        const product = docSnap.data();

        // 3. Populate HTML Elements
        document.getElementById('product-img').src = product.imageUrl || '';
        document.getElementById('product-img').alt = product.title || 'Product Image';
        document.getElementById('product-title').textContent = product.title || 'Untitled Product';
        document.getElementById('product-category').textContent = product.category || 'General';
        document.getElementById('product-price').textContent = `৳ ${Number(product.price || 0).toLocaleString()}`;
        document.getElementById('product-short-desc').textContent = product.shortDescription || '';
        document.getElementById('product-full-desc').textContent = product.fullDescription || product.shortDescription || 'No additional specifications listed.';
        
        // 4. WhatsApp / Phone Contact Link Integration
        const inquireBtn = document.getElementById('inquire-btn');
        if (inquireBtn) {
            const message = encodeURIComponent(`Hello CBM Machineries, I am interested in learning more about: ${product.title} (ID: ${productId})`);
            // Replace with your business phone number
            inquireBtn.href = `https://wa.me/8801700000000?text=${message}`; 
        }

        // Show card and hide loader
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (detailCard) detailCard.style.display = 'block';

    } catch (error) {
        console.error("Error loading product detail:", error);
        if (loadingSpinner) loadingSpinner.innerHTML = `<p style="color: #ff6b6b;">Failed to load product details.</p>`;
    }
});