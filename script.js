// ========================================================
// 1. IMPORTS (ALL MUST BE AT THE TOP OF THE MODULE)
// ========================================================
import { db } from "./firebase-config.js";
import { safeFetch, saveToCache, loadFromCache } from "./cache.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

// ========================================================
// 2. STATE VARIABLES
// ========================================================
let targetStats = { machines: 0, clients: 0, years: 0 };
let hasAnimated = false;
let selectedRating = 5; // Default star rating for review submit

// UNIFIED LOCAL STORAGE KEY: Uses 'cart' to sync across all pages
let cart = JSON.parse(localStorage.getItem("cart")) || [];

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
  const categoriesContainer = document.getElementById("categories-container");

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
      if (
        !dropdownBtn.contains(e.target) &&
        !navCategoryDropdown.contains(e.target)
      ) {
        navCategoryDropdown.classList.add("hidden");
        dropdownBtn.classList.remove("active");
      }
    });
  }

  // ----------------------------------------------------
  // Navbar Scroll Observer
  // ----------------------------------------------------
  if (navbar && hero) {
    const heroObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            navbar.classList.add("scrolled");
          } else {
            navbar.classList.remove("scrolled");
          }
        });
      },
      { threshold: 0.2 },
    );

    heroObserver.observe(hero);
  }

  // ----------------------------------------------------
  // Real-time Category Loader & Dropdown Sync
  // ----------------------------------------------------
  function loadDynamicCategories() {
    safeFetch(
      "categories",
      async () => {
        const res = await fetch("/api/categories");
        if (!res.ok) throw new Error("API failed: " + res.status);
        return await res.json();
      },
      "categories",
      (cats) => {
        if (!cats) return;
        if (categoriesContainer) categoriesContainer.innerHTML = "";
        if (navCategoryDropdown) navCategoryDropdown.innerHTML = "";
        if (cats.length === 0) return;

        const hasNewArrivals = cats.find((c) => {
          const cleanId = c.id.toLowerCase().replace(/[\s_]+/g, "-");
          return cleanId === "new-arrivals" || cleanId === "newarrivals";
        });
        const hasOtherProducts = cats.find((c) => {
          const cleanId = c.id.toLowerCase().replace(/[\s_]+/g, "-");
          return cleanId === "other-products" || cleanId === "otherproducts";
        });
        const middleCategories = cats.filter(
          (c) => c.id !== hasNewArrivals?.id && c.id !== hasOtherProducts?.id,
        );

        if (hasNewArrivals) renderCategorySection(hasNewArrivals);
        renderStatsSectionBlock();
        renderShowcaseBlock();
        middleCategories.forEach((cat) => renderCategorySection(cat));
        if (hasOtherProducts) renderCategorySection(hasOtherProducts);

        observeStatsSection();
      },
    );
  }

  function renderShowcaseBlock() {
    if (!categoriesContainer) return;

    if (!document.getElementById("showcase-styles")) {
      const style = document.createElement("style");
      style.id = "showcase-styles";
      style.textContent = `
            #showcase-section {
                background: #0e1111;
                padding: 3rem 0 5rem;
                margin: 0;
                overflow: hidden;
            }
        .showcase-stage {
    padding: 3rem 2rem;
    display: flex;
    justify-content: center;
    align-items: center;
    perspective: 900px;
}
         .showcase-float-wrap {
    width: 100%;
    max-width: 770px;
    animation: showcaseFloat 9s ease-in-out infinite;
    transform-style: preserve-3d;
    will-change: transform;
}
@keyframes showcaseFloat {
    0% {
        transform: translateY(0) translateZ(0)
                   rotateX(0deg) rotateY(-3deg) rotateZ(-0.4deg);
    }
    25% {
        transform: translateY(-10px) translateZ(20px)
                   rotateX(2.5deg) rotateY(2deg) rotateZ(0.3deg);
    }
    50% {
        transform: translateY(-18px) translateZ(35px)
                   rotateX(-2deg) rotateY(4deg) rotateZ(0.5deg);
    }
    75% {
        transform: translateY(-8px) translateZ(15px)
                   rotateX(1.5deg) rotateY(-2deg) rotateZ(-0.3deg);
    }
    100% {
        transform: translateY(0) translateZ(0)
                   rotateX(0deg) rotateY(-3deg) rotateZ(-0.4deg);
    }
}
            .showcase-card {
                position: relative;
                width: 100%;
                aspect-ratio: 4 / 3;
                border-radius: 28px;
                overflow: hidden;
                background: #121616;
               
box-shadow:
                0 30px 60px -20px rgba(11, 79, 55, 0.9),
                0 20px 50px -15px rgba(212, 163, 115, 0.35),
                0 0 80px -10px rgba(14, 98, 69, 0.4);
                transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                cursor: grab;
                user-select: none;
                touch-action: pan-y;
            }
            .showcase-card:active { cursor: grabbing; }
            .showcase-card.swiping { transition: none; }
            .showcase-track {
                display: flex;
                width: 100%;
                height: 100%;
                transition: transform 0.75s cubic-bezier(0.16, 1, 0.3, 1);
                will-change: transform;
            }
            .showcase-track.no-transition { transition: none; }
                .showcase-slide {
                    flex: 0 0 100%;
                    width: 100%;
                    min-width: 0;
                    max-width: 100%;
                    height: 100%;
                    overflow: hidden;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
            .showcase-slide img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
                pointer-events: none;
                -webkit-user-drag: none;
            }
            .showcase-arrow {
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: rgba(11, 79, 55, 0.15);
                border: 1px solid rgba(212, 163, 115, 0.18);
                color: rgba(212, 163, 115, 0.45);
                font-size: 1.5rem;
                line-height: 1;
                cursor: pointer;
                z-index: 5;
                opacity: 0.35;
                transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0 0 3px 0;
            }
            .showcase-arrow:hover {
                opacity: 1;
                background: rgba(11, 79, 55, 0.9);
                border-color: #d4a373;
                color: #d4a373;
                box-shadow:
                    0 0 28px rgba(212, 163, 115, 0.6),
                    0 0 10px rgba(212, 163, 115, 0.4) inset;
                transform: translateY(-50%) scale(1.1);
            }
            .showcase-arrow-prev { left: 16px; }
            .showcase-arrow-next { right: 16px; }

            @media (hover: none) and (pointer: coarse) {
                .showcase-arrow { display: none; }
            }
                @media (max-width: 640px) {
                .showcase-stage { padding: 2rem 1.5rem; }
                .showcase-float-wrap { max-width: 92%; }
                #showcase-section { padding: 2rem 0 3.5rem; }
            }
        `;
      document.head.appendChild(style);
    }

    const section = document.createElement("section");
    section.id = "showcase-section";
    section.innerHTML = `
        <div class="showcase-stage">
            <div class="showcase-float-wrap">
                <div class="showcase-card" id="showcase-card">
                    <div class="showcase-track" id="showcase-track"></div>
                </div>
            </div>
        </div>
    `;

    categoriesContainer.appendChild(section);
    loadShowcaseImages();
  }

  function loadShowcaseImages() {
    const track = document.getElementById("showcase-track");
    const card = document.getElementById("showcase-card");
    if (!track || !card) return;

    safeFetch(
      "showcase",
      async () => {
        const res = await fetch("/api/showcase");
        if (!res.ok) throw new Error("API failed: " + res.status);
        return await res.json();
      },
      "showcase",
      (images) => {
        track.innerHTML = "";
        if (!images || images.length === 0) {
          track.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#555;font-style:italic;font-size:0.9rem;background:#121616;">Showcase coming soon</div>`;

          return;
        }

        images.forEach((img) => {
          const slide = document.createElement("div");
          slide.className = "showcase-slide";
          slide.innerHTML = `<img src="${img.imageUrl}" alt="" loading="lazy">`;
          track.appendChild(slide);
        });

        const total = images.length;
        let current = 0;
        let autoTimer = null;
        let isInteracting = false;

        const goTo = (delta) => {
          current = (current + delta + total) % total;
          track.classList.remove("no-transition");
          track.style.transform = `translateX(-${current * 100}%)`;
        };

        const stopAuto = () => {
          if (autoTimer) clearInterval(autoTimer);
          autoTimer = null;
        };
        const startAuto = () => {
          stopAuto();
          if (total <= 1) return;
          autoTimer = setInterval(() => {
            if (!isInteracting) goTo(1);
          }, 5000);
        };



        const pauseFloat = () => {
          const w = card.closest(".showcase-float-wrap");
          if (w) w.style.animationPlayState = "paused";
        };
        const resumeFloat = () => {
          const w = card.closest(".showcase-float-wrap");
          if (w) w.style.animationPlayState = "running";
        };

        let dragging = false,
          startX = 0,
          currentX = 0;

        const onPointerDown = (e) => {
          if (e.target.closest(".showcase-arrow")) return;
          if (total <= 1) return;
          if (e.pointerType === "mouse" && e.button !== 0) return;
          dragging = true;
          isInteracting = true;
          startX = e.clientX;
          currentX = startX;
          try {
            card.setPointerCapture(e.pointerId);
          } catch (_) {}
          card.classList.add("swiping");
          track.classList.add("no-transition");
          pauseFloat();
        };

        const onPointerMove = (e) => {
          if (!dragging) return;
          currentX = e.clientX;
          const delta = currentX - startX;
          const percent = (delta / card.offsetWidth) * 100;
          track.style.transform = `translateX(calc(-${current * 100}% + ${percent}%))`;
          const tilt = Math.max(-12, Math.min(12, delta / 12));
          card.style.transform = `perspective(900px) rotateY(${tilt}deg) rotateZ(${tilt * 0.15}deg)`;
        };

        const onPointerUp = () => {
          if (!dragging) return;
          dragging = false;
          const delta = currentX - startX;
          const threshold = card.offsetWidth * 0.15;
          card.classList.remove("swiping");
          track.classList.remove("no-transition");
          card.style.transform = "";
          if (delta > threshold) goTo(-1);
          else if (delta < -threshold) goTo(1);
          else track.style.transform = `translateX(-${current * 100}%)`;
          setTimeout(resumeFloat, 700);
          setTimeout(() => {
            isInteracting = false;
          }, 800);
          startAuto();
        };

        card.addEventListener("pointerdown", onPointerDown);
        card.addEventListener("pointermove", onPointerMove);
        card.addEventListener("pointerup", onPointerUp);
        card.addEventListener("pointercancel", onPointerUp);
        card.addEventListener("dragstart", (e) => e.preventDefault());

        track.style.transform = "translateX(0)";
        startAuto();
      },
    );
  }

  // Helper: Dynamically creates and places the Stats Section in sequence
  function renderStatsSectionBlock() {
    if (!categoriesContainer) return;
    hasAnimated = false;

    const statsSection = document.createElement("section");
    statsSection.id = "impact-stats-section";
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
    const statsEl = document.getElementById("impact-stats-section");
    if (statsEl) {
      const statsObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !hasAnimated) {
              hasAnimated = true;
              animateCounter(
                "stat-machines-display",
                targetStats.machines,
                "+",
              );
              animateCounter("stat-clients-display", targetStats.clients, "+");
              animateCounter("stat-years-display", targetStats.years, "%");
            }
          });
        },
        { threshold: 0.5 },
      );

      statsObserver.observe(statsEl);
    }
  }

  // Category Sections & Dropdown Links Helper
  function renderCategorySection(cat) {
    if (!categoriesContainer) return;

    if (navCategoryDropdown) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `#category-${cat.id}`;
      a.textContent = cat.name;
      a.style.cssText = `display: block; padding: 0.6rem 1rem; color: #fff; text-decoration: none; transition: background 0.2s ease;`;
      a.addEventListener("mouseenter", () => (a.style.background = "#0b4f37"));
      a.addEventListener(
        "mouseleave",
        () => (a.style.background = "transparent"),
      );
      a.addEventListener("click", () => {
        navCategoryDropdown.classList.add("hidden");
        if (dropdownBtn) dropdownBtn.classList.remove("active");
      });
      li.appendChild(a);
      navCategoryDropdown.appendChild(li);
    }

    const section = document.createElement("section");
    section.id = `category-${cat.id}`;
    section.style.cssText = `padding: 2rem; margin-bottom: 1rem; scroll-margin-top: 90px;`;

    section.innerHTML = `
    <div class="category-heading-row">
        <h2>${escapeHtml(cat.name)}</h2>
        <a class="see-all-btn" href="catalog.html?category=${encodeURIComponent(cat.id)}">
            See All <i class="fa-solid fa-arrow-right"></i>
        </a>
    </div>
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

    safeFetch(
      `products-${categorySlug}`,
      async () => {
        const res = await fetch(
          `/api/products?category=${encodeURIComponent(categorySlug)}`,
        );
        if (!res.ok) throw new Error("API failed: " + res.status);
        return await res.json();
      },
      "products",
      (allProducts) => {
        sliderEl.innerHTML = "";
        // allProducts may be the full list from snapshot — filter by category here
        const products = (allProducts || []).filter(
          (p) => p.category === categorySlug,
        );

        if (products.length === 0) {
          sliderEl.innerHTML = `<p style="color: #666; font-size: 0.85rem; font-style: italic;">No items currently listed in this category.</p>`;
          return;
        }

        products.forEach((product) => {
          const productId = product.id;
          const card = document.createElement("div");
          const isNarrow = window.innerWidth < 640;
          const cardWidth = isNarrow ? "190px" : "280px";
          card.style.cssText = `
                        min-width: ${cardWidth};
                        max-width: ${cardWidth};
                        background: #161b1b;
                        border: 1px solid rgba(212, 163, 115, 0.2);
                        border-radius: 12px;
                        overflow: hidden;
                        cursor: pointer;
                        transition: transform 0.3s ease, box-shadow 0.3s ease;
                        flex-shrink: 0;
                    `;

          const hasImg = !!product.imageUrl;
          const imgHtml = hasImg
            ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.title || "")}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none';this.parentElement.querySelector('.img-placeholder').style.display='flex';">`
            : "";
          const phHtml = `<div class="img-placeholder" style="display:${hasImg ? "none" : "flex"};position:absolute;inset:0;">
                        <i class="fa-solid fa-image"></i>
                        <span class="ph-main">Photo not available</span>
                        <span class="ph-sub">Sorry about that</span>
                    </div>`;

          card.innerHTML = `
                        <div style="width: 100%; height: ${isNarrow ? "130px" : "200px"}; overflow: hidden; background: #000; position: relative;">
                            ${imgHtml}
                            ${phHtml}
                        </div>
                        <div style="padding: ${isNarrow ? "0.7rem" : "1.2rem"}; background: #161b1b;">
                            <h3 style="color: #fff; font-size: ${isNarrow ? "0.85rem" : "1.1rem"}; margin: 0 0 0.4rem 0; font-weight: 600;">${escapeHtml(product.title || "")}</h3>
                            <p style="color: #a0a0a0; font-size: ${isNarrow ? "0.75rem" : "0.85rem"}; margin: 0 0 0.6rem 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${escapeHtml(product.shortDescription || "")}
                            </p>
                            <div style="color: #d4a373; font-weight: bold; font-size: ${isNarrow ? "0.9rem" : "1.1rem"};">
                                ৳ ${Number(product.price || 0).toLocaleString()}
                            </div>
                        </div>
                    `;

          card.addEventListener(
            "mouseenter",
            () => (card.style.transform = "translateY(-5px)"),
          );
          card.addEventListener(
            "mouseleave",
            () => (card.style.transform = "translateY(0)"),
          );
          card.addEventListener("click", () => {
            if (window.trackProductView) window.trackProductView(product.title);
            window.location.href = `product.html?id=${productId}`;
          });

          sliderEl.appendChild(card);
        });
      },
    );
  }

  // Initializations
  await initStats();
  await loadFooterPages();
  initCart();
  loadDynamicCategories();
  initReviewsSection();
});

