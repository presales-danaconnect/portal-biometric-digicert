import { type Handler, type APIGatewayProxyEventV2, type APIGatewayProxyResultV2 } from 'aws-lambda';
import { sendWhatsAppReply } from './whatsappReply';

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

interface WebhookPayload {
  tenant: string;
  service: string;
  timestamp: string;
  geolocation: string | null;
  reference: string | null;
  data: unknown;
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
    const payload = JSON.parse(event.body || '{}') as WebhookPayload;

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
    // Still return 200 so the sender (our own Lambdas) doesn't treat
    // a webhook processing error as a failed verification.
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true, error: 'processing_error' }),
    };
  }
};
