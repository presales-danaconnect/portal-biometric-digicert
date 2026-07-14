/**
 * API Service for OCR
 * 
 * Calls AWS Lambda function that uses Bedrock (Claude Sonnet) for document OCR
 * 
 * After running `amplify push`, the function URL will be available in:
 * - Amplify Console > Backend environments > Function details
 * - Or run `amplify function get-ocr-handler'
 */

// For local development, use empty string (will be replaced by env var)
// In production, set this via Vite environment variable
const API_ENDPOINT = import.meta.env.VITE_OCR_API_ENDPOINT || '/api/ocr';

export interface DocumentInfo {
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

export interface OCRResponse {
  success: boolean;
  data?: {
    documentInfo: DocumentInfo;
  };
  error?: string;
}

/**
 * Call OCR API with front and back images
 * 
 * @param frontImage - Base64 encoded front image
 * @param backImage - Base64 encoded back image
 * @returns OCR result with extracted document information
 */
export async function callOCRAPI(frontImage: string, backImage: string): Promise<OCRResponse> {
  try {
    const response = await fetch(`${API_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        frontImage,
        backImage,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error('OCR API error:', error);
    throw error;
  }
}

/**
 * Example Lambda Function URL format after deployment:
 * https://xxxxx.lambda-url.us-east-1.on.aws
 * 
 * To deploy:
 * 1. Run `amplify push` or `npx amplify sandbox push`
 * 2. Get the function URL from the output or Amplify Console
 * 3. Set REACT_APP_OCR_API_ENDPOINT environment variable
 */