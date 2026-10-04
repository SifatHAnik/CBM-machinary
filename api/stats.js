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
      const doc = await db.collection('site_stats').doc('global').get();
      return new Response(JSON.stringify(doc.exists ? doc.data() : {}), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
          'Cache-Control': 's-maxage=30, stale-while-revalidate=300',
        },
      });
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const auth = await verifyAdmin(req);
      if (!auth.ok) return json({ error: auth.error }, 401);

      const body = await req.json();
      await db
        .collection('site_stats')
        .doc('global')
        .set({ ...body, updatedAt: new Date() }, { merge: true });
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    console.error('[/api/stats]', err);
    return json({ error: err.message }, 500);
  }
};