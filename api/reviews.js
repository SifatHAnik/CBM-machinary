import { db } from './_firebase.js';
import { verifyAdmin } from './_auth.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  try {
    if (req.method === 'GET') {
      const snap = await db
        .collection('reviews')
        .where('approved', '==', true)
        .get();
      const reviews = snap.docs.map((d) => {
        const data = d.data();
        Object.keys(data).forEach((k) => {
          if (data[k] && typeof data[k].toDate === 'function') {
            data[k] = data[k].toDate().toISOString();
          }
        });
        return { id: d.id, ...data };
      });
      return new Response(JSON.stringify(reviews), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
          'Cache-Control': 's-maxage=60, stale-while-revalidate=600',
        },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      if (!body.name || !body.comment) {
        return json({ error: 'Missing name or comment' }, 400);
      }
      const ref = await db.collection('reviews').add({
        name: body.name,
        comment: body.comment,
        rating: Number(body.rating) || 5,
        approved: false,
        createdAt: new Date(),
      });
      return json({ id: ref.id }, 201);
    }

    if (req.method === 'PUT') {
      const auth = await verifyAdmin(req);
      if (!auth.ok) return json({ error: auth.error }, 401);
      if (!id) return json({ error: 'Missing id' }, 400);
      const body = await req.json();
      await db.collection('reviews').doc(id).set(body, { merge: true });
      return json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const auth = await verifyAdmin(req);
      if (!auth.ok) return json({ error: auth.error }, 401);
      if (!id) return json({ error: 'Missing id' }, 400);
      await db.collection('reviews').doc(id).delete();
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    console.error('[/api/reviews]', err);
    return json({ error: err.message }, 500);
  }
};