// Sync cart dynamically when user navigates back to index.html
window.addEventListener("pageshow", () => {
  cart = JSON.parse(localStorage.getItem("cart")) || [];
  updateCartUI();
});

// ========================================================
// 4. CART & DRAWER FUNCTIONALITY
// ========================================================
function initCart() {
  const cartBtn = document.getElementById("nav-cart-btn");
  const closeCartBtn = document.getElementById("close-cart-btn");
  const cartDrawer = document.getElementById("cart-drawer");
  const cartOverlay = document.getElementById("cart-overlay");
  const bkashModalOverlay = document.getElementById("bkash-modal-overlay");
  const closeBkashModalBtn = document.getElementById("close-bkash-modal-btn");
  const cartWhatsappBtn = document.getElementById("cart-whatsapp-btn");
  const cartBkashBtn = document.getElementById("cart-bkash-btn");

  const openCart = () => {
    if (cartDrawer) cartDrawer.classList.add("open");
    if (cartOverlay) cartOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  const closeCart = () => {
    if (cartDrawer) cartDrawer.classList.remove("open");
    if (cartOverlay) cartOverlay.classList.remove("active");
    document.body.style.overflow = "auto";
  };

  if (cartBtn) cartBtn.addEventListener("click", openCart);
  if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);
  if (cartOverlay) cartOverlay.addEventListener("click", closeCart);

  if (closeBkashModalBtn && bkashModalOverlay) {
    closeBkashModalBtn.addEventListener("click", () => {
      bkashModalOverlay.classList.remove("active");
    });
  }

  if (cartWhatsappBtn) {
    cartWhatsappBtn.addEventListener("click", async () => {
      if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
      }

      let phone = "8801700000000"; // Fallback
      const cached = loadFromCache("site_info");
      if (cached && cached.whatsappNumber) {
        phone = cached.whatsappNumber.replace(/[^0-9]/g, "");
      } else {
        try {
          const res = await fetch("/api/stats");
          if (res.ok) {
            const data = await res.json();
            if (data.whatsappNumber)
              phone = data.whatsappNumber.replace(/[^0-9]/g, "");
          }
        } catch (e) {
          console.error("WhatsApp phone fetch failed:", e);
        }
      }

      let message =
        "Hello CBM Machineries, I would like to order the following items:\n\n";
      let total = 0;
      cart.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        message += `${index + 1}. ${item.title} x ${item.quantity} - ৳${subtotal.toLocaleString()}\n`;
      });
      message += `\nTotal Amount: ৳${total.toLocaleString()}`;

      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
        "_blank",
      );
    });
  }

  if (cartBkashBtn) {
    cartBkashBtn.addEventListener("click", async () => {
      if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
      }

      let bkashAcc = "01700000000"; // Fallback
      // Prefer cached site info first
      const cached = loadFromCache("site_info");
      if (cached && cached.bkashNumber) {
        bkashAcc = cached.bkashNumber;
      } else {
        try {
          const res = await fetch("/api/stats");
          if (res.ok) {
            const data = await res.json();
            if (data.bkashNumber) bkashAcc = data.bkashNumber;
          }
        } catch (e) {
          console.error("bKash info fetch failed:", e);
        }
      }

      const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const modalAccount = document.getElementById("bkash-modal-account");
      const modalAmount = document.getElementById("bkash-modal-amount");

      if (modalAccount) modalAccount.textContent = bkashAcc;
      if (modalAmount) modalAmount.textContent = `৳ ${total.toLocaleString()}`;

      if (bkashModalOverlay) bkashModalOverlay.classList.add("active");
    });
  }

  updateCartUI();
}

