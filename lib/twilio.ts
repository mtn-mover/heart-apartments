import Twilio from 'twilio';

// Lazy initialization to prevent build-time errors
let twilioClient: ReturnType<typeof Twilio> | null = null;

function getTwilioClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();

    if (!accountSid || !authToken) {
      throw new Error('Twilio environment variables are not set');
    }

    twilioClient = Twilio(accountSid, authToken);
  }
  return twilioClient;
}

export interface WhatsAppMessage {
  guestName: string;
  guestContact?: string;
  question: string;
  conversationSummary?: string;
  apartmentId?: string;
}

export async function sendWhatsAppToDiana(message: WhatsAppMessage): Promise<{ success: boolean; error?: string }> {
  const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;
  const dianaWhatsAppNumber = process.env.DIANA_WHATSAPP_NUMBER;

  // Debug logging
  console.log('Twilio config check:', {
    hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
    accountSidLength: process.env.TWILIO_ACCOUNT_SID?.length,
    hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
    authTokenLength: process.env.TWILIO_AUTH_TOKEN?.length,
    twilioNumber: twilioWhatsAppNumber,
    dianaNumber: dianaWhatsAppNumber?.substring(0, 15) + '...',
  });

  if (!twilioWhatsAppNumber || !dianaWhatsAppNumber) {
    console.error('WhatsApp numbers are not configured');
    return { success: false, error: 'WhatsApp numbers not configured' };
  }

  // Ensure whatsapp: prefix for Twilio WhatsApp API
  const fromNumber = twilioWhatsAppNumber.startsWith('whatsapp:')
    ? twilioWhatsAppNumber.trim()
    : `whatsapp:${twilioWhatsAppNumber.trim()}`;
  const toNumber = dianaWhatsAppNumber.startsWith('whatsapp:')
    ? dianaWhatsAppNumber.trim()
    : `whatsapp:${dianaWhatsAppNumber.trim()}`;

  console.log('Twilio sending:', { from: fromNumber, to: toNumber.substring(0, 20) + '...' });

  const formattedMessage = formatMessageForDiana(message);

  try {
    const result = await getTwilioClient().messages.create({
      body: formattedMessage,
      from: fromNumber,
      to: toNumber,
    });
    console.log('Twilio message sent:', result.sid);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Twilio error details:', {
      message: errorMessage,
      error: error,
    });
    return { success: false, error: errorMessage };
  }
}

function formatMessageForDiana(message: WhatsAppMessage): string {
  let text = `🏠 *Neue Gästeanfrage via Chatbot*\n\n`;

  text += `👤 *Gast:* ${message.guestName}\n`;

  if (message.guestContact) {
    text += `📧 *Kontakt:* ${message.guestContact}\n`;
  }

  if (message.apartmentId) {
    text += `🏡 *Apartment:* ${message.apartmentId.toUpperCase()}\n`;
  }

  text += `\n❓ *Frage:*\n${message.question}\n`;

  if (message.conversationSummary) {
    text += `\n📝 *Zusammenfassung:*\n${message.conversationSummary}`;
  }

  return text;
}

export function getConfirmationMessage(language: string, guestName: string): string {
  const messages: Record<string, string> = {
    de: `Danke ${guestName}! Deine Nachricht wurde an Diana gesendet. Sie wird sich so schnell wie möglich bei dir melden (normalerweise innerhalb einer Stunde). 💬`,

    en: `Thank you ${guestName}! Your message has been sent to Diana. She will get back to you as soon as possible (usually within an hour). 💬`,

    fr: `Merci ${guestName}! Votre message a été envoyé à Diana. Elle vous répondra dès que possible (généralement dans l'heure). 💬`,
  };

  return messages[language] || messages.en;
}
