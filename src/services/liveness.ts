import outputs from '../../amplify_outputs.json';
import { processCircuit } from './biometricApi';

const LIVENESS_API_URL = (outputs as any).custom?.livenessApiUrl 
  || import.meta.env.VITE_LIVENESS_API_URL 
  || '';

export interface LivenessResultData {
  status: string;
  confidence: number;
  referenceImage: string | null;
}

export async function createLivenessSession(): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  try {
    const response = await fetch(LIVENESS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create' }),
    });
    if (!response.ok) throw new Error(`API error (${response.status})`);
    return response.json();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function submitLivenessResult(
  circuitId: string,
  sessionId: string,
  geolocation?: string | null,
  wamid?: string
): Promise<{ success: boolean; errorCode?: string; data?: LivenessResultData; error?: string }> {
  try {
    const result = await processCircuit(
      circuitId,
      'liveness',
      { sessionId },
      geolocation || undefined,
      wamid
    );
    const stepSuccess = (result.stepResult as any)?.success === true;
    const confidence = (result.stepResult as any)?.confidence || 0;
    const errorCode = (result.stepResult as any)?.errorCode;
    return {
      success: stepSuccess,
      errorCode,
      data: {
        status: stepSuccess ? 'SUCCEEDED' : 'FAILED',
        confidence,
        referenceImage: null,
      },
    };
  } catch (err) {
    const response = (err as any)?.response;
    return {
      success: false,
      errorCode: response?.stepResult?.errorCode,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}