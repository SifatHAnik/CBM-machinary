import { db } from './_firebase.js';
import { verifyAdmin, cors } from './_auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const snap = await db.collection('showcase').get();
            const showcase = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
            return res.status(200).json(showcase);
        }

        // Admin: replace entire showcase with a list of image URLs
        if (req.method === 'POST') {
            const auth = await verifyAdmin(req);
            if (!auth.ok) return res.status(401).json({ error: auth.error });

            const body = req.body || {};
            const images = Array.isArray(body.images) ? body.images : [];
            if (images.length === 0) return res.status(400).json({ error: 'No images provided' });

            // Clear existing
            const existing = await db.collection('showcase').get();
            const batch = db.batch();
            existing.docs.forEach(d => batch.delete(d.ref));

            // Add new
            images.forEach(url => {
                const ref = db.collection('showcase').doc();
                batch.set(ref, { imageUrl: url, createdAt: new Date() });
            });

            await batch.commit();
            return res.status(200).json({ count: images.length });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('[/api/showcase]', err);
        return res.status(500).json({ error: err.message });
    }
}