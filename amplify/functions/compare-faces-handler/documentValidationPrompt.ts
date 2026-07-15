export const DOCUMENT_VALIDATION_PROMPT = `You are validating whether an image shows a valid government-issued identity document (national ID card, passport, driver's license, residency card, etc.) that includes a visible photo of a person's face.

Random objects, books, screens, photos without a document, or documents without a visible face photo do NOT count as valid.

Respond with ONLY one of these two exact JSON objects and nothing else:
{"isValidDocument": true}
{"isValidDocument": false}`;
