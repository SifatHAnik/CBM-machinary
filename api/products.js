import { db } from './_firebase.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { category, id } = req.query;

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
    } catch (err) {
        console.error('[/api/products]', err);
        return res.status(500).json({ error: err.message });
    }
}