function updateCartUI() {
  const badge = document.getElementById("cart-badge-count");
  const container = document.getElementById("cart-items-container");
  const totalEl = document.getElementById("cart-total-price");

  // UNIFIED STORAGE SAVING: Using 'cart'
  localStorage.setItem("cart", JSON.stringify(cart));

  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (badge) badge.textContent = totalCount;

  if (!container) return;
  container.innerHTML = "";

  if (cart.length === 0) {
    container.innerHTML = `<p style="color: #666; font-size: 0.85rem; text-align: center; margin-top: 2rem;">Your cart is currently empty.</p>`;
    if (totalEl) totalEl.textContent = "৳ 0";
    return;
  }

  let grandTotal = 0;

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    grandTotal += itemTotal;

    const itemEl = document.createElement("div");
    itemEl.className = "cart-item";
    itemEl.innerHTML = `
            <img src="${escapeHtml(item.imageUrl || "")}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
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
  container.querySelectorAll(".cart-qty-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.target.getAttribute("data-index"));
      const action = e.target.getAttribute("data-action");

      if (action === "inc") {
        cart[idx].quantity += 1;
      } else if (action === "dec") {
        if (cart[idx].quantity > 1) {
          cart[idx].quantity -= 1;
        } else {
          cart.splice(idx, 1);
        }
      }
      updateCartUI();
    });
  });

  container.querySelectorAll(".cart-remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.target.getAttribute("data-index"));
      cart.splice(idx, 1);
      updateCartUI();
    });
  });
}

// ========================================================
// 5. CUSTOMER REVIEWS & OPINIONS SYSTEM
// ========================================================
function initReviewsSection() {
  const reviewsGrid = document.getElementById("reviews-grid");
  const reviewForm = document.getElementById("review-form");
  const formMsg = document.getElementById("review-form-msg");
  const starContainer = document.getElementById("star-rating-select");

  // 1. Interactive Star Rating Picker
  if (starContainer) {
    const stars = starContainer.querySelectorAll(".fa-star");
    const updateStarUI = (val) => {
      stars.forEach((star) => {
        const r = parseInt(star.getAttribute("data-rating"));
        if (r <= val) {
          star.classList.add("active");
        } else {
          star.classList.remove("active");
        }
      });
    };

    // Default setup: 5 stars active
    updateStarUI(5);

    stars.forEach((star) => {
      star.addEventListener("click", () => {
        selectedRating = parseInt(star.getAttribute("data-rating"));
        updateStarUI(selectedRating);
      });
    });
  }

  // 2. Fetch & Render Approved Reviews in Real-Time
  if (reviewsGrid) {
    safeFetch(
      "reviews",
      async () => {
        const res = await fetch("/api/reviews");
        if (!res.ok) throw new Error("API failed: " + res.status);
        return await res.json();
      },
      "reviews",
      (reviews) => {
        reviewsGrid.innerHTML = "";
        if (!reviews || reviews.length === 0) {
          reviewsGrid.innerHTML = `
                        <p style="color: #666; font-size: 0.9rem; grid-column: 1 / -1; text-align: center; font-style: italic;">
                            No customer opinions submitted yet. Be the first to share your experience!
                        </p>`;
          return;
        }
        reviews.forEach((data) => {
          const starsCount = Number(data.rating) || 5;
          let starsHtml = "";
          for (let i = 1; i <= 5; i++) {
            starsHtml +=
              i <= starsCount
                ? `<i class="fa-solid fa-star"></i> `
                : `<i class="fa-regular fa-star" style="color: #444;"></i> `;
          }
          const card = document.createElement("div");
          card.className = "review-card";
          card.innerHTML = `
                        <div class="card-stars">${starsHtml}</div>
                        <div class="card-comment">"${escapeHtml(data.comment || "")}"</div>
                        <div class="card-author">${escapeHtml(data.name || "Anonymous Client")}</div>
                    `;
          reviewsGrid.appendChild(card);
        });
      },
    );
  }

  // 3. Review Submission Form Handler
  if (reviewForm) {
    reviewForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nameInput = document.getElementById("review-name");
      const commentInput = document.getElementById("review-comment");

      const nameVal = nameInput ? nameInput.value.trim() : "";
      const commentVal = commentInput ? commentInput.value.trim() : "";

      if (!nameVal || !commentVal) {
        if (formMsg) {
          formMsg.className = "review-form-msg error";
          formMsg.textContent = "Please complete all required fields.";
        }
        return;
      }

      try {
        if (formMsg) {
          formMsg.className = "review-form-msg";
          formMsg.style.color = "#d4a373";
          formMsg.textContent = "Submitting your opinion...";
        }

        await addDoc(collection(db, "reviews"), {
          name: nameVal,
          comment: commentVal,
          rating: selectedRating,
          approved: false, // Moderation gate: requires admin approval
          createdAt: serverTimestamp(),
        });

        if (formMsg) {
          formMsg.className = "review-form-msg success";
          formMsg.textContent =
            "Thank you! Your opinion has been submitted for verification.";
        }

        reviewForm.reset();
        selectedRating = 5;
        if (starContainer) {
          const stars = starContainer.querySelectorAll(".fa-star");
          stars.forEach((s) => s.classList.add("active"));
        }
      } catch (err) {
        console.error("Error submitting review:", err);
        if (formMsg) {
          formMsg.className = "review-form-msg error";
          formMsg.textContent =
            "Failed to send review. Please try again later.";
        }
      }
    });
  }
}

// ========================================================
// 6. HELPER FUNCTIONS & ANIMATION COUNTER
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
    const currentCount = Math.floor(
      targetValue * (1 - Math.pow(1 - progress, 3)),
    );

    el.textContent = currentCount.toLocaleString() + suffix;

    if (frame >= totalFrames) {
      el.textContent = targetValue.toLocaleString() + suffix;
      clearInterval(counterInterval);
    }
  }, frameDuration);
}

async function initStats() {
  await safeFetch(
    "site_info",
    async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("API failed: " + res.status);
      return await res.json();
    },
    "site_info",
    (data) => {
      if (!data) return;
      targetStats = {
        machines: data.machinesSold || 0,
        clients: data.clientsServed || 0,
        years: data.yearsExperience || 0,
      };
      applySiteInfo(data);
    },
  );
}

function applySiteInfo(data) {
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el && val) el.textContent = val;
  };
  setText("footer-hotline", data.hotlineNumber);
  setText("footer-whatsapp", data.whatsappNumber);
  setText("footer-email", data.emailAddress);
  setText("footer-address", data.address);
  setText("footer-hours", data.businessHours);
  // Contact section
  setText("contact-hotline", data.hotlineNumber);
  setText("contact-whatsapp", data.whatsappNumber);
  setText("contact-email", data.emailAddress);
  setText("contact-address", data.address);
  setText("contact-hours", data.businessHours);

  const setLink = (id, val) => {
    const el = document.getElementById(id);
    if (el && val) el.href = val;
  };
  setLink("footer-facebook", data.facebookUrl);
  setLink("footer-youtube", data.youtubeUrl);
  setLink("footer-linkedin", data.linkedinUrl);
  setLink("footer-instagram", data.instagramUrl);

  // Clickable contact links
  const waNum = sanitizePhone(data.whatsappNumber);
  const callNum = data.hotlineNumber
    ? String(data.hotlineNumber).replace(/[^0-9+]/g, "")
    : "";

  const waLink = document.getElementById("footer-whatsapp-link");
  if (waLink && waNum) waLink.href = `https://wa.me/${waNum}`;

  const callLink = document.getElementById("footer-hotline-link");
  if (callLink && callNum) callLink.href = `tel:${callNum}`;

  const emailLink = document.getElementById("footer-email-link");
  if (emailLink && data.emailAddress)
    emailLink.href = `mailto:${data.emailAddress}`;

  const addrLink = document.getElementById("footer-address-link");
  if (addrLink && data.address) {
    addrLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address)}`;
  }

  // FAB
  const fabWa = document.getElementById("fab-whatsapp");
  const fabCall = document.getElementById("fab-call");
  const fabEmail = document.getElementById("fab-email");
  if (fabWa && waNum) fabWa.href = `https://wa.me/${waNum}`;
  if (fabCall && callNum) fabCall.href = `tel:${callNum}`;
  if (fabEmail && data.emailAddress)
    fabEmail.href = `mailto:${data.emailAddress}`;
  // Contact section links
  const cHot = document.getElementById("contact-hotline-card");
  const cWa = document.getElementById("contact-whatsapp-card");
  const cMail = document.getElementById("contact-email-card");
  const cAddr = document.getElementById("contact-address-card");
  if (cHot && callNum) cHot.href = `tel:${callNum}`;
  if (cWa && waNum) cWa.href = `https://wa.me/${waNum}`;
  if (cMail && data.emailAddress) cMail.href = `mailto:${data.emailAddress}`;
  if (cAddr && data.address)
    cAddr.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address)}`;
}

function sanitizePhone(num) {
  if (!num) return "";
  let n = String(num).replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "880" + n.substring(1);
  if (!n.startsWith("880") && n.length === 10) n = "880" + n;
  return n;
}

// --- FLOATING ACTION BUTTON ---
(function () {
  const fab = document.getElementById("fab-container");
  const toggle = document.getElementById("fab-toggle");
  if (!fab || !toggle) return;

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    fab.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!fab.contains(e.target)) fab.classList.remove("open");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fab.classList.remove("open");
  });
})();
// ============================================================
// PRODUCT SEARCH
// ============================================================
(function () {
  const searchBtn = document.getElementById("nav-search-btn");
  const overlay = document.getElementById("search-overlay");
  const closeBtn = document.getElementById("search-close");
  const input = document.getElementById("search-input");
  const resultsBox = document.getElementById("search-results");

  if (!searchBtn || !overlay || !input || !resultsBox) return;

  let allProducts = null;

  const openSearch = () => {
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
    setTimeout(() => input.focus(), 100);
    preloadProducts();
  };

  const closeSearch = () => {
    overlay.classList.remove("active");
    document.body.style.overflow = "auto";
    input.value = "";
    resultsBox.style.display = "none";
    resultsBox.innerHTML = "";
  };

  async function preloadProducts() {
    if (allProducts) return;
    // Try cache first, then API
    const cached = loadFromCache("all_products");
    if (cached && Array.isArray(cached)) {
      allProducts = cached;
      return;
    }
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("API " + res.status);
      allProducts = await res.json();
    } catch (err) {
      console.error("Search preload failed:", err);
      allProducts = [];
    }
  }

  function renderResults(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      resultsBox.style.display = "none";
      return;
    }
    if (!allProducts) {
      resultsBox.style.display = "block";
      resultsBox.innerHTML = `<div class="search-empty">Loading products...</div>`;
      return;
    }

    const matches = allProducts
      .filter(
        (p) =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.shortDescription || "").toLowerCase().includes(q) ||
          (p.longDescription || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q),
      )
      .slice(0, 12);

    resultsBox.style.display = "block";

    if (matches.length === 0) {
      resultsBox.innerHTML = `<div class="search-empty">No products found for "${escapeHtml(query)}"</div>`;
      return;
    }

    resultsBox.innerHTML = matches
      .map((p) => {
        const img = p.imageUrl
          ? `<img src="${escapeHtml(p.imageUrl)}" alt="">`
          : `<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='52' height='52'%3E%3Crect fill='%23121216' width='52' height='52'/%3E%3C/svg%3E" alt="">`;
        return `
                <a class="search-result-row" href="product.html?id=${encodeURIComponent(p.id)}">
                    ${img}
                    <div class="search-result-info">
                        <div class="search-result-title">${escapeHtml(p.title || "Untitled")}</div>
                        <div class="search-result-meta">${escapeHtml(p.shortDescription || p.category || "")}</div>
                    </div>
                    <div class="search-result-price">৳ ${Number(p.price || 0).toLocaleString()}</div>
                </a>`;
      })
      .join("");
  }

  searchBtn.addEventListener("click", openSearch);
  closeBtn.addEventListener("click", closeSearch);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeSearch();
  });
  input.addEventListener("input", () => renderResults(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const first = resultsBox.querySelector(".search-result-row");
      if (first) first.click();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("active"))
      closeSearch();
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      overlay.classList.contains("active") ? closeSearch() : openSearch();
    }
  });
})();

