import type { APIRoute } from 'astro';
import { directusCreateItem, directusGetItem, directusGetItems, directusUpdateItem, type DirectusBooking, type DirectusPackage, type DirectusRace, type DirectusRunner } from '../../../lib/directus';
import { verifyCancellationToken } from '../../../lib/bookingTokens';
import { sendCancellationEmail, sendCancellationRequestedEmail } from '../../../lib/bookingEmails';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const { token, reason, requester_email } = await request.json();
    const ref = params.ref!;
    const booking = (await directusGetItems<DirectusBooking>('bookings', { 'filter[reference][_eq]': ref, limit: 1 }))[0];

    if (!booking) return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404 });
    if (!token || !(await verifyCancellationToken(token, booking.cancellation_token_hash))) {
      return new Response(JSON.stringify({ error: 'Invalid cancellation link' }), { status: 403 });
    }
    if (booking.status === 'cancelled') {
      return new Response(JSON.stringify({ status: 'cancelled' }), { status: 200 });
    }

    if (booking.status === 'pending') {
      const selectedPackage = await directusGetItem<DirectusPackage>('packages', Number(booking.package));
      const race = await directusGetItem<DirectusRace>('races', Number(booking.race));
      const bookingRunners = await directusGetItems<DirectusRunner>('runners', { 'filter[booking][_eq]': booking.id, limit: -1 });
      await directusUpdateItem('packages', selectedPackage.id, {
        booked_seats: Math.max(0, selectedPackage.booked_seats - selectedPackage.runner_count),
      });
      await directusUpdateItem('bookings', booking.id, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      });
      await sendCancellationEmail({
        bookingRef: booking.reference,
        raceName: race.name,
        runnerEmails: bookingRunners.map((r) => r.email),
      }).catch(e => console.error('Cancellation email failed:', e));
      return new Response(JSON.stringify({ status: 'cancelled' }), { status: 200 });
    }

    if (booking.status === 'paid') {
      const race = await directusGetItem<DirectusRace>('races', Number(booking.race));
      const bookingRunners = await directusGetItems<DirectusRunner>('runners', { 'filter[booking][_eq]': booking.id, limit: -1 });
      await directusCreateItem('cancellation_requests', {
        booking: booking.id,
        requester_email: requester_email || '',
        reason: reason || null,
        status: 'requested',
      });
      await directusUpdateItem('bookings', booking.id, { status: 'cancellation_requested' });
      await sendCancellationRequestedEmail({
        bookingRef: booking.reference,
        raceName: race.name,
        runnerEmails: bookingRunners.map((r) => r.email),
      }).catch(e => console.error('Cancellation request email failed:', e));
      return new Response(JSON.stringify({ status: 'cancellation_requested' }), { status: 200 });
    }

    return new Response(JSON.stringify({ status: booking.status }), { status: 200 });
  } catch (error: any) {
    console.error('Cancellation error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Cancellation failed' }), { status: 500 });
  }
};
