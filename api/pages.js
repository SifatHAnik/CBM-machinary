import { db } from './_firebase.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { slug } = req.query;

        if (slug) {
            const doc = await db.collection('footer_pages').doc(slug).get();
            if (!doc.exists) return res.status(404).json({ error: 'Page not found' });
            return res.status(200).json({ id: doc.id, ...doc.data() });
        }

        const snap = await db.collection('footer_pages').get();
        const pages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
        return res.status(200).json(pages);
    } catch (err) {
        console.error('[/api/pages]', err);
        return res.status(500).json({ error: err.message });
    }
}