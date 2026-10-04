import { getAuth } from 'firebase-admin/auth';
import './_firebase.js';

export async function createAdminUser(email, password) {
  try {
    const user = await getAuth().createUser({ email, password });
    return { ok: true, uid: user.uid };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function deleteAdminUser(uid) {
  try {
    await getAuth().deleteUser(uid);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function listAdminUsers() {
  try {
    const result = await getAuth().listUsers(1000);
    return {
      ok: true,
      users: result.users.map((u) => ({
        uid: u.uid,
        email: u.email,
        created: u.metadata.creationTime,
        lastSignIn: u.metadata.lastSignInTime,
      })),
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function verifyAdmin(req) {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return { ok: false, error: 'Missing auth token' };

  try {
    const decoded = await getAuth().verifyIdToken(token);
    return { ok: true, uid: decoded.uid, email: decoded.email };
  } catch (err) {
    return { ok: false, error: 'Invalid or expired token' };
  }
}