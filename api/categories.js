import { db } from './_firebase.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const snap = await db.collection('categories').get();
        const categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');
        return res.status(200).json(categories);
    } catch (err) {
        console.error('[/api/categories]', err);
        return res.status(500).json({ error: err.message });
    }
}