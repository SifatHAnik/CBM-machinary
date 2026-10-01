import { db } from './_firebase.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { category } = req.query;

        let q = db.collection('products');
        if (category) q = q.where('category', '==', category);

        const snap = await q.get();
        const products = snap.docs.map(d => {
            const data = d.data();
            // Convert Firestore Timestamps to ISO strings for JSON safety
            Object.keys(data).forEach(key => {
                if (data[key] && typeof data[key].toDate === 'function') {
                    data[key] = data[key].toDate().toISOString();
                }
            });
            return { id: d.id, ...data };
        });

        // Cache at the edge for 30 seconds, allow stale for 5 min while revalidating
        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');
        return res.status(200).json(products);
    } catch (err) {
        console.error('[/api/products] Error:', err);
        return res.status(500).json({ error: err.message });
    }
}