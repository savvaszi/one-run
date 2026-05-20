import type { APIRoute } from 'astro';
import { verifyPassword, setAdminCookie } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { password } = await request.json();
    const valid = await verifyPassword(password);
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid password' }), { status: 401 });
    }
    setAdminCookie(cookies);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }
};
