import { db } from './_firebase.js';
import { verifyAdmin, cors } from './_auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id } = req.query;

    try {
        if (req.method === 'GET') {
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
        }

        // Public can submit a review (unapproved by default)
        if (req.method === 'POST') {
            const body = req.body || {};
            if (!body.name || !body.comment) return res.status(400).json({ error: 'Missing name or comment' });
            const ref = await db.collection('reviews').add({
                name: body.name,
                comment: body.comment,
                rating: Number(body.rating) || 5,
                approved: false,
                createdAt: new Date()
            });
            return res.status(201).json({ id: ref.id });
        }

        // Admin: approve / unapprove
        if (req.method === 'PUT') {
            const auth = await verifyAdmin(req);
            if (!auth.ok) return res.status(401).json({ error: auth.error });
            if (!id) return res.status(400).json({ error: 'Missing id' });
            await db.collection('reviews').doc(id).set(req.body || {}, { merge: true });
            return res.status(200).json({ ok: true });
        }

        // Admin: delete
        if (req.method === 'DELETE') {
            const auth = await verifyAdmin(req);
            if (!auth.ok) return res.status(401).json({ error: auth.error });
            if (!id) return res.status(400).json({ error: 'Missing id' });
            await db.collection('reviews').doc(id).delete();
            return res.status(200).json({ ok: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('[/api/reviews]', err);
        return res.status(500).json({ error: err.message });
    }
}