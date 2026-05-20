export const prerender = false;

import type { APIRoute } from 'astro';
import { directusGetItems, type DirectusBooking } from '../../../../lib/directus';

export const GET: APIRoute = async ({ params }) => {
  const booking = (await directusGetItems<DirectusBooking>('bookings', { 'filter[reference][_eq]': params.ref!, limit: 1 }))[0];
  if (!booking) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  return new Response(JSON.stringify({
    status: booking.status,
    amount: booking.total_amount,
    race_id: booking.race,
  }), { status: 200 });
};

