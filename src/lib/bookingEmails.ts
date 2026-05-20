import { Resend } from 'resend';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendBookingConfirmationEmail(input: {
  bookingRef: string;
  raceName: string;
  packageLabel: string;
  totalAmount: number;
  runnerEmails: string[];
  cancellationUrl: string;
}) {
  const resend = getResendClient();
  if (!resend) {
    console.log('RESEND_API_KEY not configured, skipping booking confirmation email', input.bookingRef);
    return;
  }

  const from = process.env.FROM_EMAIL || 'One Run <noreply@one-run.net>';
  await resend.emails.send({
    from,
    to: input.runnerEmails,
    subject: `Booking confirmed — ${input.raceName}`,
    html: `<p>Your One Run booking <strong>${input.bookingRef}</strong> is confirmed.</p><p>Package: ${input.packageLabel}</p><p>Total: €${input.totalAmount.toLocaleString()}</p><p>Cancellation link: <a href="${input.cancellationUrl}">${input.cancellationUrl}</a></p>`,
  });
}
