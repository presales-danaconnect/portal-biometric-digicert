/**
 * Mock OCR API Handler for local development
 * 
 * This simulates what the real Bedrock Lambda would do
 * Run with: npx vite preview --port 3000
 */

import type { Handler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

interface DocumentInfo {
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

export const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (event): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { frontImage, backImage } = body;

    if (!frontImage || !backImage) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing frontImage or backImage' }),
      };
    }

    // Simulate OCR processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Return mock data based on sample DNI documents
    const mockResult: DocumentInfo = {
      documentNumber: 'ABC123456789',
      country: 'Spain',
      documentType: 'ID Card',
      birthDate: '1990-05-15',
      firstName: 'JUAN CARLOS',
      lastName: 'GARCÍA LÓPEZ',
      expirationDate: '2030-05-15',
      gender: 'M',
      nationality: 'Spanish'
    };

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: {
          documentInfo: mockResult
        }
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    };
  } catch (error) {
    console.error('Mock OCR Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

/*
 * To use this mock:
 * 
 * 1. Install express: npm install express @types/express
 * 2. Create server.js:
 * 
 *    import express from 'express';
 *    import { handler } from './src/api/mock-ocr-handler.js';
 *    
 *    const app = express();
 *    app.use(express.json({ limit: '10mb' }));
 *    
 *    app.post('/api/ocr', async (req, res) => {
 *      const event = {
 *        body: JSON.stringify(req.body),
 *        headers: {},
 *        httpMethod: 'POST',
 *        path: '/api/ocr',
 *        queryStringParameters: null,
 *      };
 *      const result = await handler(event);
 *      res.status(result.statusCode).set(JSON.parse(result.headers || '{}')).send(result.body);
 *    });
 *    
 *    app.listen(3001, () => console.log('Mock OCR API running on port 3001'));
 * 
 * 3. Update .env:
 *    VITE_OCR_API_ENDPOINT=http://localhost:3001/api/ocr
 */