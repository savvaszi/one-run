import type { APIRoute } from 'astro';
import { db } from '../../../../db/index';
import { bookings } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ params }) => {
  const booking = await db.select().from(bookings).where(eq(bookings.id, params.ref!)).get();
  if (!booking) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  return new Response(JSON.stringify({
    status: booking.status,
    amount: booking.total_amount,
    race_id: booking.race_id,
  }), { status: 200 });
};
