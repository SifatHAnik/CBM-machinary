// Analytics & Lead Tracking Core
window.userSession = {
  id: localStorage.getItem('lead_user_id') || 'guest_' + Math.random().toString(36).substr(2, 9),
  phone: localStorage.getItem('lead_phone') || null,
  views: [],
  cart: [],
  lastActive: new Date().toISOString()
};

localStorage.setItem('lead_user_id', window.userSession.id);

function checkLeadPrompt(productId) {
  logProductView(productId);
  if (!localStorage.getItem('lead_prompt_shown')) {
    showLeadModal(productId);
  }
}

function showLeadModal(productId) {
  if (document.getElementById('leadModal')) return;

  const modalHtml = `
    <div id="leadModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:9999;font-family:sans-serif;">
      <div style="background:#fff;padding:25px;border-radius:12px;max-width:380px;width:90%;text-align:center;box-shadow:0 4px 15px rgba(0,0,0,0.2);">
        <h3 style="margin-top:0;color:#333;">Exclusive Offers & Support</h3>
        <p style="font-size:14px;color:#555;line-height:1.4;">Enter your phone number to unlock special deals and direct support for items you view!</p>
        <input type="tel" id="leadPhoneInput" placeholder="Enter Phone Number" style="width:100%;padding:10px;margin:10px 0;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
        <button id="submitLeadBtn" style="width:100%;padding:10px;background:#28a745;color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer;margin-bottom:8px;">Claim Offer & Continue</button>
        <button id="skipLeadBtn" style="background:none;border:none;color:#777;cursor:pointer;font-size:12px;text-decoration:underline;">Skip & Browse as Guest</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('submitLeadBtn').addEventListener('click', () => {
    const phone = document.getElementById('leadPhoneInput').value.trim();
    if (phone) {
      window.userSession.phone = phone;
      localStorage.setItem('lead_phone', phone);
    }
    closeLeadModal();
    syncAnalyticsToFirestore();
  });

  document.getElementById('skipLeadBtn').addEventListener('click', () => {
    closeLeadModal();
    syncAnalyticsToFirestore();
  });
}

function closeLeadModal() {
  localStorage.setItem('lead_prompt_shown', 'true');
  const modal = document.getElementById('leadModal');
  if (modal) modal.remove();
}

function logProductView(productId) {
  if (productId && !window.userSession.views.includes(productId)) {
    window.userSession.views.push(productId);
  }
  window.userSession.lastActive = new Date().toISOString();
  saveSessionLocally();
}

function saveSessionLocally() {
  sessionStorage.setItem('active_lead_session', JSON.stringify(window.userSession));
}

function syncAnalyticsToFirestore() {
  const sessionData = JSON.parse(sessionStorage.getItem('active_lead_session'));
  if (!sessionData || sessionData.views.length === 0 || !window.db) return;

  window.db.collection('analytics_leads').doc(sessionData.id).set({
    userId: sessionData.id,
    phone: sessionData.phone || 'Guest User',
    productViews: sessionData.views,
    cartItems: sessionData.cart || [],
    lastActive: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true }).catch(err => console.error("Analytics sync deferred:", err));
}

window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    syncAnalyticsToFirestore();
  }
});