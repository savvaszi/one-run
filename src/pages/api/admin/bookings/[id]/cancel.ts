import type { APIRoute } from 'astro';
import { isAdmin } from '../../../../lib/auth';
import { db } from '../../../../db/index';
import { bookings, hotels } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ cookies, params }) => {
  if (!isAdmin(cookies)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  try {
    const booking = await db.select().from(bookings).where(eq(bookings.id, params.id!)).get();
    if (!booking) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    if (booking.status === 'cancelled') return new Response(JSON.stringify({ error: 'Already cancelled' }), { status: 400 });

    await db.transaction(async (tx) => {
      await tx.update(bookings).set({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      }).where(eq(bookings.id, params.id!));

      const needed = booking.package_type === 'twin' ? 2 : 1;
      const hotel = await tx.select().from(hotels).where(eq(hotels.id, booking.hotel_id)).get();
      if (hotel) {
        await tx.update(hotels).set({
          booked_seats: Math.max(0, hotel.booked_seats - needed)
        }).where(eq(hotels.id, booking.hotel_id));
      }
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
