import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    console.log('Contact form submission:', JSON.stringify(data, null, 2));
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }
};
