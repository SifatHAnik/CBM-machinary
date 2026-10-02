import { db } from './_firebase.js';
import { verifyAdmin, cors } from './_auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // ---------- POST: save/update a lead (public) ----------
        if (req.method === 'POST') {
            const body = req.body || {};
            if (!body.userId) return res.status(400).json({ error: 'Missing userId' });

            await db.collection('analytics_leads').doc(body.userId).set({
                userId: body.userId,
                phone: body.phone || 'Guest User',
                productViews: body.productViews || [],
                cartItems: body.cartItems || [],
                lastActive: new Date()
            }, { merge: true });

            return res.status(200).json({ ok: true });
        }

        // ---------- GET: list all leads (admin only) ----------
        if (req.method === 'GET') {
            const auth = await verifyAdmin(req);
            if (!auth.ok) return res.status(401).json({ error: auth.error });

            const snap = await db.collection('analytics_leads').get();
            const leads = snap.docs.map(d => {
                const data = d.data();
                Object.keys(data).forEach(k => {
                    if (data[k] && typeof data[k].toDate === 'function') data[k] = data[k].toDate().toISOString();
                });
                return { id: d.id, ...data };
            });
            return res.status(200).json(leads);
        }

        // ---------- DELETE: clear all leads (admin only) ----------
        if (req.method === 'DELETE') {
            const auth = await verifyAdmin(req);
            if (!auth.ok) return res.status(401).json({ error: auth.error });

            const snap = await db.collection('analytics_leads').get();
            const batch = db.batch();
            snap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
            return res.status(200).json({ deleted: snap.size });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('[/api/leads]', err);
        return res.status(500).json({ error: err.message });
    }
}