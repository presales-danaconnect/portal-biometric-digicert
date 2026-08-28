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
