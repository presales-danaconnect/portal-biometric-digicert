/**
 * Liveness Service
 * 
 * Talks to the Lambda that creates and resolves Face Liveness
 * sessions via Amazon Rekognition.
 */

const API_ENDPOINT = import.meta.env.VITE_LIVENESS_API_ENDPOINT || '/api/liveness';

export interface LivenessResultData {
  status: string;
  confidence: number;
  referenceImage: string | null;
}

export interface CreateSessionResponse {
  success: boolean;
  sessionId?: string;
  error?: string;
}

export interface GetResultsResponse {
  success: boolean;
  data?: LivenessResultData;
  error?: string;
}

export async function createLivenessSession(): Promise<CreateSessionResponse> {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create' }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
    return response.json();
  } catch (error) {
    console.error('Liveness create session error:', error);
    throw error;
  }
}

export async function getLivenessResults(
  sessionId: string,
  tenant: string,
  webhookUrl?: string,
  geolocation?: string | null,
  reference?: string | null
): Promise<GetResultsResponse> {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'results',
        sessionId,
        tenant,
        webhookUrl,
        geolocation,
        reference,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
    return response.json();
  } catch (error) {
    console.error('Liveness get results error:', error);
    throw error;
  }
}
