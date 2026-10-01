import { db } from './_firebase.js';
import { verifyAdmin, cors } from './_auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id } = req.query;

    try {
        if (req.method === 'GET') {
            const snap = await db.collection('categories').get();
            const categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=300');
            return res.status(200).json(categories);
        }

        if (req.method === 'POST') {
            const auth = await verifyAdmin(req);
            if (!auth.ok) return res.status(401).json({ error: auth.error });

            const body = req.body || {};
            if (!body.id && !body.name) return res.status(400).json({ error: 'Missing id or name' });
            const slug = body.id || String(body.name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
            await db.collection('categories').doc(slug).set({
                name: body.name || slug,
                createdAt: new Date()
            });
            return res.status(201).json({ id: slug });
        }

        if (req.method === 'DELETE') {
            const auth = await verifyAdmin(req);
            if (!auth.ok) return res.status(401).json({ error: auth.error });

            if (!id) return res.status(400).json({ error: 'Missing id' });
            await db.collection('categories').doc(id).delete();
            return res.status(200).json({ ok: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('[/api/categories]', err);
        return res.status(500).json({ error: err.message });
    }
}