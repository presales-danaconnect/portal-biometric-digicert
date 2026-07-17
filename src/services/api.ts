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
  errorCode?: string;
  error?: string;
}

/**
 * Call OCR API with front and back images
 * 
 * @param frontImage - Base64 encoded front image
 * @param backImage - Base64 encoded back image
 * @param tenant - Tenant identifier, forwarded to the webhook payload
 * @param webhookUrl - Client webhook URL; the Lambda notifies it server-to-server
 * @param geolocation - Captured browser geolocation, forwarded to the webhook payload
 * @returns OCR result with extracted document information
 */
export async function callOCRAPI(
  frontImage: string,
  backImage: string | undefined,
  tenant: string,
  webhookUrl?: string,
  geolocation?: string | null
): Promise<OCRResponse> {
  const response = await fetch(`${API_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      frontImage,
      backImage,
      tenant,
      webhookUrl,
      geolocation,
    }),
  });

  // Even non-2xx responses (400, 422, 500...) carry a structured
  // { success, errorCode, error } body from our Lambda, so we parse it
  // instead of throwing on !response.ok. This lets the caller distinguish
  // between specific error codes (e.g. NOT_A_DOCUMENT) instead of only
  // seeing a generic thrown error.
  return response.json();
}
