import { type Handler, type APIGatewayProxyEventV2, type APIGatewayProxyResultV2 } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { OCR_PROMPT } from './ocrPrompt';
import { notifyWebhook } from '../shared/webhookNotifier';

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://main.d21x455s6ork0e.amplifyapp.com',
];

interface DocumentInfo {
  documentNumber: string;
  country: string;
  documentType: string;
  birthDate: string;
  firstName: string;
  lastName: string;
  expirationDate: string;
  gender?: string;
  nationality?: string;
}

interface Base64Data {
  data: string;
  mediaType: string;
}

function getCorsHeaders(origin: string): Record<string, string> {
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*');
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  };
}

function parseDataURI(dataURI: string): Base64Data {
  const match = dataURI.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (match) {
    return { mediaType: match[1], data: match[2] };
  }
  return { mediaType: 'image/jpeg', data: dataURI };
}

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

  try {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    const body = event.body;

    let frontImage: string = '';
    let backImage: string = '';
    let tenant: string = 'unknown';
    let webhookUrl: string | undefined;
    let geolocation: string | null = null;

    if (contentType.includes('application/json')) {
      const parsed = JSON.parse(body || '{}');
      frontImage = parsed.frontImage;
      backImage = parsed.backImage;
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

    if (!frontImage || !backImage) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing frontImage or backImage' }),
      };
    }

    const frontSizeBytes = new Blob([frontImage]).size;
    const backSizeBytes = new Blob([backImage]).size;

    if (frontSizeBytes > MAX_IMAGE_SIZE_BYTES) {
      console.log(`[OCR] Payload too large from ${sourceIp}: front=${frontSizeBytes}bytes`);
      return {
        statusCode: 413,
        headers: corsHeaders,
        body: JSON.stringify({ error: `Front image exceeds ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB limit` }),
      };
    }

    if (backSizeBytes > MAX_IMAGE_SIZE_BYTES) {
      console.log(`[OCR] Payload too large from ${sourceIp}: back=${backSizeBytes}bytes`);
      return {
        statusCode: 413,
        headers: corsHeaders,
        body: JSON.stringify({ error: `Back image exceeds ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB limit` }),
      };
    }

    console.log(`[OCR] Processing request from ${sourceIp}: front=${Math.round(frontSizeBytes/1024)}KB, back=${Math.round(backSizeBytes/1024)}KB`);

    const result = await extractDocumentInfo(frontImage, backImage);

    console.log(`[OCR] Success for ${sourceIp}:`, JSON.stringify(result));

    await notifyWebhook(webhookUrl, {
      tenant,
      service: 'ocr',
      timestamp: new Date().toISOString(),
      geolocation,
      data: result,
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: { documentInfo: result }
      }),
    };
  } catch (error) {
    console.error(`[OCR] Error for ${sourceIp}:`, error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

async function extractDocumentInfo(frontImage: string, backImage: string): Promise<DocumentInfo> {
  const frontData = parseDataURI(frontImage);
  const backData = parseDataURI(backImage);

  const prompt = OCR_PROMPT;
  const modelId = 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';

  console.log('[OCR] Calling Bedrock with model:', modelId);

  const command = new InvokeModelCommand({
    modelId: modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: frontData.mediaType, data: frontData.data } },
            { type: 'image', source: { type: 'base64', media_type: backData.mediaType, data: backData.data } },
            { type: 'text', text: prompt }
          ]
        }
      ]
    })
  });

  console.log('[OCR] Sending request to Bedrock...');
  const response = await client.send(command);
  console.log('[OCR] Received response from Bedrock');

  const responseBody = new TextDecoder().decode(response.body);
  const parsedResponse = JSON.parse(responseBody);

  let extractedText = '';
  if (parsedResponse.content && Array.isArray(parsedResponse.content)) {
    extractedText = parsedResponse.content.map((block: any) =>
      block.type === 'text' ? block.text : ''
    ).join('\n');
  } else {
    extractedText = parsedResponse.completion || parsedResponse.text || JSON.stringify(parsedResponse);
  }

  console.log('[OCR] Extracted text:', extractedText.substring(0, 200) + '...');

  return parseDocumentInfo(extractedText);
}

function parseDocumentInfo(text: string): DocumentInfo {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonText = jsonMatch ? jsonMatch[1] : text;

  try {
    const parsed = JSON.parse(jsonText.trim());
    return {
      documentNumber: parsed.documentNumber || '',
      country: parsed.country || '',
      documentType: parsed.documentType || '',
      birthDate: parsed.birthDate || '',
      firstName: parsed.firstName || '',
      lastName: parsed.lastName || '',
      expirationDate: parsed.expirationDate || '',
      gender: parsed.gender,
      nationality: parsed.nationality,
    };
  } catch {
    return {
      documentNumber: '',
      country: '',
      documentType: '',
      birthDate: '',
      firstName: '',
      lastName: '',
      expirationDate: '',
    };
  }
}
