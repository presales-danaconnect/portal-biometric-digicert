import { type Handler, type APIGatewayProxyEventV2, type APIGatewayProxyResultV2 } from 'aws-lambda';
import {
  RekognitionClient,
  GetFaceLivenessSessionResultsCommand,
  CompareFacesCommand,
} from '@aws-sdk/client-rekognition';
import { notifyWebhook } from '../shared/webhookNotifier';
import { getCorsHeaders } from '../shared/cors';

const client = new RekognitionClient({ region: process.env.AWS_REGION || 'us-east-1' });

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

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
      // For CompareFaces specifically, this is almost always "no face detected"
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

interface CompareFacesRequestBody {
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
    tenant = body.tenant || 'unknown';
    webhookUrl = body.webhookUrl;
    geolocation = body.geolocation || null;

    if (!sessionId || !documentImage) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, errorCode: 'MISSING_PARAMS', error: 'Missing sessionId or documentImage' }),
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

    // 1. Fetch the reference image from the completed Liveness session
    console.log('[CompareFaces] Fetching Liveness session results:', sessionId);
    const livenessResult = await client.send(
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

    const documentData = parseDataURI(documentImage);
    const documentBytes = Buffer.from(documentData.data, 'base64');
    const referenceImageBase64 = Buffer.from(livenessResult.ReferenceImage.Bytes).toString('base64');

    // 2. Compare the document photo against the Liveness reference image
    let compareResult;
    try {
      console.log('[CompareFaces] Calling Rekognition CompareFaces...');
      compareResult = await client.send(
        new CompareFacesCommand({
          SourceImage: { Bytes: documentBytes },
          TargetImage: { Bytes: livenessResult.ReferenceImage.Bytes },
          SimilarityThreshold: 0, // return the best match regardless; we apply our own threshold below
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
