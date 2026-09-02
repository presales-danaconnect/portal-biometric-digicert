const API_URL = import.meta.env.VITE_API_URL || 'https://oiwdmj73y7.execute-api.us-east-1.amazonaws.com/main';
const INTERNAL_KEY = import.meta.env.VITE_INTERNAL_KEY || '';

const internalHeaders = {
  'Content-Type': 'application/json',
  'x-internal-key': INTERNAL_KEY,
};

export interface CircuitConfig {
  circuitId: string;
  status: string;
  currentStep: string | null;
  stepsCompleted: string[];
  steps: string[];
  channelType: string;
  ui: {
    headerTitle: string;
    headerLogoUrl: string;
    bgColor: string;
    footerPrivacyPolicyUrl: string;
    footerWebsiteUrl: string;
    colors: {
      primary: string;
      background: string;
      headerBackground: string;
      footerBackground: string;
      headerFontColor: string;
      footerFontColor: string;
    };
    layout: {
      headerAlign: string;
      footerAlign: string;
    };
  };
  thresholds: {
    livenessConfidenceThreshold: number;
    compareFacesSimilarityThreshold: number;
    ocrConfidenceThreshold: number;
    maxAttempts: number;
    requiresBackDocument: boolean;
  };
}

export interface StepResult {
  circuitId: string;
  step: string;
  stepResult: object;
  status: string;
  stepsCompleted: string[];
  nextStep: string | null;
}

export async function getConfig(circuitId: string): Promise<CircuitConfig> {
  const res = await fetch(`${API_URL}/api/biometric/get_config/${circuitId}`, {
    headers: internalHeaders,
  });
  if (!res.ok) throw new Error(`get_config failed: ${res.status}`);
  return res.json();
}

export async function getUploadUrl(circuitId: string, type: 'front' | 'back'): Promise<{ uploadUrl: string; s3Key: string }> {
  const res = await fetch(`${API_URL}/api/biometric/upload-url/${circuitId}?type=${type}`, {
    headers: internalHeaders,
  });
  if (!res.ok) throw new Error(`upload-url failed: ${res.status}`);
  return res.json();
}

export async function uploadToS3(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': 'image/jpeg' },
  });
  if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
}

export async function processCircuit(
  circuitId: string,
  step: string,
  data?: object,
  geolocation?: string,
  wamid?: string
): Promise<StepResult> {
  const res = await fetch(`${API_URL}/api/biometric/process_circuit/${circuitId}`, {
    method: 'POST',
    headers: internalHeaders,
    body: JSON.stringify({ step, data, geolocation, wamid }),
  });
  if (!res.ok) throw new Error(`process_circuit failed: ${res.status}`);
  return res.json();
}
