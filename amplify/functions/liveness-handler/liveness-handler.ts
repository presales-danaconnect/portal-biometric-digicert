import { type Handler, type APIGatewayProxyEventV2, type APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  RekognitionClient,
  CreateFaceLivenessSessionCommand,
  GetFaceLivenessSessionResultsCommand,
} from '@aws-sdk/client-rekognition';
import { notifyWebhook } from '../shared/webhookNotifier';
import { getCorsHeaders } from '../shared/cors';

const client = new RekognitionClient({ region: process.env.AWS_REGION || 'us-east-1' });

interface CreateSessionRequestBody {
  action: 'create';
}

interface GetResultsRequestBody {
  action: 'results';
  sessionId: string;
  tenant: string;
  webhookUrl?: string;
  geolocation?: string | null;
  reference?: string | null;
}

type RequestBody = CreateSessionRequestBody | GetResultsRequestBody;

export const handler: Handler<APIGatewayProxyEventV2, APIGatewayProxyResultV2> = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const origin = event.headers.origin || event.headers.Origin || '';
  const corsHeaders = getCorsHeaders(origin);
  const sourceIp = event.requestContext?.http?.sourceIp || 'unknown';

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    sourceIp,
    path: event.rawPath,
    method: event.requestContext?.http?.method,
  }));

  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const body = JSON.parse(event.body || '{}') as RequestBody;

    if (body.action === 'create') {
      return await handleCreateSession(corsHeaders);
    }

    if (body.action === 'results') {
      return await handleGetResults(body, corsHeaders);
    }

    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid or missing action. Expected "create" or "results".' }),
    };
  } catch (error) {
    console.error('[Liveness] Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

async function handleCreateSession(corsHeaders: Record<string, string>): Promise<APIGatewayProxyResultV2> {
  console.log('[Liveness] Creating session...');

  const command = new CreateFaceLivenessSessionCommand({
    Settings: {
      AuditImagesLimit: 0,
    },
  });

  const response = await client.send(command);

  console.log('[Liveness] Session created:', response.SessionId);

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      sessionId: response.SessionId,
    }),
  };
}

async function handleGetResults(
  body: GetResultsRequestBody,
  corsHeaders: Record<string, string>
): Promise<APIGatewayProxyResultV2> {
  const { sessionId, tenant, webhookUrl, geolocation, reference } = body;

  if (!sessionId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing sessionId' }),
    };
  }

  console.log('[Liveness] Fetching results for session:', sessionId);

  const command = new GetFaceLivenessSessionResultsCommand({ SessionId: sessionId });
  const result = await client.send(command);

  console.log('[Liveness] Result status:', result.Status, 'confidence:', result.Confidence);

  const referenceImageBase64 = result.ReferenceImage?.Bytes
    ? Buffer.from(result.ReferenceImage.Bytes).toString('base64')
    : null;

  const resultData = {
    status: result.Status,
    confidence: result.Confidence,
    referenceImage: referenceImageBase64,
  };

  await notifyWebhook(webhookUrl, {
    tenant: tenant || 'unknown',
    service: 'liveness',
    timestamp: new Date().toISOString(),
    geolocation: geolocation || null,
    reference: reference || null,
    data: resultData,
  });

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      data: resultData,
    }),
  };
}
