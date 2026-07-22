import { type Handler, type APIGatewayProxyEventV2, type APIGatewayProxyResultV2 } from 'aws-lambda';
import { createHmac, timingSafeEqual } from 'crypto';
import { sendWhatsAppReply } from './whatsappReply';

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WEBHOOK_SIGNING_SECRET = process.env.WEBHOOK_SIGNING_SECRET || '';

interface WebhookPayload {
  tenant: string;
  service: string;
  timestamp: string;
  geolocation: string | null;
  reference: string | null;
  data: unknown;
}

/**
 * Verifies the X-Webhook-Signature header against a freshly computed
 * HMAC-SHA256 of the raw body, using constant-time comparison to avoid
 * timing attacks. Returns true if there's no secret configured (so local
 * dev without the env var set doesn't break), false on any mismatch.
 */
function isValidSignature(rawBody: string, receivedSignature: string | undefined): boolean {
  if (!WEBHOOK_SIGNING_SECRET) return true; // signing disabled, nothing to check
  if (!receivedSignature) return false;

  const expected = createHmac('sha256', WEBHOOK_SIGNING_SECRET).update(rawBody).digest('hex');

  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(receivedSignature, 'hex');
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export const handler: Handler<APIGatewayProxyEventV2, APIGatewayProxyResultV2> = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const rawBody = event.body || '{}';
    const receivedSignature = event.headers['x-webhook-signature'] || event.headers['X-Webhook-Signature'];

    if (!isValidSignature(rawBody, receivedSignature)) {
      console.warn('[WebhookHandler] Rejected request with invalid or missing signature');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid signature' }),
      };
    }

    const payload = JSON.parse(rawBody) as WebhookPayload;

    console.log('[WebhookHandler] Event received:', JSON.stringify(payload, null, 2));

    // A non-null reference means this result originated from the WhatsApp
    // inbound flow, where reference carries the user's phone number.
    if (payload.reference) {
      console.log(`[WebhookHandler] Sending WhatsApp reply to ${payload.reference}`);
      await sendWhatsAppReply(
        WHATSAPP_PHONE_NUMBER_ID,
        WHATSAPP_ACCESS_TOKEN,
        payload.reference,
        payload.service,
        payload.data
      );
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('[WebhookHandler] Error:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true, error: 'processing_error' }),
    };
  }
};
