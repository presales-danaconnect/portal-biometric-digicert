import { sendWhatsAppMessage } from '../shared/whatsapp';

// Simulated balance shown after a successful data-verification match.
// This is a demo-only placeholder — a real integration would look this
// up from the tenant's own account system.
const SIMULATED_BALANCE = '$1,500.00';

interface DataVerificationResultData {
  found: boolean;
  analysis: {
    overallMatch: boolean;
  } | null;
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
  if (service === 'data-verification') {
    const result = data as DataVerificationResultData;

    if (!result.found) {
      return 'No pudimos encontrar tu registro. Por favor intenta de nuevo o contacta a soporte.';
    }

    if (result.analysis?.overallMatch) {
      return `✅ Verificación exitosa. Tu saldo actual es: ${SIMULATED_BALANCE}`;
    }

    return '⚠️ No pudimos verificar tu identidad con los datos proporcionados. Por favor contacta a soporte.';
  }

  // Generic fallback for other services used through WhatsApp in the future
  return 'Tu verificación ha finalizado. Gracias por completarla.';
}
