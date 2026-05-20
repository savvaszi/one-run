import type { APIRoute } from 'astro';
import { directusCreateItem, directusGetItem, directusUpdateItem, type DirectusHotel, type DirectusPackage, type DirectusRace } from '../../lib/directus';
import { createCancellationToken, hashCancellationToken } from '../../lib/bookingTokens';
import { sendBookingConfirmationEmail } from '../../lib/bookingEmails';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { package_id, runners: runnerData } = body;

    if (!package_id || !Array.isArray(runnerData) || runnerData.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const selectedPackage = await directusGetItem<DirectusPackage>('packages', package_id);
    if (!selectedPackage?.active) throw new Error('Package not available');
    if (runnerData.length !== selectedPackage.runner_count) {
      return new Response(JSON.stringify({ error: `${selectedPackage.label} requires ${selectedPackage.runner_count} runner(s)` }), { status: 400 });
    }

    if (selectedPackage.booked_seats + selectedPackage.runner_count > selectedPackage.total_seats) {
      return new Response(JSON.stringify({ error: 'No seats available for this package' }), { status: 409 });
    }

    const hotel = await directusGetItem<DirectusHotel>('hotels', Number(selectedPackage.hotel));
    const race = await directusGetItem<DirectusRace>('races', Number(hotel.race));
    const rawToken = createCancellationToken();
    const tokenHash = await hashCancellationToken(rawToken);
    const bookingRef = 'ONR-' + Date.now().toString(36).toUpperCase().slice(-6) + '-' + race.slug.slice(0, 3).toUpperCase();

    await directusUpdateItem('packages', selectedPackage.id, {
      booked_seats: selectedPackage.booked_seats + selectedPackage.runner_count,
    });

    const booking = await directusCreateItem<any>('bookings', {
      reference: bookingRef,
      race: race.id,
      hotel: hotel.id,
      package: selectedPackage.id,
      status: 'pending',
      total_amount: selectedPackage.price,
      currency: selectedPackage.currency || 'EUR',
      cancellation_token_hash: tokenHash,
    });

    for (const r of runnerData) {
      await directusCreateItem('runners', {
        booking: booking.id,
        full_name: r.full_name,
        email: r.email,
        phone: r.phone,
        nationality: r.nationality,
        passport_id: r.passport_id,
        expected_time: r.expected_time,
        requirements: r.requirements || null,
      });
    }

    const apiKey = process.env.REVOLUT_API_KEY;
    const siteUrl = process.env.PUBLIC_SITE_URL || 'https://one-run.net';
    const cancellationUrl = `${siteUrl}/cancel/${bookingRef}?token=${rawToken}`;

    if (!apiKey) {
      console.log('Revolut not configured — using test mode for booking', bookingRef);
      await directusUpdateItem('bookings', booking.id, {
        status: 'paid',
      });

      await sendBookingConfirmationEmail({
        bookingRef,
        raceName: race.name,
        packageLabel: selectedPackage.label,
        totalAmount: selectedPackage.price,
        runnerEmails: runnerData.map((runner: any) => runner.email),
        cancellationUrl,
      }).catch(e => console.error('Email send failed:', e));

      return new Response(JSON.stringify({
        booking_id: bookingRef,
        redirect_url: `/confirm/${bookingRef}`
      }), { status: 200 });
    }

    const revolutRes = await fetch('https://merchant.revolut.com/api/1.0/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: selectedPackage.price * 100,
        currency: 'EUR',
        capture_mode: 'AUTOMATIC',
        redirect_url: `${siteUrl}/confirm/${bookingRef}`,
        cancel_url: `${siteUrl}/races/${race.slug}`,
        description: `One Run booking ${bookingRef}`,
      }),
    });

    if (!revolutRes.ok) {
      console.error('Revolut order creation failed:', await revolutRes.text());
      throw new Error('Payment service unavailable');
    }

    const order = await revolutRes.json() as any;
    await directusUpdateItem('bookings', booking.id, {
      revolut_order_id: order.id
    });

    return new Response(JSON.stringify({
      booking_id: bookingRef,
      redirect_url: order.checkout_url || `/confirm/${bookingRef}`
    }), { status: 200 });

  } catch (e: any) {
    console.error('Booking error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Booking failed' }), { status: 500 });
  }
};
