import { db } from './_firebase.js';
import { verifyAdmin, cors } from './_auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { category, id } = req.query;

    try {
        // ---------- GET ----------
        if (req.method === 'GET') {
            if (id) {
                const doc = await db.collection('products').doc(id).get();
                if (!doc.exists) return res.status(404).json({ error: 'Not found' });
                const data = doc.data();
                Object.keys(data).forEach(k => {
                    if (data[k] && typeof data[k].toDate === 'function') data[k] = data[k].toDate().toISOString();
                });
                return res.status(200).json({ id: doc.id, ...data });
            }

            let q = db.collection('products');
            if (category) q = q.where('category', '==', category);
            const snap = await q.get();
            const products = snap.docs.map(d => {
                const data = d.data();
                Object.keys(data).forEach(k => {
                    if (data[k] && typeof data[k].toDate === 'function') data[k] = data[k].toDate().toISOString();
                });
                return { id: d.id, ...data };
            });
            res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');
            return res.status(200).json(products);
        }

        // ---------- POST (create) ----------
        if (req.method === 'POST') {
            const auth = await verifyAdmin(req);
            if (!auth.ok) return res.status(401).json({ error: auth.error });

            const body = req.body || {};
            const ref = await db.collection('products').add({
                ...body,
                createdAt: new Date()
            });
            return res.status(201).json({ id: ref.id });
        }

        // ---------- PUT (update) ----------
        if (req.method === 'PUT') {
            const auth = await verifyAdmin(req);
            if (!auth.ok) return res.status(401).json({ error: auth.error });

            if (!id) return res.status(400).json({ error: 'Missing id' });
            await db.collection('products').doc(id).set(req.body || {}, { merge: true });
            return res.status(200).json({ ok: true });
        }

        // ---------- DELETE ----------
        if (req.method === 'DELETE') {
            const auth = await verifyAdmin(req);
            if (!auth.ok) return res.status(401).json({ error: auth.error });

            if (!id) return res.status(400).json({ error: 'Missing id' });
            await db.collection('products').doc(id).delete();
            return res.status(200).json({ ok: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('[/api/products]', err);
        return res.status(500).json({ error: err.message });
    }
}