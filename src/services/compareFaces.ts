const API_ENDPOINT = import.meta.env.VITE_COMPARE_FACES_API_ENDPOINT || '/api/compare-faces';

export interface CompareFacesResultData {
  similarity: number;
  isMatch: boolean;
  similarityThreshold: number;
}

export interface CompareFacesResponse {
  success: boolean;
  data?: CompareFacesResultData;
  errorCode?: string;
  error?: string;
}

export interface ValidateDocumentResponse {
  success: boolean;
  data?: { isValidDocument: boolean };
  errorCode?: string;
  error?: string;
}

/**
 * Validates that a captured photo shows a real identity document with a
 * visible face, before running the full (slower) Liveness + compare flow.
 */
export async function validateDocument(documentImage: string): Promise<ValidateDocumentResponse> {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'validate',
      documentImage,
    }),
  });

  return response.json();
}

export async function compareFaces(
  sessionId: string,
  documentImage: string,
  tenant: string,
  webhookUrl?: string,
  geolocation?: string | null,
  similarityThreshold?: number
): Promise<CompareFacesResponse> {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'compare',
      sessionId,
      documentImage,
      tenant,
      webhookUrl,
      geolocation,
      similarityThreshold,
    }),
  });

  // Even non-2xx responses carry a structured { success, errorCode, error }
  // body from our Lambda, so we parse it instead of throwing on !response.ok.
  return response.json();
}
