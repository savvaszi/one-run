import type { APIRoute } from 'astro';
import { directusCreateItem } from '../../lib/directus';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { name, email, phone, message } = data;

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    await directusCreateItem('contact_messages', {
      name,
      email,
      phone: phone || null,
      message,
      status: 'new',
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }
};
