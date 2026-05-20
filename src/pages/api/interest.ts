import type { APIRoute } from 'astro';
import { directusCreateItem } from '../../lib/directus';
import { sendInterestAcknowledgement } from '../../lib/bookingEmails';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { race_name, first_name, last_name, email, phone } = body;

    if (!race_name || !first_name || !last_name || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    await directusCreateItem('interest_registrations', {
      race_name,
      first_name,
      last_name,
      email,
      phone: phone || '',
    });

    await sendInterestAcknowledgement(email, race_name).catch(e => console.error('Interest email failed:', e));

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error('Interest registration error:', e);
    return new Response(JSON.stringify({ error: 'Registration failed' }), { status: 500 });
  }
};
