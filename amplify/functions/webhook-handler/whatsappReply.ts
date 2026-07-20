import { sendWhatsAppMessage } from '../shared/whatsapp';

// Simulated balance shown after a successful data-verification match.
// This is a demo-only placeholder — a real integration would look this
// up from the tenant's own account system.
const SIMULATED_BALANCE = '$1,500.00';

// Fallback confidence threshold used only for the WhatsApp reply message,
// since the webhook doesn't have access to the tenant's configured
// threshold (that lives in tenants.json, frontend-only today).
const LIVENESS_REPLY_THRESHOLD = 80;

interface DataVerificationResultData {
  found: boolean;
  analysis: {
    overallMatch: boolean;
  } | null;
}

interface LivenessResultData {
  status?: string;
  confidence?: number;
}

interface CompareFacesResultData {
  similarity: number;
  isMatch: boolean;
}

interface DocumentInfo {
  firstName?: string;
  lastName?: string;
}

interface ErrorData {
  success: false;
  errorCode?: string;
  error?: string;
}

function isErrorData(data: unknown): data is ErrorData {
  return typeof data === 'object' && data !== null && (data as ErrorData).success === false;
}

/**
 * Builds and sends the WhatsApp reply for a completed verification,
 * based on the service type and its result. Only called when the
 * webhook payload carries a non-null `reference` (the user's phone
 * number), meaning this notification originated from the WhatsApp
 * inbound flow.
 */
export async function sendWhatsAppReply(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  service: string,
  data: unknown
): Promise<void> {
  const message = buildReplyMessage(service, data);
  await sendWhatsAppMessage(phoneNumberId, accessToken, to, message);
}

function buildReplyMessage(service: string, data: unknown): string {
  if (isErrorData(data)) {
    return '⚠️ No pudimos completar tu verificación. Por favor intenta de nuevo o contacta a soporte.';
  }

  switch (service) {
    case 'data-verification': {
      const result = data as DataVerificationResultData;

      if (!result.found) {
        return 'No pudimos encontrar tu registro. Por favor intenta de nuevo o contacta a soporte.';
      }

      if (result.analysis?.overallMatch) {
        return `✅ Verificación exitosa. Tu saldo actual es: ${SIMULATED_BALANCE}\n\nEscribe "hola" si necesitas algo más.`;
      }

      return '⚠️ No pudimos verificar tu identidad con los datos proporcionados. Por favor contacta a soporte.';
    }

    case 'liveness': {
      const result = data as LivenessResultData;
      const isLive = result.status === 'SUCCEEDED' && (result.confidence ?? 0) >= LIVENESS_REPLY_THRESHOLD;

      if (isLive) {
        return `✅ Verificación de identidad exitosa (confianza: ${result.confidence?.toFixed(1)}%). Tu pago ha sido procesado correctamente.\n\nEscribe "hola" si necesitas algo más.`;
      }

      return `⚠️ No pudimos confirmar tu identidad (confianza: ${result.confidence?.toFixed(1) ?? '0'}%). Por seguridad, no procesamos tu pago. Intenta de nuevo o contacta a soporte.`;
    }

    case 'compare-faces': {
      const result = data as CompareFacesResultData;

      if (result.isMatch) {
        return `✅ Rostro verificado correctamente (similitud: ${result.similarity.toFixed(1)}%). Tu identidad ha sido confirmada.\n\nEscribe "hola" si necesitas algo más.`;
      }

      return `⚠️ El rostro no coincide con el documento (similitud: ${result.similarity.toFixed(1)}%). Por favor intenta de nuevo o contacta a soporte.`;
    }

    case 'ocr': {
      const result = data as DocumentInfo;
      const name = [result.firstName, result.lastName].filter(Boolean).join(' ');

      return `✅ Documento verificado correctamente${name ? ` para ${name}` : ''}.\n\nEscribe "hola" si necesitas algo más.`;
    }

    default:
      return 'Tu verificación ha finalizado. Gracias por completarla.\n\nEscribe "hola" si necesitas algo más.';
  }
}
