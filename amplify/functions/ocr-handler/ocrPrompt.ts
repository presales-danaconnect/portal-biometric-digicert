function buildPrompt(hasBackImage: boolean): string {
  const imageDescription = hasBackImage
    ? 'I have two images that are supposed to be the front and back of an identity document.'
    : 'I have one image that is supposed to be the front of an identity document (some documents like passports or certain national IDs only have one side with data).';

  const validationInstruction = hasBackImage
    ? 'First, determine whether BOTH images actually show a valid government-issued identity document (national ID card, passport, driver\'s license, residency card, etc.). Random objects, books, photos of people without a document, screens, or any unrelated image do NOT count as a valid identity document.\n\nIf EITHER image does not show a valid identity document, respond with ONLY this exact JSON and nothing else:'
    : 'First, determine whether the image actually shows a valid government-issued identity document (national ID card, passport, driver\'s license, residency card, etc.). Random objects, books, photos of people without a document, screens, or any unrelated image do NOT count as a valid identity document.\n\nIf the image does not show a valid identity document, respond with ONLY this exact JSON and nothing else:';

  const extractionIntro = hasBackImage
    ? 'STEP 2 — EXTRACT INFORMATION (only if both images show a valid document):\nIf both images show a valid identity document, extract the following information and return it as a JSON object:'
    : 'STEP 2 — EXTRACT INFORMATION (only if the image shows a valid document):\nIf the image shows a valid identity document, extract the following information and return it as a JSON object:';

  return `You are an OCR system specialized in extracting information from Latin American identity documents (Colombian cédulas, Venezuelan cédulas, passports, etc.).
${imageDescription}

STEP 1 — VALIDATE THE DOCUMENT:
${validationInstruction}
{"isValidDocument": false}

${extractionIntro}
- isValidDocument: true
- documentNumber: The identification document number
- country: The issuing country
- documentType: Type of document (Cédula de Ciudadanía, Cédula de Identidad, Passport, ID Card, Driver's License, etc.)
- birthDate: Date of birth in YYYY-MM-DD format (must be a plausible past date for a living adult)
- firstName: Given name(s)
- lastName: Family name(s)
- expirationDate: Document expiration date in YYYY-MM-DD format
- gender: Gender/M (optional)
- nationality: Nationality (optional)
- confidence: A number from 0 to 100 representing how confident you are in the accuracy and completeness of the extracted fields. Consider image sharpness, lighting, glare, and whether any field was hard to read or ambiguous. Use 90-100 only when the document was clearly legible with no doubts; use lower values when any field was blurry, partially obscured, or you had to guess

IMPORTANT INSTRUCTIONS FOR DATES:
- These documents typically show dates in DD-MM-YYYY or "DD MES YYYY" format (e.g., "26 SEP 1990")
- Convert all dates to YYYY-MM-DD format
- Birth date (fecha de nacimiento) is ALWAYS in the past and typically corresponds to an adult's age (18-100 years old from today)
- Expiration date (fecha de vencimiento / vigencia hasta) is typically in the future or recent past
- Double-check: if your extracted birthDate would make the person impossibly young or from the future, re-read the document more carefully — you likely confused it with another date field
- Do not confuse "fecha de expedición" (issue date) with "fecha de nacimiento" (birth date) — these are different fields, often both present on the same document
- If a field isn't visible on the available image(s), leave it as an empty string rather than guessing, and lower your confidence score accordingly

Return ONLY a valid JSON object without any additional text or markdown formatting.

Example response when a valid document is found:
{
  "isValidDocument": true,
  "documentNumber": "AB1234567",
  "country": "Colombia",
  "documentType": "Cédula de Ciudadanía",
  "birthDate": "1990-05-15",
  "firstName": "JUAN CARLOS",
  "lastName": "GARCÍA LÓPEZ",
  "expirationDate": "2030-05-15",
  "gender": "M",
  "nationality": "Colombian",
  "confidence": 95
}

Example response when NOT a valid document:
{"isValidDocument": false}`;
}

export const OCR_PROMPT = buildPrompt(true);
export const OCR_PROMPT_FRONT_ONLY = buildPrompt(false);
