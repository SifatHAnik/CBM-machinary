import { verifyAdmin, createAdminUser, deleteAdminUser, listAdminUsers } from './_auth.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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

  const auth = await verifyAdmin(req);
  if (!auth.ok) return json({ error: auth.error }, 401);

  const url = new URL(req.url);
  const uid = url.searchParams.get('uid');

  try {
    if (req.method === 'GET') {
      const result = await listAdminUsers();
      if (!result.ok) return json({ error: result.error }, 500);
      return json(result.users);
    }

    if (req.method === 'POST') {
      const body = await req.json();
      if (!body.email || !body.password) {
        return json({ error: 'Email and password required' }, 400);
      }
      if (body.password.length < 6) {
        return json({ error: 'Password must be at least 6 characters' }, 400);
      }
      const result = await createAdminUser(body.email, body.password);
      if (!result.ok) return json({ error: result.error }, 400);
      return json({ ok: true, uid: result.uid }, 201);
    }

    if (req.method === 'DELETE') {
      if (!uid) return json({ error: 'Missing uid' }, 400);
      if (uid === auth.uid) {
        return json({ error: "You can't delete your own account" }, 400);
      }
      const result = await deleteAdminUser(uid);
      if (!result.ok) return json({ error: result.error }, 400);
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    console.error('[/api/admins]', err);
    return json({ error: err.message }, 500);
  }
};