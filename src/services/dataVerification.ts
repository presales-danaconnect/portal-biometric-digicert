/**
 * Data Verification Service
 *
 * Talks to the Lambda that extracts document data via OCR, queries the
 * tenant's external identity API using a trusted document reference
 * (docRef), and compares both datasets using Bedrock.
 */

const API_ENDPOINT = import.meta.env.VITE_DATA_VERIFICATION_API_ENDPOINT || '/api/data-verification';

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

export interface ExternalApiData {
  found: boolean;
  firstName?: string;
  lastName?: string;
  documentNumber?: string;
  birthDate?: string;
}

export interface FieldComparison {
  match: boolean;
  note: string;
}

export interface ComparisonAnalysis {
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

export interface DataVerificationResultData {
  queried: boolean;
  found: boolean;
  ocrData: DocumentInfo;
  externalApiData: ExternalApiData | null;
  analysis: ComparisonAnalysis | null;
}

export interface DataVerificationResponse {
  success: boolean;
  data?: DataVerificationResultData;
  errorCode?: string;
  error?: string;
}

export async function verifyData(
  frontImage: string,
  backImage: string | undefined,
  docRef: string,
  tenant: string,
  webhookUrl: string | undefined,
  geolocation: string | null | undefined,
  dataVerificationApiUrl: string
): Promise<DataVerificationResponse> {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      frontImage,
      backImage,
      docRef,
      tenant,
      webhookUrl,
      geolocation,
      dataVerificationApiUrl,
    }),
  });

  return response.json();
}
