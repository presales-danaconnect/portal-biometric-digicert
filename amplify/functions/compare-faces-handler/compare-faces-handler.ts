import { type Handler, type APIGatewayProxyEventV2, type APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  RekognitionClient,
  GetFaceLivenessSessionResultsCommand,
  CompareFacesCommand,
} from '@aws-sdk/client-rekognition';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { notifyWebhook } from '../shared/webhookNotifier';
import { getCorsHeaders } from '../shared/cors';
import { DOCUMENT_VALIDATION_PROMPT } from './documentValidationPrompt';

const rekognitionClient = new RekognitionClient({ region: process.env.AWS_REGION || 'us-east-1' });
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const BEDROCK_MODEL_ID = 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';

interface Base64Data {
  data: string;
  mediaType: string;
}

function parseDataURI(dataURI: string): Base64Data {
  const match = dataURI.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (match) {
    return { mediaType: match[1], data: match[2] };
  }
  return { mediaType: 'image/jpeg', data: dataURI };
}

/**
 * Maps known Rekognition exceptions to stable error codes the frontend
 * can translate into user-friendly messages. See:
 * https://docs.aws.amazon.com/rekognition/latest/APIReference/CommonErrors.html
 */
function classifyRekognitionError(error: unknown): { errorCode: string; message: string } {
  const name = error instanceof Error ? error.name : '';

  switch (name) {
    case 'InvalidParameterException':
      return { errorCode: 'NO_FACE_DETECTED', message: 'No face detected in one of the images' };
    case 'ImageTooLargeException':
      return { errorCode: 'IMAGE_TOO_LARGE', message: 'Image size exceeds the allowed limit' };
    case 'InvalidImageFormatException':
      return { errorCode: 'INVALID_IMAGE_FORMAT', message: 'Invalid image format' };
    case 'AccessDeniedException':
      return { errorCode: 'ACCESS_DENIED', message: 'Not authorized to perform this action' };
    case 'InvalidS3ObjectException':
      return { errorCode: 'INVALID_S3_OBJECT', message: 'Unable to access the referenced image' };
    case 'ProvisionedThroughputExceededException':
      return { errorCode: 'THROUGHPUT_EXCEEDED', message: 'Request rate limit exceeded, please try again' };
    case 'ThrottlingException':
      return { errorCode: 'THROTTLING', message: 'Service temporarily unavailable, please try again' };
    case 'InternalServerError':
      return { errorCode: 'INTERNAL_SERVER_ERROR', message: 'Rekognition service issue, please try again' };
    default:
      return { errorCode: 'GENERIC_ERROR', message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Uses Bedrock (Claude Sonnet) to validate that the document image
 * actually shows a valid identity document with a visible face photo.
 */
async function isValidIdentityDocument(documentData: Base64Data): Promise<boolean> {
  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: documentData.mediaType, data: documentData.data } },
            { type: 'text', text: DOCUMENT_VALIDATION_PROMPT },
          ],
        },
      ],
    }),
  });

  const response = await bedrockClient.send(command);
  const responseBody = new TextDecoder().decode(response.body);
  const parsedResponse = JSON.parse(responseBody);

  let extractedText = '';
  if (parsedResponse.content && Array.isArray(parsedResponse.content)) {
    extractedText = parsedResponse.content.map((block: any) =>
      block.type === 'text' ? block.text : ''
    ).join('\n');
  }

  console.log('[CompareFaces] Document validation response:', extractedText.substring(0, 200));

  try {
    const jsonMatch = extractedText.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : extractedText;
    const parsed = JSON.parse(jsonText.trim());
    return parsed.isValidDocument === true;
  } catch {
    return false;
  }
}