async function loadFooterPages() {
  const listEl = document.getElementById("footer-pages-list");
  if (!listEl) return;

  await safeFetch(
    "footer_pages",
    async () => {
      const res = await fetch("/api/pages");
      if (!res.ok) throw new Error("API failed: " + res.status);
      return await res.json();
    },
    "footer_pages",
    (pages) => {
      if (!pages) return;
      const visible = pages.filter((p) => p.showInFooter !== false);
      visible.sort((a, b) =>
        String(a.title || "").localeCompare(String(b.title || "")),
      );

      if (visible.length === 0) {
        listEl.innerHTML = `<li style="color:#666; font-size:0.85rem;">No pages yet</li>`;
        return;
      }
      listEl.innerHTML = visible
        .map(
          (p) =>
            `<li><a href="page.html?slug=${encodeURIComponent(p.slug || p.id)}">${escapeHtml(p.title || "Untitled")}</a></li>`,
        )
        .join("");
    },
  );
}

// ============================================================
// HERO TAGLINE ROTATOR
// ============================================================
(function () {
  const rotator = document.getElementById("hero-rotator");
  if (!rotator) return;
  const items = rotator.querySelectorAll(".hero-rotator-item");
  if (items.length < 2) return;

  let current = 0;
  setInterval(() => {
    const prev = items[current];
    prev.classList.remove("active");
    prev.classList.add("exit");
    setTimeout(() => prev.classList.remove("exit"), 700);
    current = (current + 1) % items.length;
    items[current].classList.add("active");
  }, 3800);
})();

