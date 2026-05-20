import type { APIRoute } from 'astro';
import { db } from '../../../db/index';
import { bookings } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { sendBookingConfirmation } from '../../../lib/resend';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { event, order_id } = body;

    if (event !== 'ORDER_COMPLETED') {
      console.log('Webhook event ignored:', event);
      return new Response('OK', { status: 200 });
    }

    if (!order_id) {
      return new Response('OK', { status: 200 });
    }

    const booking = await db.select().from(bookings).where(eq(bookings.revolut_order_id, order_id)).get();
    if (!booking) return new Response('OK', { status: 200 });

    if (booking.status === 'paid') return new Response('OK', { status: 200 });

    await db.update(bookings).set({
      status: 'paid',
      updated_at: new Date().toISOString()
    }).where(eq(bookings.id, booking.id));

    await sendBookingConfirmation(booking.id).catch(e => console.error('Email send failed:', e));

    console.log('Booking paid via webhook:', booking.id);
    return new Response('OK', { status: 200 });
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('OK', { status: 200 });
  }
};
