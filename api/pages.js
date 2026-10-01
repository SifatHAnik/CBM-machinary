import { db } from './_firebase.js';
import { verifyAdmin, cors } from './_auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { slug } = req.query;

    try {
        if (req.method === 'GET') {
            if (slug) {
                const doc = await db.collection('footer_pages').doc(slug).get();
                if (!doc.exists) return res.status(404).json({ error: 'Page not found' });
                return res.status(200).json({ id: doc.id, ...doc.data() });
            }
            const snap = await db.collection('footer_pages').get();
            const pages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
            return res.status(200).json(pages);
        }

        if (req.method === 'POST') {
            const auth = await verifyAdmin(req);
            if (!auth.ok) return res.status(401).json({ error: auth.error });

            const body = req.body || {};
            if (!body.slug) return res.status(400).json({ error: 'Missing slug' });
            await db.collection('footer_pages').doc(body.slug).set({
                title: body.title || '',
                slug: body.slug,
                content: body.content || '',
                showInFooter: body.showInFooter !== false,
                updatedAt: new Date(),
                ...(body.isNew ? { createdAt: new Date() } : {})
            }, { merge: true });
            return res.status(200).json({ id: body.slug });
        }

        if (req.method === 'DELETE') {
            const auth = await verifyAdmin(req);
            if (!auth.ok) return res.status(401).json({ error: auth.error });
            const targetSlug = slug || (req.body && req.body.slug);
            if (!targetSlug) return res.status(400).json({ error: 'Missing slug' });
            await db.collection('footer_pages').doc(targetSlug).delete();
            return res.status(200).json({ ok: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('[/api/pages]', err);
        return res.status(500).json({ error: err.message });
    }
}