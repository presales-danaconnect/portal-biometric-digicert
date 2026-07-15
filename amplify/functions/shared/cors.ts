/**
 * Shared CORS configuration for all Lambda Function URLs.
 *
 * The production domain comes from the PRODUCTION_ORIGIN environment
 * variable (set per-function in backend.ts) so it can change without
 * editing code in every handler — just update the env var and redeploy.
 */

const LOCAL_ORIGIN = 'http://localhost:5173';

export function getAllowedOrigins(): string[] {
  const productionOrigin = process.env.PRODUCTION_ORIGIN;
  return productionOrigin ? [LOCAL_ORIGIN, productionOrigin] : [LOCAL_ORIGIN];
}

export function getCorsHeaders(origin: string): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();
  const isAllowedOrigin = allowedOrigins.includes(origin) || allowedOrigins.includes('*');
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  };
}
