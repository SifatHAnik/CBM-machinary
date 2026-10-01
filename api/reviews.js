import { db } from './_firebase.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const snap = await db.collection('reviews').where('approved', '==', true).get();
        const reviews = snap.docs.map(d => {
            const data = d.data();
            Object.keys(data).forEach(k => {
                if (data[k] && typeof data[k].toDate === 'function') data[k] = data[k].toDate().toISOString();
            });
            return { id: d.id, ...data };
        });
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
        return res.status(200).json(reviews);
    } catch (err) {
        console.error('[/api/reviews]', err);
        return res.status(500).json({ error: err.message });
    }
}