// ============================================================
// POND CANVAS (hero background)
// ============================================================
(function () {
  const canvas = document.getElementById("pond-canvas");
  const hero = document.getElementById("hero");
  if (!canvas || !hero) return;
  const ctx = canvas.getContext("2d");

  let w = 0,
    h = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  function resize() {
    w = hero.clientWidth;
    h = hero.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  const COLORS = [
    { r: 20, g: 130, b: 95 },
    { r: 80, g: 200, b: 180 },
    { r: 30, g: 170, b: 130 },
    { r: 100, g: 220, b: 200 },
  ];

  const isMobile = window.matchMedia("(hover: none)").matches;
  const BLOB_COUNT = isMobile ? 9 : 14;

  const blobs = [];
  function makeBlob() {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      angle: Math.random() * Math.PI * 2,
      speed: 0.18 + Math.random() * 0.35,
      radius: 40 + Math.random() * 65,
      color: color,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.006 + Math.random() * 0.01,
    };
  }
  for (let i = 0; i < BLOB_COUNT; i++) blobs.push(makeBlob());

  const pointer = {
    x: w / 2,
    y: h / 2,
    tx: w / 2,
    ty: h / 2,
    active: false,
    lastMoveTime: 0,
  };

  const fragments = [];
  const FRAGMENT_COUNT = 4;
  for (let i = 0; i < FRAGMENT_COUNT; i++) {
    fragments.push({
      baseAngle: (i / FRAGMENT_COUNT) * Math.PI * 2,
      angleWobble: (Math.random() - 0.5) * 0.6,
      distance: 70 + Math.random() * 80,
      radiusScale: 0.4 + Math.random() * 0.28,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.006 + Math.random() * 0.012,
      x: w / 2,
      y: h / 2,
    });
  }
  let spreadAmount = 1;
  let spreadTarget = 1;

  hero.addEventListener("mousemove", (e) => {
    const rect = hero.getBoundingClientRect();
    pointer.tx = e.clientX - rect.left;
    pointer.ty = e.clientY - rect.top;
    pointer.active = true;
    pointer.lastMoveTime = performance.now();
  });
  hero.addEventListener("mouseleave", () => {
    pointer.active = false;
  });
  hero.addEventListener(
    "touchmove",
    (e) => {
      const rect = hero.getBoundingClientRect();
      const t = e.touches[0];
      pointer.tx = t.clientX - rect.left;
      pointer.ty = t.clientY - rect.top;
      pointer.active = true;
      pointer.lastMoveTime = performance.now();
    },
    { passive: true },
  );

  window.addEventListener(
    "scroll",
    () => {
      if (isMobile) pointer.lastMoveTime = performance.now();
    },
    { passive: true },
  );

  let wanderPhase = Math.random() * 1000;

  function drawBlob(b) {
    b.pulse += b.pulseSpeed;
    const r = b.radius * (1 + Math.sin(b.pulse) * 0.2);
    const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
    grad.addColorStop(0, `rgba(${b.color.r},${b.color.g},${b.color.b},0.32)`);
    grad.addColorStop(0.3, `rgba(${b.color.r},${b.color.g},${b.color.b},0.16)`);
    grad.addColorStop(
      0.65,
      `rgba(${b.color.r},${b.color.g},${b.color.b},0.04)`,
    );
    grad.addColorStop(1, `rgba(${b.color.r},${b.color.g},${b.color.b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function moveBlob(b) {
    b.angle += (Math.random() - 0.5) * 0.06;
    b.x += Math.cos(b.angle) * b.speed;
    b.y += Math.sin(b.angle) * b.speed;
    if (b.x < -b.radius) {
      b.x = -b.radius;
      b.angle = Math.PI - b.angle;
    }
    if (b.x > w + b.radius) {
      b.x = w + b.radius;
      b.angle = Math.PI - b.angle;
    }
    if (b.y < -b.radius) {
      b.y = -b.radius;
      b.angle = -b.angle;
    }
    if (b.y > h + b.radius) {
      b.y = h + b.radius;
      b.angle = -b.angle;
    }
  }

  function drawSingleGlow(cx, cy, radius, alphaScale) {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(200, 235, 225, ${0.55 * alphaScale})`);
    grad.addColorStop(0.25, `rgba(120, 220, 200, ${0.22 * alphaScale})`);
    grad.addColorStop(0.6, `rgba(20, 130, 95, ${0.07 * alphaScale})`);
    grad.addColorStop(1, "rgba(20, 130, 95, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPointerGlow() {
    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;

    const idle = performance.now() - pointer.lastMoveTime > 2000;

    if ((!pointer.active || idle) && isMobile) {
      wanderPhase += 0.005;
      pointer.tx = w / 2 + Math.cos(wanderPhase) * w * 0.28;
      pointer.ty = h / 2 + Math.sin(wanderPhase * 1.3) * h * 0.22;
      pointer.active = true;
    }

    if (!pointer.active) return;

    if (!isMobile) {
      drawSingleGlow(pointer.x, pointer.y, 160, 1);
      return;
    }

    spreadTarget = idle ? 1 : 0;
    spreadAmount += (spreadTarget - spreadAmount) * 0.035;

    drawSingleGlow(pointer.x, pointer.y, 100, 0.35);

    for (let i = 0; i < fragments.length; i++) {
      const f = fragments[i];
      f.wobblePhase += f.wobbleSpeed;
      const angle =
        f.baseAngle + f.angleWobble + Math.sin(f.wobblePhase) * 0.25;
      const dist = f.distance * spreadAmount;
      const targetX = pointer.x + Math.cos(angle) * dist;
      const targetY = pointer.y + Math.sin(angle) * dist;
      f.x += (targetX - f.x) * 0.14;
      f.y += (targetY - f.y) * 0.14;
      const r = 90 * f.radiusScale * (1 + spreadAmount * 0.35);
      const alphaScale = 0.85 + spreadAmount * 0.35;
      drawSingleGlow(f.x, f.y, r, alphaScale);
    }
  }

  function render() {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = "lighter";

    for (let i = 0; i < blobs.length; i++) {
      moveBlob(blobs[i]);
      drawBlob(blobs[i]);
    }
    drawPointerGlow();

    requestAnimationFrame(render);
  }

  render();
})();

// ============================================================
// CONTACT FORM -> WHATSAPP
// ============================================================
(function () {
  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = (document.getElementById("contact-name").value || "").trim();
    const phone = (document.getElementById("contact-phone").value || "").trim();
    const subject = (
      document.getElementById("contact-subject").value || ""
    ).trim();
    const message = (
      document.getElementById("contact-message").value || ""
    ).trim();

    if (!name || !phone || !message) return;

    // Fetch WhatsApp number — cache first, then API, then fallback
    let waNum = "8801700000000";
    const cachedInfo = loadFromCache("site_info");
    let waSource = cachedInfo?.whatsappNumber;
    if (!waSource) {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          waSource = data.whatsappNumber;
        }
      } catch (err) {
        console.warn(
          "Contact form: WhatsApp fetch failed, using fallback.",
          err,
        );
      }
    }
    if (waSource) {
      let n = String(waSource).replace(/[^0-9]/g, "");
      if (n.startsWith("0")) n = "880" + n.substring(1);
      if (!n.startsWith("880") && n.length === 10) n = "880" + n;
      waNum = n;
    }

    const composed =
      `*New enquiry from CBM Website*\n\n` +
      `*Name:* ${name}\n` +
      `*Phone:* ${phone}\n` +
      (subject ? `*Subject:* ${subject}\n` : "") +
      `\n*Message:*\n${message}`;

    window.open(
      `https://wa.me/${waNum}?text=${encodeURIComponent(composed)}`,
      "_blank",
    );
  });
})();
