import type { APIRoute } from 'astro';
import { db } from '../../db/index';
import { bookings, runners, hotels } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { getSetting } from '../../lib/settings';
import { sendBookingConfirmation } from '../../lib/resend';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { race_id, hotel_id, package_type, runners: runnerData } = body;

    if (!race_id || !hotel_id || !package_type || !Array.isArray(runnerData) || runnerData.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    if (package_type === 'single' && runnerData.length !== 1) {
      return new Response(JSON.stringify({ error: 'Single package requires 1 runner' }), { status: 400 });
    }
    if (package_type === 'twin' && runnerData.length !== 2) {
      return new Response(JSON.stringify({ error: 'Twin package requires 2 runners' }), { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      const hotel = await tx.select().from(hotels).where(eq(hotels.id, hotel_id)).get();
      if (!hotel) throw new Error('Hotel not found');

      const needed = package_type === 'twin' ? 2 : 1;
      if (hotel.booked_seats + needed > hotel.total_seats) {
        throw new Error('No seats available for this hotel');
      }

      await tx.update(hotels).set({ booked_seats: hotel.booked_seats + needed }).where(eq(hotels.id, hotel_id));

      const bookingId = 'ONR-' + Date.now().toString(36).toUpperCase().slice(-6) + '-' + race_id.slice(0, 3).toUpperCase();
      const totalAmount = package_type === 'twin' ? hotel.twin_price : hotel.single_price;

      await tx.insert(bookings).values({
        id: bookingId,
        race_id,
        hotel_id,
        package_type,
        total_amount: totalAmount,
        currency: 'EUR',
        status: 'pending',
      });

      for (const r of runnerData) {
        await tx.insert(runners).values({
          booking_id: bookingId,
          full_name: r.full_name,
          email: r.email,
          phone: r.phone,
          nationality: r.nationality,
          passport_id: r.passport_id,
          expected_time: r.expected_time,
          requirements: r.requirements || null,
        });
      }

      return { bookingId, totalAmount };
    });

    const apiKey = await getSetting('revolut_api_key');

    if (!apiKey) {
      console.log('Revolut not configured — using test mode for booking', result.bookingId);
      await db.update(bookings).set({
        status: 'paid',
        updated_at: new Date().toISOString()
      }).where(eq(bookings.id, result.bookingId));

      await sendBookingConfirmation(result.bookingId).catch(e => console.error('Email send failed:', e));

      return new Response(JSON.stringify({
        booking_id: result.bookingId,
        redirect_url: `/confirm/${result.bookingId}`
      }), { status: 200 });
    }

    const revolutRes = await fetch('https://merchant.revolut.com/api/1.0/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: result.totalAmount * 100,
        currency: 'EUR',
        capture_mode: 'AUTOMATIC',
        redirect_url: `https://one-run.net/confirm/${result.bookingId}`,
        cancel_url: `https://one-run.net/races/${race_id}`,
        description: `One Run booking ${result.bookingId}`,
      }),
    });

    if (!revolutRes.ok) {
      console.error('Revolut order creation failed:', await revolutRes.text());
      throw new Error('Payment service unavailable');
    }

    const order = await revolutRes.json() as any;
    await db.update(bookings).set({
      revolut_order_id: order.id
    }).where(eq(bookings.id, result.bookingId));

    return new Response(JSON.stringify({
      booking_id: result.bookingId,
      redirect_url: order.checkout_url || `/confirm/${result.bookingId}`
    }), { status: 200 });

  } catch (e: any) {
    console.error('Booking error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Booking failed' }), { status: 500 });
  }
};
