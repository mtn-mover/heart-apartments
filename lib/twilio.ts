import Twilio from 'twilio';

// Lazy initialization to prevent build-time errors
let twilioClient: ReturnType<typeof Twilio> | null = null;

function getTwilioClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

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

export async function sendWhatsAppToDiana(message: WhatsAppMessage): Promise<boolean> {
  const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;
  const dianaWhatsAppNumber = process.env.DIANA_WHATSAPP_NUMBER;

  if (!twilioWhatsAppNumber || !dianaWhatsAppNumber) {
    console.error('WhatsApp numbers are not configured');
    return false;
  }

  const formattedMessage = formatMessageForDiana(message);

  try {
    await getTwilioClient().messages.create({
      body: formattedMessage,
      from: twilioWhatsAppNumber,
      to: dianaWhatsAppNumber,
    });
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
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
