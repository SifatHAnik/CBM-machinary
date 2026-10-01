import { db } from './_firebase.js';
import { verifyAdmin, cors } from './_auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const doc = await db.collection('site_stats').doc('global').get();
            res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');
            return res.status(200).json(doc.exists ? doc.data() : {});
        }

        if (req.method === 'PUT' || req.method === 'POST') {
            const auth = await verifyAdmin(req);
            if (!auth.ok) return res.status(401).json({ error: auth.error });

            const body = req.body || {};
            await db.collection('site_stats').doc('global').set({
                ...body,
                updatedAt: new Date()
            }, { merge: true });
            return res.status(200).json({ ok: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('[/api/stats]', err);
        return res.status(500).json({ error: err.message });
    }
}