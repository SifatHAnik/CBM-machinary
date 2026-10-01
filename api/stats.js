import { db } from './_firebase.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const doc = await db.collection('site_stats').doc('global').get();
        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');
        return res.status(200).json(doc.exists ? doc.data() : {});
    } catch (err) {
        console.error('[/api/stats]', err);
        return res.status(500).json({ error: err.message });
    }
}