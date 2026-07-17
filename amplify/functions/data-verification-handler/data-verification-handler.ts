import { type Handler, type APIGatewayProxyEventV2, type APIGatewayProxyResultV2 } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { extractDocumentInfo, DocumentInfo } from '../shared/documentExtractor';
import { notifyWebhook } from '../shared/webhookNotifier';
import { getCorsHeaders } from '../shared/cors';
import { DATA_COMPARISON_PROMPT } from './comparisonPrompt';

const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const BEDROCK_MODEL_ID = 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

interface ExternalApiData {
  found: boolean;
  firstName?: string;
  lastName?: string;
  documentNumber?: string;
  birthDate?: string;
}

interface FieldComparison {
  match: boolean;
  note: string;
}

interface ComparisonAnalysis {
  overallMatch: boolean;
  confidence: 'high' | 'medium' | 'low';
  fields: {
    firstName: FieldComparison;
    lastName: FieldComparison;
    documentNumber: FieldComparison;
    birthDate: FieldComparison;
  };
  summary: string;
}

interface DataVerificationRequestBody {
  frontImage: string;
  backImage?: string;
  docRef: string;
  tenant: string;
  webhookUrl?: string;
  geolocation?: string | null;
  dataVerificationApiUrl: string;
}

async function queryExternalApi(apiUrl: string, docRef: string): Promise<ExternalApiData> {
  const url = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}documentNumber=${encodeURIComponent(docRef)}`;
  console.log('[DataVerification] Querying external API:', url);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`External API responded with status ${response.status}`);
  }
  return response.json();
}

async function compareWithBedrock(ocrData: DocumentInfo, externalData: ExternalApiData): Promise<ComparisonAnalysis> {
  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${DATA_COMPARISON_PROMPT}\n\nOCR data:\n${JSON.stringify(ocrData)}\n\nExternal system data:\n${JSON.stringify(externalData)}`,
            },
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

  console.log('[DataVerification] Comparison response:', extractedText.substring(0, 300));

  const jsonMatch = extractedText.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonText = jsonMatch ? jsonMatch[1] : extractedText;
  return JSON.parse(jsonText.trim());
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
    const body = JSON.parse(event.body || '{}') as DataVerificationRequestBody;
    const { frontImage, backImage, docRef, dataVerificationApiUrl } = body;
    tenant = body.tenant || 'unknown';
    webhookUrl = body.webhookUrl;
    geolocation = body.geolocation || null;

    if (!frontImage || !docRef || !dataVerificationApiUrl) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          errorCode: 'MISSING_PARAMS',
          error: 'Missing frontImage, docRef, or dataVerificationApiUrl',
        }),
      };
    }

    const frontSizeBytes = new Blob([frontImage]).size;
    if (frontSizeBytes > MAX_IMAGE_SIZE_BYTES) {
      return {
        statusCode: 413,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          errorCode: 'IMAGE_TOO_LARGE',
          error: `Front image must not exceed ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB`,
        }),
      };
    }

    if (backImage) {
      const backSizeBytes = new Blob([backImage]).size;
      if (backSizeBytes > MAX_IMAGE_SIZE_BYTES) {
        return {
          statusCode: 413,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            errorCode: 'IMAGE_TOO_LARGE',
            error: `Back image must not exceed ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB`,
          }),
        };
      }
    }

    // 1. Extract document data via Bedrock (shared logic with ocr-handler)
    console.log(`[DataVerification] Extracting document data for ${sourceIp}, hasBack=${!!backImage}...`);
    const extraction = await extractDocumentInfo(frontImage, backImage);

    if (!extraction.isValidDocument || !extraction.documentInfo) {
      await notifyWebhook(webhookUrl, {
        tenant,
        service: 'data-verification',
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

    const ocrData = extraction.documentInfo;

    // 2. Query the tenant's external API using the trusted docRef (not the OCR-extracted number)
    console.log(`[DataVerification] Querying external API for docRef: ${docRef}`);
    const externalData = await queryExternalApi(dataVerificationApiUrl, docRef);

    if (!externalData.found) {
      const resultData = {
        queried: true,
        found: false,
        ocrData,
        externalApiData: null,
        analysis: null,
      };

      await notifyWebhook(webhookUrl, {
        tenant,
        service: 'data-verification',
        timestamp: new Date().toISOString(),
        geolocation,
        data: resultData,
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, data: resultData }),
      };
    }

    // 3. Compare OCR data vs external data using Bedrock (semantic comparison, not exact match)
    console.log('[DataVerification] Comparing OCR data with external API data via Bedrock...');
    const analysis = await compareWithBedrock(ocrData, externalData);

    const resultData = {
      queried: true,
      found: true,
      ocrData,
      externalApiData: externalData,
      analysis,
    };

    console.log('[DataVerification] Result:', JSON.stringify({ overallMatch: analysis.overallMatch }));

    await notifyWebhook(webhookUrl, {
      tenant,
      service: 'data-verification',
      timestamp: new Date().toISOString(),
      geolocation,
      data: resultData,
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, data: resultData }),
    };
  } catch (error) {
    console.error(`[DataVerification] Error for ${sourceIp}:`, error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        errorCode: 'GENERIC_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
