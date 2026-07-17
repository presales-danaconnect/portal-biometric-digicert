export type ServiceType = 'ocr' | 'liveness' | 'compare-faces' | 'data-verification';

export interface WebhookPayload {
  tenant: string;
  service: ServiceType;
  timestamp: string;
  geolocation: string | null;
  reference: string | null;
  data: unknown;
}

/**
 * Sends the verification result to the client's webhook.
 * Server-to-server call — no CORS restrictions apply here,
 * unlike calling directly from the browser.
 *
 * Best effort: failures are logged but never thrown, so a
 * misconfigured or unreachable client webhook never breaks
 * the verification flow itself.
 */
export async function notifyWebhook(
  webhookUrl: string | undefined,
  payload: WebhookPayload
): Promise<void> {
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log(`[Webhook] Notified ${webhookUrl} - status ${response.status}`);
  } catch (error) {
    console.error(`[Webhook] Failed to notify ${webhookUrl}:`, error);
  }
}
