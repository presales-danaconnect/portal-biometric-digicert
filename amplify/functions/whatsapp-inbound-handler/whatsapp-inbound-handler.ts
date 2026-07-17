import { type Handler, type APIGatewayProxyEventV2, type APIGatewayProxyResultV2 } from 'aws-lambda';
import { sendWhatsAppMessage } from '../shared/whatsapp';

const MOCK_CLIENT_API_URL = process.env.MOCK_CLIENT_API_URL || '';
const VERIFICATION_BASE_URL = process.env.VERIFICATION_BASE_URL || '';
const DEFAULT_TENANT = process.env.DEFAULT_TENANT || 'whatsapp';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

interface WhatsAppMessage {
  from: string;
  text?: { body: string };
  type: string;
}

interface WhatsAppWebhookBody {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: WhatsAppMessage[];
      };
    }>;
  }>;
}

function extractMessage(body: WhatsAppWebhookBody): WhatsAppMessage | null {
  const messages = body.entry?.[0]?.changes?.[0]?.value?.messages;
  if (!messages || messages.length === 0) return null;
  return messages[0];
}

async function lookupDocument(documentNumber: string): Promise<{ found: boolean; firstName?: string }> {
  const url = `${MOCK_CLIENT_API_URL}${MOCK_CLIENT_API_URL.includes('?') ? '&' : '?'}documentNumber=${encodeURIComponent(documentNumber)}`;
  const response = await fetch(url);
  if (!response.ok) return { found: false };
  return response.json();
}

export const handler: Handler<APIGatewayProxyEventV2, APIGatewayProxyResultV2> = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  console.log('[WhatsAppInbound] Event received:', event.body);

  try {
    const body = JSON.parse(event.body || '{}') as WhatsAppWebhookBody;
    const message = extractMessage(body);

    if (!message || message.type !== 'text' || !message.text) {
      // Nothing to reply to (e.g. status update, not an actual user message)
      return { statusCode: 200, body: 'ignored' };
    }

    const from = message.from;
    const text = message.text.body.trim();
    const isDocumentNumber = /^\d{5,15}$/.test(text);

    if (!isDocumentNumber) {
      await sendWhatsAppMessage(
        WHATSAPP_PHONE_NUMBER_ID,
        WHATSAPP_ACCESS_TOKEN,
        from,
        'Hola 👋 Para consultar tu saldo, por favor envíame tu número de documento de identidad (solo números).'
      );
      return { statusCode: 200, body: 'ok' };
    }

    console.log('[WhatsAppInbound] Looking up document:', text);
    const lookup = await lookupDocument(text);

    if (!lookup.found) {
      await sendWhatsAppMessage(
        WHATSAPP_PHONE_NUMBER_ID,
        WHATSAPP_ACCESS_TOKEN,
        from,
        'No encontramos un registro asociado a ese número de documento. Por favor verifica e intenta de nuevo.'
      );
      return { statusCode: 200, body: 'ok' };
    }

    const verificationUrl = `${VERIFICATION_BASE_URL}/verify?service=data-verification&tenant=${DEFAULT_TENANT}&docRef=${encodeURIComponent(text)}&reference=${encodeURIComponent(from)}&lang=es`;

    await sendWhatsAppMessage(
      WHATSAPP_PHONE_NUMBER_ID,
      WHATSAPP_ACCESS_TOKEN,
      from,
      `¡Hola ${lookup.firstName || ''}! 👋 Para consultar tu saldo, necesitamos verificar tu identidad. Por favor completa esta verificación:\n\n${verificationUrl}`
    );

    return { statusCode: 200, body: 'ok' };
  } catch (error) {
    console.error('[WhatsAppInbound] Error:', error);
    return { statusCode: 200, body: 'error handled' };
  }
};
