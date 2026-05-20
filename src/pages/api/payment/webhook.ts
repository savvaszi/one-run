import type { APIRoute } from 'astro';
import { directusGetItem, directusGetItems, directusUpdateItem, type DirectusBooking, type DirectusPackage, type DirectusRace, type DirectusRunner } from '../../../lib/directus';
import { sendBookingConfirmationEmail } from '../../../lib/bookingEmails';

export const prerender = false;

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

    const booking = (await directusGetItems<DirectusBooking>('bookings', { 'filter[revolut_order_id][_eq]': order_id, limit: 1 }))[0];
    if (!booking) return new Response('OK', { status: 200 });

    if (booking.status === 'paid') return new Response('OK', { status: 200 });

    await directusUpdateItem('bookings', booking.id, {
      status: 'paid',
      revolut_payment_id: body.payment_id || null,
    });

    const race = await directusGetItem<DirectusRace>('races', Number(booking.race));
    const selectedPackage = await directusGetItem<DirectusPackage>('packages', Number(booking.package));
    const bookingRunners = await directusGetItems<DirectusRunner>('runners', { 'filter[booking][_eq]': booking.id, limit: -1 });

    await sendBookingConfirmationEmail({
      bookingRef: booking.reference,
      raceName: race.name,
      packageLabel: selectedPackage.label,
      totalAmount: booking.total_amount,
      runnerEmails: bookingRunners.map((runner) => runner.email),
      cancellationUrl: `${process.env.PUBLIC_SITE_URL || 'https://one-run.net'}/cancel/${booking.reference}`,
    }).catch(e => console.error('Email send failed:', e));

    console.log('Booking paid via webhook:', booking.reference);
    return new Response('OK', { status: 200 });
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('OK', { status: 200 });
  }
};
