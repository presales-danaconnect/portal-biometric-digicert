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
  confidence: number;
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
 * @param reference - Optional correlation id (e.g. WhatsApp phone number), forwarded to the webhook payload
 * @returns OCR result with extracted document information
 */
export async function callOCRAPI(
  frontImage: string,
  backImage: string | undefined,
  tenant: string,
  webhookUrl?: string,
  geolocation?: string | null,
  reference?: string | null
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
      reference,
    }),
  });

  return response.json();
}