interface CompareFacesRequestBody {
  action?: 'validate' | 'compare';
  sessionId: string;
  documentImage: string;
  tenant: string;
  webhookUrl?: string;
  geolocation?: string | null;
  similarityThreshold?: number;
}

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

  let tenant = 'unknown';
  let webhookUrl: string | undefined;
  let geolocation: string | null = null;

  try {
    const body = JSON.parse(event.body || '{}') as CompareFacesRequestBody;
    const { sessionId, documentImage, similarityThreshold = 80 } = body;
    const action = body.action || 'compare';
    tenant = body.tenant || 'unknown';
    webhookUrl = body.webhookUrl;
    geolocation = body.geolocation || null;

    if (!documentImage) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, errorCode: 'MISSING_PARAMS', error: 'Missing documentImage' }),
      };
    }

    const documentSizeBytes = new Blob([documentImage]).size;
    if (documentSizeBytes > MAX_IMAGE_SIZE_BYTES) {
      return {
        statusCode: 413,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          errorCode: 'IMAGE_TOO_LARGE',
          error: `Document image exceeds ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB limit`,
        }),
      };
    }

    const documentData = parseDataURI(documentImage);

    // Validate the document photo with Bedrock
    console.log(`[CompareFaces] Validating document image with Bedrock (action=${action})...`);
    const isValidDocument = await isValidIdentityDocument(documentData);

    if (!isValidDocument) {
      console.log(`[CompareFaces] Not a valid document for ${sourceIp}`);

      if (action === 'compare') {
        await notifyWebhook(webhookUrl, {
          tenant,
          service: 'compare-faces',
          timestamp: new Date().toISOString(),
          geolocation,
          data: { success: false, errorCode: 'NOT_A_DOCUMENT', error: 'The provided image does not show a valid identity document' },
        });
      }

      return {
        statusCode: 422,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          errorCode: 'NOT_A_DOCUMENT',
          error: 'The provided image does not show a valid identity document',
        }),
      };
    }

    // action === 'validate' stops here — the document is valid, nothing more to do yet
    if (action === 'validate') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, data: { isValidDocument: true } }),
      };
    }

    // action === 'compare' continues with the full Liveness comparison flow
    if (!sessionId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, errorCode: 'MISSING_PARAMS', error: 'Missing sessionId' }),
      };
    }

    console.log('[CompareFaces] Fetching Liveness session results:', sessionId);
    const livenessResult = await rekognitionClient.send(
      new GetFaceLivenessSessionResultsCommand({ SessionId: sessionId })
    );

    if (!livenessResult.ReferenceImage?.Bytes) {
      return {
        statusCode: 422,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          errorCode: 'NO_LIVENESS_IMAGE',
          error: 'No reference image available for this Liveness session',
        }),
      };
    }

    const documentBytes = Buffer.from(documentData.data, 'base64');
    const referenceImageBase64 = Buffer.from(livenessResult.ReferenceImage.Bytes).toString('base64');

    let compareResult;
    try {
      console.log('[CompareFaces] Calling Rekognition CompareFaces...');
      compareResult = await rekognitionClient.send(
        new CompareFacesCommand({
          SourceImage: { Bytes: documentBytes },
          TargetImage: { Bytes: livenessResult.ReferenceImage.Bytes },
          SimilarityThreshold: 0,
        })
      );
    } catch (compareError) {
      const { errorCode, message } = classifyRekognitionError(compareError);
      console.error(`[CompareFaces] Rekognition error (${errorCode}):`, compareError);

      await notifyWebhook(webhookUrl, {
        tenant,
        service: 'compare-faces',
        timestamp: new Date().toISOString(),
        geolocation,
        data: { success: false, errorCode, error: message },
      });

      return {
        statusCode: 422,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, errorCode, error: message }),
      };
    }

    const bestMatch = compareResult.FaceMatches?.sort(
      (a, b) => (b.Similarity ?? 0) - (a.Similarity ?? 0)
    )[0];

    const similarity = bestMatch?.Similarity ?? 0;
    const isMatch = similarity >= similarityThreshold;

    const resultData = {
      similarity,
      isMatch,
      similarityThreshold,
      documentImage: documentData.data,
      referenceImage: referenceImageBase64,
    };

    console.log('[CompareFaces] Result:', JSON.stringify({ similarity, isMatch, similarityThreshold }));

    await notifyWebhook(webhookUrl, {
      tenant,
      service: 'compare-faces',
      timestamp: new Date().toISOString(),
      geolocation,
      data: resultData,
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: { similarity, isMatch, similarityThreshold },
      }),
    };
  } catch (error) {
    console.error('[CompareFaces] Unexpected error:', error);
    const { errorCode, message } = classifyRekognitionError(error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, errorCode, error: message }),
    };
  }
};
