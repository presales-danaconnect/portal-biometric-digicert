import { type Handler, type APIGatewayProxyEventV2, type APIGatewayProxyResultV2 } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Configuration constants
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB per image
const ALLOWED_ORIGINS = [
  'http://localhost:5173', // Local development
  'https://main.d21x455s6ork0e.amplifyapp.com', // Production
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

/**
 * Get CORS headers based on request origin
 */
function getCorsHeaders(origin: string): Record<string, string> {
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*');
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  };
}

/**
 * Extract base64 data and media type from a data URI
 * @param dataURI - Data URI in format "data:image/xxx;base64,..."
 * @returns Object with cleaned base64 data and detected media type
 */
function parseDataURI(dataURI: string): Base64Data {
  const match = dataURI.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (match) {
    return {
      mediaType: match[1],
      data: match[2]
    };
  }
  // Default if no data URI format
  return {
    mediaType: 'image/jpeg',
    data: dataURI
  };
}

/**
 * ============================================================
 * FUTURE TOKEN VALIDATION HOOK
 * ============================================================
 * Add token/API key validation here when ready to implement auth.
 * Currently returns true (no validation) to maintain current behavior.
 * 
 * Example implementation:
 * 
 * async function validateRequestToken(event: APIGatewayProxyEvent): Promise<{valid: boolean, error?: string}> {
 *   const token = event.headers['x-api-key'] || event.headers['Authorization'];
 *   if (!token) {
 *     return { valid: false, error: 'Missing API key' };
 *   }
 *   // Validate token against your database/cache
 *   const isValid = await checkTokenInDatabase(token);
 *   if (!isValid) {
 *     return { valid: false, error: 'Invalid API key' };
 *   }
 *   return { valid: true };
 * }
 */
async function validateRequestToken(_event: APIGatewayProxyEventV2): Promise<{ valid: boolean; error?: string }> {
  // TODO: Implement token validation when ready
  // For now, always allow (no authentication)
  return { valid: true };
}

export const handler: Handler<APIGatewayProxyEventV2, APIGatewayProxyResultV2> = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const origin = event.headers.origin || event.headers.Origin || '';
  const corsHeaders = getCorsHeaders(origin);
  const timestamp = new Date().toISOString();
  const sourceIp = event.requestContext?.http?.sourceIp || 'unknown';

  // Log invocation for CloudWatch audit
  console.log(JSON.stringify({
    timestamp,
    sourceIp,
    path: event.rawPath,
    method: event.requestContext?.http?.method,
    userAgent: event.headers['User-Agent'] || 'unknown',
  }));

  // Handle CORS preflight
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Validate request token (placeholder for future auth)
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
    
    // Frontend sends application/json with base64 images
    if (contentType.includes('application/json')) {
      const parsed = JSON.parse(body || '{}');
      frontImage = parsed.frontImage;
      backImage = parsed.backImage;
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
    
    // Validate payload size (5MB max per image)
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
    
    // Call Bedrock with Claude Sonnet
    const result = await extractDocumentInfo(frontImage, backImage);
    
    console.log(`[OCR] Success for ${sourceIp}:`, JSON.stringify(result));
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: {
          documentInfo: result
        }
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
  // Parse data URIs to extract base64 data and media types
  const frontData = parseDataURI(frontImage);
  const backData = parseDataURI(backImage);
  
  const prompt = `You are an OCR system specialized in extracting information from Latin American identity documents (Colombian cédulas, Venezuelan cédulas, passports, etc.).
I have two images of an identity document:
1. Front side
2. Back side

IMPORTANT INSTRUCTIONS FOR DATES:
- These documents typically show dates in DD-MM-YYYY or "DD MES YYYY" format (e.g., "26 SEP 1990")
- Convert all dates to YYYY-MM-DD format
- Birth date (fecha de nacimiento) is ALWAYS in the past and typically corresponds to an adult's age (18-100 years old from today)
- Expiration date (fecha de vencimiento / vigencia hasta) is typically in the future or recent past
- Double-check: if your extracted birthDate would make the person impossibly young or from the future, re-read the document more carefully — you likely confused it with another date field
- Do not confuse "fecha de expedición" (issue date) with "fecha de nacimiento" (birth date) — these are different fields, often both present on the same document

Your task is to extract the following information and return it as a JSON object:
- documentNumber: The identification document number
- country: The issuing country
- documentType: Type of document (Cédula de Ciudadanía, Cédula de Identidad, Passport, ID Card, Driver's License, etc.)
- birthDate: Date of birth in YYYY-MM-DD format (must be a plausible past date for a living adult)
- firstName: Given name(s)
- lastName: Family name(s)
- expirationDate: Document expiration date in YYYY-MM-DD format
- gender: Gender/M (optional)
- nationality: Nationality (optional)

Before returning the JSON, mentally verify: does the birthDate make sense as a real birth date (not in the future, not absurdly recent)? Does the expirationDate make sense as a document validity date?

Please analyze both images carefully and extract all available information.
Return ONLY a valid JSON object without any additional text or markdown formatting.

Example response format:
{
  "documentNumber": "AB1234567",
  "country": "Colombia",
  "documentType": "Cédula de Ciudadanía",
  "birthDate": "1990-05-15",
  "firstName": "JUAN CARLOS",
  "lastName": "GARCÍA LÓPEZ",
  "expirationDate": "2030-05-15",
  "gender": "M",
  "nationality": "Colombian"
}`;

  // Model ID - using inference profile format for cross-region access
  // Note: Verify this model is available in your AWS account/region
  // Alternative formats: 'anthropic.claude-sonnet-4-20250506' or 'us.anthropic.claude-sonnet-4-20250506'
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
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: frontData.mediaType,
                data: frontData.data
              }
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: backData.mediaType,
                data: backData.data
              }
            },
            {
              type: 'text',
              text: prompt
            }
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
  
  // Extract the text content from Claude's response
  let extractedText = '';
  if (parsedResponse.content && Array.isArray(parsedResponse.content)) {
    extractedText = parsedResponse.content.map((block: any) => 
      block.type === 'text' ? block.text : ''
    ).join('\n');
  } else {
    extractedText = parsedResponse.completion || parsedResponse.text || JSON.stringify(parsedResponse);
  }

  console.log('[OCR] Extracted text:', extractedText.substring(0, 200) + '...');

  // Parse JSON from Claude's response
  return parseDocumentInfo(extractedText);
}

function parseDocumentInfo(text: string): DocumentInfo {
  // Try to extract JSON from the response
  // Claude might wrap JSON in markdown code blocks
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
    // If JSON parsing fails, return empty object
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