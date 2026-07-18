import { Resend } from 'resend';

// Lazy init (pattern of lib/supabase.ts). Without RESEND_API_KEY emails are
// logged to the console instead of sent — keeps local dev fully runnable.
let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send (or log) one email. Throws on hard failures — callers in the webhook
 * catch and log, because a mail problem must never flip a booking status.
 */
export async function sendEmail(mail: OutgoingEmail): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.log(`[email:log-only] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
    return;
  }
  const from = process.env.BOOKING_FROM_EMAIL;
  if (!from) throw new Error('BOOKING_FROM_EMAIL is not set');

  const { error } = await resend.emails.send({
    from: `Little Heart Guesthouse <${from}>`,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
  if (error) throw new Error(`Resend failed: ${error.message}`);
}
