document.addEventListener("DOMContentLoaded", () => {
    const navbar = document.getElementById("main-navbar");
    const hero = document.getElementById("hero");
    const dropdownBtn = document.getElementById("dropdown-btn");
    const dropdownContent = document.getElementById("dropdown-content");
    const mobileToggle = document.getElementById("mobile-toggle");
    const mobileClose = document.getElementById("mobile-close");
    const navMenuWrapper = document.getElementById("nav-menu");
    const menuOverlay = document.getElementById("menu-overlay");

    // Helper functions to open/close mobile drawer safely
    const openMenu = () => {
        navMenuWrapper.classList.add("open");
        menuOverlay.classList.add("active");
        document.body.style.overflow = "hidden"; // Prevent background scrolling
    };

    const closeMenu = () => {
        navMenuWrapper.classList.remove("open");
        menuOverlay.classList.remove("active");
        document.body.style.overflow = "auto";
    };

    // 1. Mobile Drawer Triggers
    if (mobileToggle) mobileToggle.addEventListener("click", openMenu);
    if (mobileClose) mobileClose.addEventListener("click", closeMenu);
    if (menuOverlay) menuOverlay.addEventListener("click", closeMenu);

    // 2. Dynamic Dropdown Toggle
    if (dropdownBtn && dropdownContent) {
        dropdownBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdownContent.classList.toggle("show");
            dropdownBtn.classList.toggle("active");
        });

        document.addEventListener("click", (e) => {
            if (!dropdownBtn.contains(e.target) && !dropdownContent.contains(e.target)) {
                dropdownContent.classList.remove("show");
                dropdownBtn.classList.remove("active");
            }
        });
    }

    // 3. Navbar Blurred Emerald Background past 80% Hero
    if (navbar && hero) {
        const observerOptions = {
            root: null,
            threshold: 0.2
        };

        const heroObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    navbar.classList.add("scrolled");
                } else {
                    navbar.classList.remove("scrolled");
                }
            });
        }, observerOptions);

        heroObserver.observe(hero);
    }
});

import { db } from "./firebase-config.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const categoriesContainer = document.getElementById('categories-container');

// 1. Listen to all active categories in real-time
function loadDynamicCategorySections() {
    onSnapshot(collection(db, "categories"), (catSnapshot) => {
        categoriesContainer.innerHTML = '';

        if (catSnapshot.empty) {
            categoriesContainer.innerHTML = `<p style="color: #888; text-align: center; padding: 2rem;">No product categories found.</p>`;
            return;
        }

        catSnapshot.forEach((catDoc) => {
            const categoryData = catDoc.data();
            const categorySlug = catDoc.id; // e.g. 'new-arrivals', 'other-products', 'cnc-milling'
            const categoryName = categoryData.name;

            // Render section shell for each category
            const section = document.createElement('section');
            section.style.cssText = `
                padding: 2rem;
                margin-bottom: 1rem;
            `;

            section.innerHTML = `
                <h2 style="color: #d4a373; text-transform: uppercase; font-size: 1.4rem; letter-spacing: 2px; margin-bottom: 1.2rem; border-left: 4px solid #0b4f37; padding-left: 0.8rem;">
                    ${categoryName}
                </h2>
                <div id="slider-${categorySlug}" style="display: flex; gap: 1.5rem; overflow-x: auto; padding-bottom: 1rem; scroll-behavior: smooth;">
                    <p style="color: #666; font-size: 0.9rem;">Loading products...</p>
                </div>
            `;

            categoriesContainer.appendChild(section);

            // 2. Fetch products specifically belonging to this category
            loadProductsForCategory(categorySlug);
        });
    });
}

// 2. Query products for a specific category slider
function loadProductsForCategory(categorySlug) {
    const sliderEl = document.getElementById(`slider-${categorySlug}`);
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

            // Product card with rounded top photo and solid bottom info box
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
                    <img src="${product.imageUrl}" alt="${product.title}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div style="padding: 1.2rem; background: #161b1b;">
                    <h3 style="color: #fff; font-size: 1.1rem; margin: 0 0 0.5rem 0; font-weight: 600;">${product.title}</h3>
                    <p style="color: #a0a0a0; font-size: 0.85rem; margin: 0 0 0.8rem 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${product.shortDescription || ''}
                    </p>
                    <div style="color: #d4a373; font-weight: bold; font-size: 1.1rem;">
                        ৳ ${Number(product.price).toLocaleString()}
                    </div>
                </div>
            `;

            // Hover animation
            card.addEventListener('mouseenter', () => card.style.transform = 'translateY(-5px)');
            card.addEventListener('mouseleave', () => card.style.transform = 'translateY(0)');

            // Route to single product details page
            card.addEventListener('click', () => {
                window.location.href = `product.html?id=${productId}`;
            });

            sliderEl.appendChild(card);
        });
    });
}

// Initialize dynamic load
loadDynamicCategorySections();