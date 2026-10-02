// ============================================================
// LEAD TRACKING — goes through backend now
// ============================================================

window.userSession = window.userSession || {
  id:
    localStorage.getItem("lead_user_id") ||
    "guest_" + Math.random().toString(36).slice(2, 11),
  phone: localStorage.getItem("lead_phone") || null,
  views: JSON.parse(localStorage.getItem("lead_views") || "[]"),
  cart: JSON.parse(localStorage.getItem("lead_cart") || "[]"),
};
localStorage.setItem("lead_user_id", window.userSession.id);

function persistLocal() {
  localStorage.setItem("lead_views", JSON.stringify(window.userSession.views));
  localStorage.setItem("lead_cart", JSON.stringify(window.userSession.cart));
}

// Debounced sync
let syncTimer = null;
function scheduleSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(pushToBackend, 250);
}

function flushPendingSync() {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
    pushToBackend();
  }
}

async function pushToBackend() {
  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: window.userSession.id,
        phone: window.userSession.phone || "Guest User",
        productViews: window.userSession.views,
        cartItems: window.userSession.cart.map(
          (c) => `${c.title} (x${c.quantity})`,
        ),
      }),
    });
    if (!res.ok) console.warn("Lead sync returned", res.status);
  } catch (err) {
    console.warn("Lead sync failed:", err);
  }
}

// ============================================================
// PUBLIC API
// ============================================================

window.trackProductView = function (productTitle, opts = {}) {
  if (productTitle && !window.userSession.views.includes(productTitle)) {
    window.userSession.views.push(productTitle);
    persistLocal();
    scheduleSync();
  }
  if (opts.prompt) maybeShowModal();
};

window.trackCartAdd = function (productTitle, qty = 1) {
  if (!productTitle) return;
  const row = window.userSession.cart.find((c) => c.title === productTitle);
  if (row) row.quantity += qty;
  else window.userSession.cart.push({ title: productTitle, quantity: qty });
  persistLocal();
  scheduleSync();
};

// ============================================================
// LEAD CAPTURE MODAL
// ============================================================
function maybeShowModal() {
  if (localStorage.getItem("lead_prompt_shown")) return;
  if (document.getElementById("leadModal")) return;

  const html = `
        <div id="leadModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.78);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:1rem;">
            <div style="background:#161b1c;border:1px solid rgba(212,163,115,0.3);padding:28px;border-radius:12px;max-width:400px;width:100%;text-align:center;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
                <div style="font-size:2rem;margin-bottom:0.5rem;">👋</div>
                <h3 style="margin:0 0 0.5rem;color:#d4a373;font-size:1.2rem;">Welcome to CBM Machineries</h3>
                <p style="font-size:0.9rem;color:#a0a5a5;line-height:1.5;margin:0 0 1.2rem;">
                    Drop your phone number and we'll send you exclusive deals &amp; priority support on the machines you're browsing.
                </p>
                <input type="tel" id="leadPhoneInput" placeholder="01XXXXXXXXX"
                    style="width:100%;padding:12px;margin-bottom:12px;background:#0d1111;border:1px solid #0b4f37;color:#fff;border-radius:8px;box-sizing:border-box;font-size:0.95rem;outline:none;">
                <button id="submitLeadBtn"
                    style="width:100%;padding:12px;background:#d4a373;color:#0d1111;border:none;border-radius:8px;font-weight:700;letter-spacing:0.5px;cursor:pointer;text-transform:uppercase;font-size:0.85rem;">
                    Get Deals &amp; Continue
                </button>
                <button id="skipLeadBtn"
                    style="background:none;border:none;color:#666;cursor:pointer;font-size:0.8rem;margin-top:10px;text-decoration:underline;">
                    Skip for now
                </button>
            </div>
        </div>`;
  document.body.insertAdjacentHTML("beforeend", html);

  const dismiss = () => {
    localStorage.setItem("lead_prompt_shown", "true");
    document.getElementById("leadModal")?.remove();
    pushToBackend();
  };

  document.getElementById("submitLeadBtn").addEventListener("click", () => {
    const phone = document.getElementById("leadPhoneInput").value.trim();
    if (phone) {
      window.userSession.phone = phone;
      localStorage.setItem("lead_phone", phone);
    }
    dismiss();
  });

  document.getElementById("skipLeadBtn").addEventListener("click", dismiss);
}

// Flush pending lead sync when the page is about to be hidden/unloaded
window.addEventListener("pagehide", flushPendingSync);
window.addEventListener("beforeunload", flushPendingSync);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushPendingSync();
});
