import { db } from "./firebase-config.js";
import { safeFetch } from "./cache.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let allProducts = [];
let allCategories = [];
let activeCategorySlug = null;
let priceFloor = 0;
let priceCeiling = 0;

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  activeCategorySlug = urlParams.get("category");

  bindUI();
  await loadCategories();
  await loadProducts();
  initFooterInfo();
  loadFooterPages();
  initFab();
});

async function loadCategories() {
  await safeFetch(
    "categories",
    async () => {
      const snap = await getDocs(collection(db, "categories"));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    "categories",
    (cats) => {
      allCategories = cats || [];
      const listEl = document.getElementById("cat-filter-list");
      if (!listEl) return;
      listEl.innerHTML = "";

      if (activeCategorySlug) {
        listEl.closest(".filter-group").style.display = "none";
        const cat = allCategories.find((c) => c.id === activeCategorySlug);
        if (cat) {
          document.getElementById("page-title").textContent = cat.name;
          document.getElementById("page-subtitle").innerHTML =
            `Showing all products in <strong>${escapeHtml(cat.name)}</strong>`;
          document.title = `${cat.name} - CBM Machineries`;
        }
        return;
      }
      if (allCategories.length === 0) {
        listEl.innerHTML = `<p style="color:#666; font-size:0.8rem;">No categories yet.</p>`;
        return;
      }
      allCategories.forEach((cat) => {
        const label = document.createElement("label");
        label.className = "cat-filter-item";
        label.innerHTML = `
                    <input type="checkbox" value="${escapeHtml(cat.id)}" class="cat-checkbox">
                    <span>${escapeHtml(cat.name || cat.id)}</span>
                `;
        listEl.appendChild(label);
      });
      listEl.querySelectorAll(".cat-checkbox").forEach((cb) => {
        cb.addEventListener("change", applyFilters);
      });
    },
  );
}

async function loadProducts() {
  const grid = document.getElementById("products-grid");
  if (!grid) return;
  grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#666;">Loading products...</p>`;

  await safeFetch(
    activeCategorySlug ? `cat_products_${activeCategorySlug}` : "all_products",
    async () => {
      let q;
      if (activeCategorySlug) {
        q = query(
          collection(db, "products"),
          where("category", "==", activeCategorySlug)
        );
      } else {
        q = collection(db, "products");
      }
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    "products",
    (prods, source) => {
      // Fetch failed — keep the "Loading products..." state and retry.
      if (source === "failed" || prods === null) {
        setTimeout(() => loadProducts(), 2500);
        return;
      }

      allProducts = prods || [];

      if (allProducts.length > 0) {
        const prices = allProducts.map((p) => Number(p.price) || 0);
        priceFloor = 0;
        priceCeiling = Math.ceil(Math.max(...prices) / 1000) * 1000;
        if (priceCeiling < 1000) priceCeiling = 1000;

        const minSlider = document.getElementById("price-min");
        const maxSlider = document.getElementById("price-max");
        minSlider.min = priceFloor;
        minSlider.max = priceCeiling;
        minSlider.value = priceFloor;
        maxSlider.min = priceFloor;
        maxSlider.max = priceCeiling;
        maxSlider.value = priceCeiling;
        updatePriceLabels();
      }
      applyFilters();
    },
  );
}

function applyFilters() {
  const grid = document.getElementById("products-grid");
  const countEl = document.getElementById("results-count");
  if (!grid) return;

  const minVal = Number(document.getElementById("price-min").value);
  const maxVal = Number(document.getElementById("price-max").value);
  const sortVal = document.getElementById("sort-select").value;

  const checkedCats = [
    ...document.querySelectorAll(".cat-checkbox:checked"),
  ].map((cb) => cb.value);

  let filtered = allProducts.filter((p) => {
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
    if (sortVal === "price-asc")
      return (Number(a.price) || 0) - (Number(b.price) || 0);
    if (sortVal === "price-desc")
      return (Number(b.price) || 0) - (Number(a.price) || 0);
    if (sortVal === "name-asc")
      return String(a.title || "").localeCompare(String(b.title || ""));
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

  grid.innerHTML = filtered
    .map((p) => {
      const hasImg = !!p.imageUrl;
      const imgHtml = hasImg
        ? `<img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.title || "")}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
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
                    <h3 class="product-tile-title">${escapeHtml(p.title || "Untitled")}</h3>
                    <p class="product-tile-desc">${escapeHtml(p.shortDescription || "")}</p>
                    <div class="product-tile-price">${p.price ? `৳ ${Number(p.price).toLocaleString()}` : "Price on request"}</div>
                </div>
            </a>`;
    })
    .join("");

  if (countEl)
    countEl.textContent = `${filtered.length} product${filtered.length === 1 ? "" : "s"} found`;
}

function bindUI() {
  const minSlider = document.getElementById("price-min");
  const maxSlider = document.getElementById("price-max");
  const sortSelect = document.getElementById("sort-select");
  const clearBtn = document.getElementById("clear-filters");
  const mobileToggle = document.getElementById("mobile-filter-toggle");
  const filterPanel = document.getElementById("filter-panel");

  minSlider.addEventListener("input", () => {
    if (Number(minSlider.value) > Number(maxSlider.value)) {
      minSlider.value = maxSlider.value;
    }
    updatePriceLabels();
    applyFilters();
  });

  maxSlider.addEventListener("input", () => {
    if (Number(maxSlider.value) < Number(minSlider.value)) {
      maxSlider.value = minSlider.value;
    }
    updatePriceLabels();
    applyFilters();
  });

  sortSelect.addEventListener("change", applyFilters);

  clearBtn.addEventListener("click", () => {
    minSlider.value = priceFloor;
    maxSlider.value = priceCeiling;
    document
      .querySelectorAll(".cat-checkbox")
      .forEach((cb) => (cb.checked = false));
    sortSelect.value = "newest";
    updatePriceLabels();
    applyFilters();
  });

  if (mobileToggle && filterPanel) {
    mobileToggle.addEventListener("click", () =>
      filterPanel.classList.toggle("open"),
    );
  }
}

function updatePriceLabels() {
  const min = Number(document.getElementById("price-min").value);
  const max = Number(document.getElementById("price-max").value);
  document.getElementById("price-min-label").textContent = min.toLocaleString();
  document.getElementById("price-max-label").textContent = max.toLocaleString();
}

async function initFooterInfo() {
  await safeFetch(
    "site_info",
    async () => {
      const snap = await getDoc(doc(db, "site_stats", "global"));
      return snap.exists() ? snap.data() : null;
    },
    "site_info",
    (data) => {
      if (!data) return;
      const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el && val) el.textContent = val;
      };
      setText("footer-hotline", data.hotlineNumber);
      setText("footer-whatsapp", data.whatsappNumber);
      setText("footer-email", data.emailAddress);
      setText("footer-address", data.address);
      setText("footer-hours", data.businessHours);

      const setLink = (id, val) => {
        const el = document.getElementById(id);
        if (el && val) el.href = val;
      };
      setLink("footer-facebook", data.facebookUrl);
      setLink("footer-youtube", data.youtubeUrl);
      setLink("footer-linkedin", data.linkedinUrl);
      setLink("footer-instagram", data.instagramUrl);

      const waNum = sanitizePhone(data.whatsappNumber);
      const callNum = data.hotlineNumber
        ? String(data.hotlineNumber).replace(/[^0-9+]/g, "")
        : "";

      if (waNum) {
        const a = document.getElementById("footer-whatsapp-link");
        if (a) a.href = `https://wa.me/${waNum}`;
        const b = document.getElementById("fab-whatsapp");
        if (b) b.href = `https://wa.me/${waNum}`;
      }
      if (callNum) {
        const a = document.getElementById("footer-hotline-link");
        if (a) a.href = `tel:${callNum}`;
        const b = document.getElementById("fab-call");
        if (b) b.href = `tel:${callNum}`;
      }
      if (data.emailAddress) {
        const a = document.getElementById("footer-email-link");
        if (a) a.href = `mailto:${data.emailAddress}`;
        const b = document.getElementById("fab-email");
        if (b) b.href = `mailto:${data.emailAddress}`;
      }
      if (data.address) {
        const a = document.getElementById("footer-address-link");
        if (a)
          a.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address)}`;
      }
    },
  );
}

function initFab() {
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
}

function sanitizePhone(num) {
  if (!num) return "";
  let n = String(num).replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = "880" + n.substring(1);
  if (!n.startsWith("880") && n.length === 10) n = "880" + n;
  return n;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadFooterPages() {
  const listEl = document.getElementById("footer-pages-list");
  if (!listEl) return;

  await safeFetch(
    "footer_pages",
    async () => {
      const snap = await getDocs(collection(db, "footer_pages"));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
