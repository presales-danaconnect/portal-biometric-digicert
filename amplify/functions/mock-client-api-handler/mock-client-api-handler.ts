import { type Handler, type APIGatewayProxyEventV2, type APIGatewayProxyResultV2 } from 'aws-lambda';
import { MOCK_IDENTITIES, DEFAULT_MOCK_IDENTITY } from './mockIdentities';

export const handler: Handler<APIGatewayProxyEventV2, APIGatewayProxyResultV2> = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const documentNumber = event.queryStringParameters?.documentNumber;

  console.log('[MockClientAPI] Lookup requested for documentNumber:', documentNumber);

  if (!documentNumber) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing documentNumber query parameter' }),
    };
  }

  if (documentNumber === '0000') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ found: false }),
    };
  }

  const identity = MOCK_IDENTITIES[documentNumber] || DEFAULT_MOCK_IDENTITY;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      found: true,
      documentNumber,
      firstName: identity.firstName,
      lastName: identity.lastName,
      birthDate: identity.birthDate,
    }),
  };
};
