import { NextResponse } from 'next/server';
import { sendWhatsAppToDiana, getConfirmationMessage, type WhatsAppMessage } from '@/lib/twilio';

interface WhatsAppRequest {
  guestName: string;
  guestContact?: string;
  question: string;
  conversationSummary?: string;
  apartmentId?: string;
  language: string;
}

export async function POST(request: Request) {
  try {
    const body: WhatsAppRequest = await request.json();
    const { guestName, guestContact, question, conversationSummary, apartmentId, language } = body;

    // Validate required fields
    if (!guestName || !question) {
      return NextResponse.json(
        { error: 'Name and question are required' },
        { status: 400 }
      );
    }

    // Send WhatsApp to Diana
    const message: WhatsAppMessage = {
      guestName,
      guestContact,
      question,
      conversationSummary,
      apartmentId,
    };

    const success = await sendWhatsAppToDiana(message);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to send WhatsApp message' },
        { status: 500 }
      );
    }

    // Return confirmation message
    const confirmationMessage = getConfirmationMessage(language, guestName);

    return NextResponse.json({
      success: true,
      message: confirmationMessage,
    });
  } catch (error) {
    console.error('WhatsApp API error:', error);
    return NextResponse.json(
      { error: 'An error occurred while sending your message' },
      { status: 500 }
    );
  }
}
