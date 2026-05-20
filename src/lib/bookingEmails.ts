import { createTransport, type Transporter } from 'nodemailer';

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.log('SMTP not configured, skipping email');
    return null;
  }

  return createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    tls: { rejectUnauthorized: false },
  });
}

const from = process.env.FROM_EMAIL || 'One Run <support@one-run.net>';

async function send(to: string[], subject: string, html: string) {
  const transport = getTransporter();
  if (!transport) return;
  await transport.sendMail({ from, to: to.join(', '), subject, html });
}

export async function sendBookingConfirmationEmail(input: {
  bookingRef: string;
  raceName: string;
  packageLabel: string;
  totalAmount: number;
  runnerEmails: string[];
  cancellationUrl: string;
}) {
  await send(
    input.runnerEmails,
    `Booking confirmed — ${input.raceName}`,
    `<p>Your One Run booking <strong>${input.bookingRef}</strong> is confirmed.</p><p>Package: ${input.packageLabel}</p><p>Total: €${input.totalAmount.toLocaleString()}</p><p>Cancellation link: <a href="${input.cancellationUrl}">${input.cancellationUrl}</a></p>`
  ).catch((e) => console.error('Confirmation email failed:', e));
}

export async function sendAdminNotificationEmail(input: {
  bookingRef: string;
  raceName: string;
  packageLabel: string;
  totalAmount: number;
}) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return;
  await send(
    [adminEmail],
    `New booking — ${input.bookingRef}`,
    `<p>New booking: <strong>${input.bookingRef}</strong></p><p>Race: ${input.raceName}</p><p>Package: ${input.packageLabel}</p><p>Total: €${input.totalAmount.toLocaleString()}</p>`
  ).catch((e) => console.error('Admin notification email failed:', e));
}

export async function sendInterestAcknowledgement(email: string, raceName: string) {
  await send(
    [email],
    `Interest registered — ${raceName}`,
    `<p>We received your interest for <strong>${raceName}</strong>. We'll be in touch when entries open.</p>`
  ).catch((e) => console.error('Interest acknowledgement failed:', e));
}

export async function sendCancellationEmail(input: {
  bookingRef: string;
  raceName: string;
  runnerEmails: string[];
}) {
  await send(
    input.runnerEmails,
    `Booking cancelled — ${input.bookingRef}`,
    `<p>Your One Run booking <strong>${input.bookingRef}</strong> for ${input.raceName} has been cancelled.</p>`
  ).catch((e) => console.error('Cancellation email failed:', e));
}

export async function sendCancellationRequestedEmail(input: {
  bookingRef: string;
  raceName: string;
  runnerEmails: string[];
}) {
  await send(
    [...input.runnerEmails, process.env.ADMIN_EMAIL || process.env.SMTP_USER || ''].filter(Boolean),
    `Cancellation requested — ${input.bookingRef}`,
    `<p>Cancellation was requested for booking <strong>${input.bookingRef}</strong> (${input.raceName}). An admin will review your request.</p>`
  ).catch((e) => console.error('Cancellation request email failed:', e));
}
