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
  geolocation?: string | null
): Promise<{ success: boolean; data?: LivenessResultData; error?: string }> {
  try {
    const result = await processCircuit(
      circuitId,
      'liveness',
      { sessionId },
      geolocation || undefined
    );
    const stepSuccess = (result.stepResult as any)?.success === true;
    const confidence = (result.stepResult as any)?.confidence || 0;
    return {
      success: stepSuccess,
      data: {
        status: stepSuccess ? 'SUCCEEDED' : 'FAILED',
        confidence,
        referenceImage: null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}