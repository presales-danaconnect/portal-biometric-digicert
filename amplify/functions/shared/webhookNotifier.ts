import { createHmac } from 'crypto';

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
 * Computes an HMAC-SHA256 signature of the payload using a shared secret
 * (WEBHOOK_SIGNING_SECRET env var), so the receiving tenant can verify
 * the notification genuinely came from this system and wasn't spoofed
 * or tampered with in transit.
 *
 * This is a single global secret shared across all tenants (not one
 * secret per tenant) — a deliberate tradeoff for the current
 * committed-JSON tenant config model, where nothing tenant-specific can
 * be kept secret from the browser. See docs for the future per-tenant
 * secret plan once tenant config moves to a database.
 */
function signPayload(payload: string): string | null {
  const secret = process.env.WEBHOOK_SIGNING_SECRET;
  if (!secret) return null;
  return createHmac('sha256', secret).update(payload).digest('hex');
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

  const body = JSON.stringify(payload);
  const signature = signPayload(body);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (signature) {
    headers['X-Webhook-Signature'] = signature;
  } else {
    console.warn('[Webhook] WEBHOOK_SIGNING_SECRET not set — sending unsigned request');
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body,
    });
    console.log(`[Webhook] Notified ${webhookUrl} - status ${response.status}`);
  } catch (error) {
    console.error(`[Webhook] Failed to notify ${webhookUrl}:`, error);
  }
}
