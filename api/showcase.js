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

  try {
    if (req.method === 'GET') {
      const snap = await db.collection('showcase').get();
      const showcase = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return new Response(JSON.stringify(showcase), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
          'Cache-Control': 's-maxage=60, stale-while-revalidate=600',
        },
      });
    }

    if (req.method === 'POST') {
      const auth = await verifyAdmin(req);
      if (!auth.ok) return json({ error: auth.error }, 401);

      const body = await req.json();
      const images = Array.isArray(body.images) ? body.images : [];
      if (images.length === 0) return json({ error: 'No images provided' }, 400);

      const existing = await db.collection('showcase').get();
      const batch = db.batch();
      existing.docs.forEach((d) => batch.delete(d.ref));
      images.forEach((url) => {
        const ref = db.collection('showcase').doc();
        batch.set(ref, { imageUrl: url, createdAt: new Date() });
      });
      await batch.commit();
      return json({ count: images.length });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    console.error('[/api/showcase]', err);
    return json({ error: err.message }, 500);
  }
};