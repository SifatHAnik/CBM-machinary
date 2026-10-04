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
      const snap = await db.collection('categories').get();
      const categories = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return new Response(JSON.stringify(categories), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
          'Cache-Control': 's-maxage=30, stale-while-revalidate=300',
        },
      });
    }

    if (req.method === 'POST') {
      const auth = await verifyAdmin(req);
      if (!auth.ok) return json({ error: auth.error }, 401);

      const body = await req.json();
      if (!body.id && !body.name) return json({ error: 'Missing id or name' }, 400);
      const slug =
        body.id || String(body.name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await db.collection('categories').doc(slug).set({
        name: body.name || slug,
        createdAt: new Date(),
      });
      return json({ id: slug }, 201);
    }

    if (req.method === 'DELETE') {
      const auth = await verifyAdmin(req);
      if (!auth.ok) return json({ error: auth.error }, 401);
      if (!id) return json({ error: 'Missing id' }, 400);
      await db.collection('categories').doc(id).delete();
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    console.error('[/api/categories]', err);
    return json({ error: err.message }, 500);
  }
};