import { type Handler, type APIGatewayProxyEventV2, type APIGatewayProxyResultV2 } from 'aws-lambda';
import { extractDocumentInfo } from '../shared/documentExtractor';
import { notifyWebhook } from '../shared/webhookNotifier';
import { getCorsHeaders } from '../shared/cors';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

async function validateRequestToken(_event: APIGatewayProxyEventV2): Promise<{ valid: boolean; error?: string }> {
  return { valid: true };
}

export const handler: Handler<APIGatewayProxyEventV2, APIGatewayProxyResultV2> = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const origin = event.headers.origin || event.headers.Origin || '';
  const corsHeaders = getCorsHeaders(origin);
  const timestamp = new Date().toISOString();
  const sourceIp = event.requestContext?.http?.sourceIp || 'unknown';

  console.log(JSON.stringify({
    timestamp,
    sourceIp,
    path: event.rawPath,
    method: event.requestContext?.http?.method,
    userAgent: event.headers['User-Agent'] || 'unknown',
  }));

  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const tokenValidation = await validateRequestToken(event);
  if (!tokenValidation.valid) {
    console.log(`[OCR] Unauthorized request from ${sourceIp}: ${tokenValidation.error}`);
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: tokenValidation.error }),
    };
  }

  let tenant = 'unknown';
  let webhookUrl: string | undefined;
  let geolocation: string | null = null;

  try {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    const body = event.body;

    let frontImage: string = '';
    let backImage: string | undefined;

    if (contentType.includes('application/json')) {
      const parsed = JSON.parse(body || '{}');
      frontImage = parsed.frontImage;
      backImage = parsed.backImage || undefined;
      tenant = parsed.tenant || 'unknown';
      webhookUrl = parsed.webhookUrl;
      geolocation = parsed.geolocation || null;
    } else {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Content-Type must be application/json' }),
      };
    }

    if (!frontImage) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing frontImage' }),
      };
    }

    const frontSizeBytes = new Blob([frontImage]).size;

    if (frontSizeBytes > MAX_IMAGE_SIZE_BYTES) {
      console.log(`[OCR] Payload too large from ${sourceIp}: front=${frontSizeBytes}bytes`);
      return {
        statusCode: 413,
        headers: corsHeaders,
        body: JSON.stringify({ error: `Front image exceeds ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB limit` }),
      };
    }

    if (backImage) {
      const backSizeBytes = new Blob([backImage]).size;
      if (backSizeBytes > MAX_IMAGE_SIZE_BYTES) {
        console.log(`[OCR] Payload too large from ${sourceIp}: back=${backSizeBytes}bytes`);
        return {
          statusCode: 413,
          headers: corsHeaders,
          body: JSON.stringify({ error: `Back image exceeds ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB limit` }),
        };
      }
    }

    console.log(`[OCR] Processing request from ${sourceIp}: front=${Math.round(frontSizeBytes/1024)}KB, hasBack=${!!backImage}`);

    const extraction = await extractDocumentInfo(frontImage, backImage);

    if (!extraction.isValidDocument) {
      console.log(`[OCR] Not a valid document for ${sourceIp}`);

      await notifyWebhook(webhookUrl, {
        tenant,
        service: 'ocr',
        timestamp: new Date().toISOString(),
        geolocation,
        data: { success: false, errorCode: 'NOT_A_DOCUMENT', error: 'The provided image(s) do not show a valid identity document' },
      });

      return {
        statusCode: 422,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          errorCode: 'NOT_A_DOCUMENT',
          error: 'The provided image(s) do not show a valid identity document',
        }),
      };
    }

    console.log(`[OCR] Success for ${sourceIp}:`, JSON.stringify(extraction.documentInfo));

    await notifyWebhook(webhookUrl, {
      tenant,
      service: 'ocr',
      timestamp: new Date().toISOString(),
      geolocation,
      data: extraction.documentInfo,
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: { documentInfo: extraction.documentInfo }
      }),
    };
  } catch (error) {
    console.error(`[OCR] Error for ${sourceIp}:`, error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        errorCode: 'GENERIC_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
