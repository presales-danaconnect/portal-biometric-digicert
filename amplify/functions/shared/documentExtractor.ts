import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { OCR_PROMPT, OCR_PROMPT_FRONT_ONLY } from '../ocr-handler/ocrPrompt';

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const BEDROCK_MODEL_ID = 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';

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

export interface Base64Data {
  data: string;
  mediaType: string;
}

export interface ExtractionResult {
  isValidDocument: boolean;
  documentInfo: DocumentInfo | null;
}

export function parseDataURI(dataURI: string): Base64Data {
  const match = dataURI.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (match) {
    return { mediaType: match[1], data: match[2] };
  }
  return { mediaType: 'image/jpeg', data: dataURI };
}

/**
 * Shared document extraction logic, used by ocr-handler and
 * data-verification-handler. Validates that the image(s) show a real
 * identity document, and if so, extracts structured fields via Bedrock.
 *
 * backImage is optional: some documents (passports, some national IDs)
 * only have data on the front side. When backImage is omitted, a
 * different prompt variant is used that doesn't ask Bedrock to validate
 * or read a back side that was never captured.
 */
export async function extractDocumentInfo(frontImage: string, backImage?: string): Promise<ExtractionResult> {
  const frontData = parseDataURI(frontImage);
  const backData = backImage ? parseDataURI(backImage) : null;

  const prompt = backData ? OCR_PROMPT : OCR_PROMPT_FRONT_ONLY;

  console.log('[DocumentExtractor] Calling Bedrock with model:', BEDROCK_MODEL_ID, 'hasBackImage:', !!backData);

  const imageContent = [
    { type: 'image', source: { type: 'base64', media_type: frontData.mediaType, data: frontData.data } },
  ];
  if (backData) {
    imageContent.push({ type: 'image', source: { type: 'base64', media_type: backData.mediaType, data: backData.data } });
  }

  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            ...imageContent,
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  });

  console.log('[DocumentExtractor] Sending request to Bedrock...');
  const response = await client.send(command);
  console.log('[DocumentExtractor] Received response from Bedrock');

  const responseBody = new TextDecoder().decode(response.body);
  const parsedResponse = JSON.parse(responseBody);

  let extractedText = '';
  if (parsedResponse.content && Array.isArray(parsedResponse.content)) {
    extractedText = parsedResponse.content.map((block: any) =>
      block.type === 'text' ? block.text : ''
    ).join('\n');
  } else {
    extractedText = parsedResponse.completion || parsedResponse.text || JSON.stringify(parsedResponse);
  }

  console.log('[DocumentExtractor] Extracted text:', extractedText.substring(0, 200) + '...');

  return parseDocumentInfo(extractedText);
}

function parseDocumentInfo(text: string): ExtractionResult {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  const jsonText = jsonMatch ? jsonMatch[1] : text;

  try {
    const parsed = JSON.parse(jsonText.trim());

    if (parsed.isValidDocument === false) {
      return { isValidDocument: false, documentInfo: null };
    }

    return {
      isValidDocument: true,
      documentInfo: {
        documentNumber: parsed.documentNumber || '',
        country: parsed.country || '',
        documentType: parsed.documentType || '',
        birthDate: parsed.birthDate || '',
        firstName: parsed.firstName || '',
        lastName: parsed.lastName || '',
        expirationDate: parsed.expirationDate || '',
        gender: parsed.gender,
        nationality: parsed.nationality,
      },
    };
  } catch {
    // If Claude's response can't be parsed at all, treat it conservatively
    // as "not a valid document" rather than returning empty-but-successful data.
    return { isValidDocument: false, documentInfo: null };
  }
}
