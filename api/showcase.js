import { db } from './_firebase.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const snap = await db.collection('showcase').get();
        const showcase = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
        return res.status(200).json(showcase);
    } catch (err) {
        console.error('[/api/showcase]', err);
        return res.status(500).json({ error: err.message });
    }
}