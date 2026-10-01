import { getAuth } from 'firebase-admin/auth';
import './_firebase.js';

export async function verifyAdmin(req) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return { ok: false, error: 'Missing auth token' };

    try {
        const decoded = await getAuth().verifyIdToken(token);
        return { ok: true, uid: decoded.uid, email: decoded.email };
    } catch (err) {
        return { ok: false, error: 'Invalid or expired token' };
    }
}

export function cors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}