const GRAPH_API_VERSION = 'v20.0';

export async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<void> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[WhatsApp] Failed to send message to ${to}: ${response.status} ${errorBody}`);
  } else {
    console.log(`[WhatsApp] Message sent to ${to}`);
  }
}
