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
    if (req.method === 'POST') {
      const body = await req.json();
      if (!body.userId) return json({ error: 'Missing userId' }, 400);

      await db
        .collection('analytics_leads')
        .doc(body.userId)
        .set(
          {
            userId: body.userId,
            phone: body.phone || 'Guest User',
            productViews: body.productViews || [],
            cartItems: body.cartItems || [],
            lastActive: new Date(),
          },
          { merge: true },
        );
      return json({ ok: true });
    }

    if (req.method === 'GET') {
      const auth = await verifyAdmin(req);
      if (!auth.ok) return json({ error: auth.error }, 401);

      const snap = await db.collection('analytics_leads').get();
      const leads = snap.docs.map((d) => {
        const data = d.data();
        Object.keys(data).forEach((k) => {
          if (data[k] && typeof data[k].toDate === 'function') {
            data[k] = data[k].toDate().toISOString();
          }
        });
        return { id: d.id, ...data };
      });
      return json(leads);
    }

    if (req.method === 'DELETE') {
      const auth = await verifyAdmin(req);
      if (!auth.ok) return json({ error: auth.error }, 401);

      const snap = await db.collection('analytics_leads').get();
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      return json({ deleted: snap.size });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    console.error('[/api/leads]', err);
    return json({ error: err.message }, 500);
  }
};