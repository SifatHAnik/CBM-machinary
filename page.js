import { db } from "./firebase-config.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');

    if (!slug) {
        showError("No page specified.");
        return;
    }

    await loadPage(slug);
    initFooterInfo();
    loadFooterPages();
    initFab();
});

async function loadPage(slug) {
    const headingEl = document.getElementById('page-heading');
    const bodyEl = document.getElementById('page-body');

    try {
        const snap = await getDoc(doc(db, "footer_pages", slug));
        if (!snap.exists()) {
            showError("Page not found.");
            return;
        }
        const data = snap.data();
        headingEl.textContent = data.title || 'Untitled';
        bodyEl.innerHTML = renderContent(data.content || '');
        document.title = `${data.title || 'Page'} - CBM Machineries`;
    } catch (err) {
        console.error(err);
        showError("Failed to load page.");
    }
}

function showError(msg) {
    document.getElementById('page-heading').textContent = 'Oops';
    document.getElementById('page-body').innerHTML = `<p class="page-error">${escapeHtml(msg)}</p>`;
}

/**
 * Tiny markdown-ish renderer.
 * Rules:
 *   ## Heading       -> h2
 *   ### Subheading   -> h3
 *   - item           -> bullet list item
 *   **bold**         -> <strong>
 *   blank line       -> paragraph break
 */
function renderContent(raw) {
    const lines = String(raw).replace(/\r\n/g, '\n').split('\n');
    let html = '';
    let inList = false;

    const inline = (text) => escapeHtml(text)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.+?)`/g, '<code>$1</code>');

    const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed === '') {
            closeList();
            continue;
        }

        if (trimmed.startsWith('### ')) {
            closeList();
            html += `<h3>${inline(trimmed.slice(4))}</h3>`;
        } else if (trimmed.startsWith('## ')) {
            closeList();
            html += `<h2>${inline(trimmed.slice(3))}</h2>`;
        } else if (trimmed.startsWith('- ')) {
            if (!inList) { html += '<ul>'; inList = true; }
            html += `<li>${inline(trimmed.slice(2))}</li>`;
        } else {
            closeList();
            html += `<p>${inline(trimmed)}</p>`;
        }
    }

    closeList();
    return html;
}

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
            const a = document.getElementById('footer-whatsapp-link'); if (a) a.href = `https://wa.me/${waNum}`;
            const b = document.getElementById('fab-whatsapp'); if (b) b.href = `https://wa.me/${waNum}`;
        }
        if (callNum) {
            const a = document.getElementById('footer-hotline-link'); if (a) a.href = `tel:${callNum}`;
            const b = document.getElementById('fab-call'); if (b) b.href = `tel:${callNum}`;
        }
        if (data.emailAddress) {
            const a = document.getElementById('footer-email-link'); if (a) a.href = `mailto:${data.emailAddress}`;
            const b = document.getElementById('fab-email'); if (b) b.href = `mailto:${data.emailAddress}`;
        }
        if (data.address) {
            const a = document.getElementById('footer-address-link');
            if (a) a.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address)}`;
        }
    } catch (err) {
        console.error("Footer info:", err);
    }
}

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

function initFab() {
    const fab = document.getElementById('fab-container');
    const toggle = document.getElementById('fab-toggle');
    if (!fab || !toggle) return;
    toggle.addEventListener('click', (e) => { e.stopPropagation(); fab.classList.toggle('open'); });
    document.addEventListener('click', (e) => { if (!fab.contains(e.target)) fab.classList.remove('open'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fab.classList.remove('open'); });
}

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