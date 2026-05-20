import type { APIRoute } from 'astro';
import { isAdmin } from '../../../lib/auth';
import { getSetting, setSetting } from '../../../lib/settings';

export const GET: APIRoute = async ({ cookies }) => {
  if (!isAdmin(cookies)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const keys = ['revolut_api_key', 'resend_api_key', 'admin_password', 'from_email'];
  const result: Record<string, string> = {};
  for (const k of keys) {
    const v = await getSetting(k);
    result[k] = v ? (k.includes('api_key') || k.includes('password') ? '••••••••' : v) : '';
  }
  return new Response(JSON.stringify(result), { status: 200 });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  if (!isAdmin(cookies)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  try {
    const body = await request.json();
    for (const [key, value] of Object.entries(body)) {
      if (value && typeof value === 'string' && !(value as string).startsWith('••••')) {
        await setSetting(key, value as string);
      }
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: 'Save failed' }), { status: 500 });
  }
};
