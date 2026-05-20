import type { APIRoute } from 'astro';
import { db } from '../../db/index';
import { interestRegistrations } from '../../db/schema';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { race_name, first_name, last_name, email, phone } = body;

    if (!race_name || !first_name || !last_name || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    await db.insert(interestRegistrations).values({
      race_name,
      first_name,
      last_name,
      email,
      phone: phone || '',
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error('Interest registration error:', e);
    return new Response(JSON.stringify({ error: 'Registration failed' }), { status: 500 });
  }
};
