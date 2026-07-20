import { type Handler, type APIGatewayProxyEventV2, type APIGatewayProxyResultV2 } from 'aws-lambda';
import { sendWhatsAppMessage } from '../shared/whatsapp';

const MOCK_CLIENT_API_URL = process.env.MOCK_CLIENT_API_URL || '';
const VERIFICATION_BASE_URL = process.env.VERIFICATION_BASE_URL || '';
const DEFAULT_TENANT = process.env.DEFAULT_TENANT || 'demo';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

const MENU_TEXT =
  'Hola 👋 Soy el asistente virtual de tu banco. ¿En qué puedo ayudarte hoy?\n\n' +
  '1️⃣ Consultar saldo\n' +
  '2️⃣ Realizar un pago\n' +
  '3️⃣ Verificar documento de identidad\n' +
  '4️⃣ Comparar rostro con documento\n\n' +
  'Responde con el número de la opción que necesitas.';

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

function buildVerificationUrl(service: string, tenant: string, from: string, docRef?: string): string {
  const params = new URLSearchParams({
    service,
    tenant,
    reference: from,
    lang: 'es',
  });
  if (docRef) {
    params.set('docRef', docRef);
  }
  return `${VERIFICATION_BASE_URL}/verify?${params.toString()}`;
}

async function reply(to: string, text: string): Promise<void> {
  await sendWhatsAppMessage(WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, to, text);
}

export const handler: Handler<APIGatewayProxyEventV2, APIGatewayProxyResultV2> = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  console.log('[WhatsAppInbound] Event received:', event.body);

  try {
    const body = JSON.parse(event.body || '{}') as WhatsAppWebhookBody;
    const message = extractMessage(body);

    if (!message || message.type !== 'text' || !message.text) {
      return { statusCode: 200, body: 'ignored' };
    }

    const from = message.from;
    const text = message.text.body.trim();

    // A message that's purely digits is always treated as a document
    // number for the "consultar saldo" (data-verification) flow, whether
    // the user picked option 1 first or just typed the number directly.
    if (/^\d{5,15}$/.test(text)) {
      console.log('[WhatsAppInbound] Looking up document:', text);
      const lookup = await lookupDocument(text);

      if (!lookup.found) {
        await reply(from, 'No encontramos un registro asociado a ese número de documento. Por favor verifica e intenta de nuevo.');
        return { statusCode: 200, body: 'ok' };
      }

      const url = buildVerificationUrl('data-verification', DEFAULT_TENANT, from, text);
      await reply(
        from,
        `¡Hola ${lookup.firstName || ''}! 👋 Para consultar tu saldo, necesitamos verificar tu identidad. Por favor completa esta verificación:\n\n${url}`
      );
      return { statusCode: 200, body: 'ok' };
    }

    switch (text) {
      case '1':
        await reply(from, 'Para consultar tu saldo, por favor envíame tu número de documento de identidad (solo números).');
        return { statusCode: 200, body: 'ok' };

      case '2': {
        const url = buildVerificationUrl('liveness', DEFAULT_TENANT, from);
        await reply(from, `Para realizar tu pago, primero necesitamos confirmar que eres tú. Completa esta verificación de vida:\n\n${url}`);
        return { statusCode: 200, body: 'ok' };
      }

      case '3': {
        const url = buildVerificationUrl('ocr', DEFAULT_TENANT, from);
        await reply(from, `Vamos a verificar tu documento de identidad. Completa este proceso:\n\n${url}`);
        return { statusCode: 200, body: 'ok' };
      }

      case '4': {
        const url = buildVerificationUrl('compare-faces', DEFAULT_TENANT, from);
        await reply(from, `Vamos a comparar tu rostro con tu documento de identidad. Completa este proceso:\n\n${url}`);
        return { statusCode: 200, body: 'ok' };
      }

      default:
        await reply(from, MENU_TEXT);
        return { statusCode: 200, body: 'ok' };
    }
  } catch (error) {
    console.error('[WhatsAppInbound] Error:', error);
    return { statusCode: 200, body: 'error handled' };
  }
};
