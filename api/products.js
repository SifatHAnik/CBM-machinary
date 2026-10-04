import { db } from './_firebase.js';
import { verifyAdmin } from './_auth.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const category = url.searchParams.get('category');
  const id = url.searchParams.get('id');

  try {
    // ---------- GET ----------
    if (req.method === 'GET') {
      if (id) {
        const doc = await db.collection('products').doc(id).get();
        if (!doc.exists) return json({ error: 'Not found' }, 404);
        const data = doc.data();
        Object.keys(data).forEach((k) => {
          if (data[k] && typeof data[k].toDate === 'function') {
            data[k] = data[k].toDate().toISOString();
          }
        });
        return json({ id: doc.id, ...data });
      }

      let q = db.collection('products');
      if (category) q = q.where('category', '==', category);
      const snap = await q.get();
      const products = snap.docs.map((d) => {
        const data = d.data();
        Object.keys(data).forEach((k) => {
          if (data[k] && typeof data[k].toDate === 'function') {
            data[k] = data[k].toDate().toISOString();
          }
        });
        return { id: d.id, ...data };
      });

      return json(products, 200, {
        'Cache-Control': 's-maxage=30, stale-while-revalidate=300',
      });
    }

    // ---------- POST ----------
    if (req.method === 'POST') {
      const auth = await verifyAdmin(req);
      if (!auth.ok) return json({ error: auth.error }, 401);

      const body = await req.json();
      const ref = await db.collection('products').add({
        ...body,
        createdAt: new Date(),
      });
      return json({ id: ref.id }, 201);
    }

    // ---------- PUT ----------
    if (req.method === 'PUT') {
      const auth = await verifyAdmin(req);
      if (!auth.ok) return json({ error: auth.error }, 401);
      if (!id) return json({ error: 'Missing id' }, 400);

      const body = await req.json();
      await db.collection('products').doc(id).set(body, { merge: true });
      return json({ ok: true });
    }

    // ---------- DELETE ----------
    if (req.method === 'DELETE') {
      const auth = await verifyAdmin(req);
      if (!auth.ok) return json({ error: auth.error }, 401);
      if (!id) return json({ error: 'Missing id' }, 400);

      await db.collection('products').doc(id).delete();
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    console.error('[/api/products]', err);
    return json({ error: err.message }, 500);
  }
};