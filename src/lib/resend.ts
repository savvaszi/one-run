import { Resend } from 'resend';
import { getSetting } from './settings';
import { db } from '../db/index';
import { bookings, runners, races } from '../db/schema';
import { eq } from 'drizzle-orm';

async function getClient(): Promise<Resend | null> {
  const apiKey = await getSetting('resend_api_key');
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendBookingConfirmation(bookingId: string): Promise<void> {
  const resend = await getClient();
  if (!resend) {
    console.log('Resend not configured, skipping email for booking:', bookingId);
    return;
  }

  const booking = await db.select().from(bookings).where(eq(bookings.id, bookingId)).get();
  if (!booking) return;

  const race = await db.select().from(races).where(eq(races.id, booking.race_id)).get();
  const bookingRunners = await db.select().from(runners).where(eq(runners.booking_id, bookingId)).all();
  const fromEmail = (await getSetting('from_email')) || 'noreply@one-run.net';
  const pkgLabel = booking.package_type === 'single' ? 'Single Room & 1 Race Entry' : 'Twin / Double Room & 2 Race Entries';

  for (const runner of bookingRunners) {
    try {
      await resend.emails.send({
        from: `One Run <${fromEmail}>`,
        to: runner.email,
        subject: `Booking confirmed — ${race?.name || 'Your marathon'}`,
        html: `
          <div style="max-width:560px;margin:0 auto;background:#000;color:#f3efe8;font-family:Arial,sans-serif;padding:32px;">
            <h1 style="color:#c9a86a;font-size:24px;">Booking confirmed!</h1>
            <p>Hi ${runner.full_name},</p>
            <p>Your booking for <strong>${race?.name || 'your marathon'}</strong> is confirmed.</p>
            <table style="width:100%;border-collapse:collapse;margin:24px 0;">
              <tr><td style="padding:8px 0;color:#8a8680;">Booking reference</td><td style="color:#f3efe8;">${booking.id}</td></tr>
              <tr><td style="padding:8px 0;color:#8a8680;">Race</td><td style="color:#f3efe8;">${race?.name || 'N/A'}</td></tr>
              <tr><td style="padding:8px 0;color:#8a8680;">Package</td><td style="color:#f3efe8;">${pkgLabel}</td></tr>
              <tr><td style="padding:8px 0;color:#8a8680;">Amount paid</td><td style="color:#f3efe8;">€${booking.total_amount.toLocaleString()}</td></tr>
            </table>
            <p style="color:#8a8680;font-size:13px;">Within 2-4 business days you'll receive full registration details — race bib confirmation, hotel voucher, transfer instructions, and a personal contact for your trip.</p>
            <hr style="border-color:rgba(243,239,232,0.08);" />
            <p style="color:#8a8680;font-size:11px;">— The One Run Team</p>
          </div>
        `,
      });
    } catch (e) {
      console.error(`Failed to send email to ${runner.email}:`, e);
    }
  }
}
