import { NextResponse } from 'next/server';
import Twilio from 'twilio';

// Temporary debug endpoint - remove after fixing WhatsApp
export async function GET() {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();

    if (!accountSid || !authToken) {
      return NextResponse.json({ error: 'Twilio credentials not set' });
    }

    const client = Twilio(accountSid, authToken);

    // Fetch last 5 messages
    const messages = await client.messages.list({ limit: 5 });

    const debugInfo = messages.map((msg) => ({
      sid: msg.sid,
      from: msg.from,
      to: msg.to,
      status: msg.status,
      errorCode: msg.errorCode,
      errorMessage: msg.errorMessage,
      dateSent: msg.dateSent,
      direction: msg.direction,
      body: msg.body?.substring(0, 50) + '...',
    }));

    return NextResponse.json({
      twilioWhatsAppNumber: process.env.TWILIO_WHATSAPP_NUMBER,
      dianaWhatsAppNumber: process.env.DIANA_WHATSAPP_NUMBER?.substring(0, 15) + '...',
      recentMessages: debugInfo,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage });
  }
}
