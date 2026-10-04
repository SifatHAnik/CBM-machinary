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
  const slug = url.searchParams.get('slug');

  try {
    if (req.method === 'GET') {
      if (slug) {
        const doc = await db.collection('footer_pages').doc(slug).get();
        if (!doc.exists) return json({ error: 'Page not found' }, 404);
        return json({ id: doc.id, ...doc.data() });
      }
      const snap = await db.collection('footer_pages').get();
      const pages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return new Response(JSON.stringify(pages), {
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
      if (!body.slug) return json({ error: 'Missing slug' }, 400);
      await db
        .collection('footer_pages')
        .doc(body.slug)
        .set(
          {
            title: body.title || '',
            slug: body.slug,
            content: body.content || '',
            showInFooter: body.showInFooter !== false,
            updatedAt: new Date(),
            ...(body.isNew ? { createdAt: new Date() } : {}),
          },
          { merge: true },
        );
      return json({ id: body.slug });
    }

    if (req.method === 'DELETE') {
      const auth = await verifyAdmin(req);
      if (!auth.ok) return json({ error: auth.error }, 401);
      let target = slug;
      if (!target) {
        try {
          const body = await req.json();
          target = body.slug;
        } catch (e) {
          /* no body */
        }
      }
      if (!target) return json({ error: 'Missing slug' }, 400);
      await db.collection('footer_pages').doc(target).delete();
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    console.error('[/api/pages]', err);
    return json({ error: err.message }, 500);
  }
};