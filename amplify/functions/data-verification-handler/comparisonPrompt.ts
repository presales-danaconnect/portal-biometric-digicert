export const DATA_COMPARISON_PROMPT = `You are comparing two sets of identity data for the same person: one extracted via OCR from a physical document, and one retrieved from an external system of record.

Your job is to determine whether they describe the same person, tolerating normal, harmless formatting differences such as:
- Different capitalization (JUAN vs Juan)
- Accents present in one but not the other
- Name order variations (first/last name swapped)
- Minor whitespace differences
- Date format differences that represent the same date

Treat as a genuine mismatch:
- Different document numbers
- Substantially different names (not just formatting)
- Different birth dates (not just format)

For each field present in both datasets, decide if it matches. Then give an overall verdict.

Respond with ONLY this exact JSON shape, no extra text:
{
  "overallMatch": true or false,
  "confidence": "high" or "medium" or "low",
  "fields": {
    "firstName": { "match": true or false, "note": "short reason" },
    "lastName": { "match": true or false, "note": "short reason" },
    "documentNumber": { "match": true or false, "note": "short reason" },
    "birthDate": { "match": true or false, "note": "short reason" }
  },
  "summary": "one short sentence describing the overall result"
}`;
