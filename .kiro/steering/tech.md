---
inclusion: always
---

# Stack Tecnológico y Arquitectura

## Stack Principal

### Frontend
- **Framework:** React 18 + Vite 7
- **Lenguaje:** TypeScript 5.9
- **UI Library:** @aws-amplify/ui-react
  - Componentes: Card, Flex, Heading, Text, Badge, Button, Divider, Loader, Image, Alert
  - No usar HTML/CSS raw ni Tailwind
- **Liveness:** @aws-amplify/ui-react-liveness (FaceLivenessDetector component)

### Backend
- **Infraestructura:** AWS Amplify Gen 2
- **Compute:** AWS Lambda (múltiples funciones independientes)
- **API:** API Gateway con URLs generadas por AWS (custom domain configurado en producción)
- **Base de Datos:** Amazon DynamoDB
- **Auth:** Amazon Cognito (solo guest/unauthenticated access)

## Servicios AWS Integrados

### Amazon Rekognition
- **Face Liveness:** `CreateFaceLivenessSession` y `GetFaceLivenessSessionResults`
  - Retorna confidence score y reference image en la respuesta (no S3)
  - FaceLivenessDetector comunica directamente con Rekognition via WebSocket
  - NO pasa por nuestras Lambdas para el stream de video
- **Compare Faces:** `CompareFaces`
  - Compara referencia del liveness con foto del documento

### AWS Bedrock (Claude Sonnet 4.5 Multimodal)
- **OCR Handler:** Extracción de datos estructurados de documentos
  - Extrae: documentType, country, documentNumber, names, birthDate, expirationDate, gender, nationality
  - Input: imágenes front/back del documento (base64 JPEG)
  - Output: JSON estructurado con datos del documento
- **Validación de Documentos:**
  - Bedrock clasifica si la imagen es un documento de identidad válido
  - Se ejecuta ANTES de OCR o CompareFaces para fail-fast en documentos inválidos
  - Rechaza con error específico si no es un documento válido

### Amazon DynamoDB (Tablas)

#### Tabla: channels
```
PK: channel_id (UUID)
Atributos:
- id_client: string
- code_client: string
- username: string
- channel_type: "liveness" | "ocr" | "compare-faces" | "data-verification"
- created_at: string (ISO 8601)
- settings: map (JSON con webhookUrl, colores, header, footer, thresholds, etc.)
```

#### Tabla: ts_biometric_history
```
PK: history_id (UUID)
GSI1: circuit_id (para búsqueda rápida por circuit)
Atributos:
- channel_id: string (FK a channels)
- channel_type: string
- status: "pending" | "completed" | "failed"
- person: map (name, documentNumber, email, birthDate)
- result: map (resultado del servicio)
- created_at: string
- expires_at: string (now() + 15 minutos)
- completed_at: string (nullable)
```

### Amazon Cognito
- **Identity Pool:** Unauthenticated/guest access enabled
- **Credenciales:** Otorgadas al frontend para que FaceLivenessDetector hable directamente con Rekognition
- **No hay login UI:** Todo el sistema es guest, sin autenticación de usuario

## Endpoints de API

### API Pública (protegida por x-api-key)
```
POST /api/v2/biometric/start_circuit/{channel_id}
x-api-key: {api_key_del_channel}
Content-Type: application/json

{
  "person": {
    "name": string,
    "documentNumber": string,
    "email": string,
    "birthDate": string (YYYY-MM-DD)
  }
}
```
**Respuesta:**
```json
{
  "circuitId": "uuid",
  "link": "https://.../verify?circuit=uuid"
}
```

### API Admin (protegida por x-admin-key)
- Acceso interno únicamente (Postman, no expuesta al público)
- Creación de channels, consulta de history, gestión de configuración

## CORS y Configuración de Producción

- **CORS allow-list:** Basado en variable de entorno PRODUCTION_ORIGIN
- **No hardcodeado:** Cada handler lee la variable de entorno
- **Webhook delivery:** Server-to-server desde las Lambdas (evita CORS del cliente)

## Restricciones de Seguridad

1. **Identificadores de canal:** Evitar predictibles como "company_id" en URLs
2. **API keys:**
   - `api_key`: Para start_circuit (pública)
   - `admin_key`: Para operaciones internas (solo Soporte, via Postman)
3. **Circuit ID:** De un solo uso, expira en 15 minutos
4. **Webhook:** Sin firma verificable por ahora (known gap)
5. **Webhooks:** Se entregan server-to-server, nunca desde el browser

## Rendimiento y Límites

- **AutoCamera:** Auto-captura después de segundos configurables (no shutter button manual)
- **Imágenes:** Base64 JPEG, máximo 5MB por imagen (validado en Lambda)
- **Bedrock validation:** Se ejecuta antes del OCR/CompareFaces para fail-fast en documentos inválidos

## Configuración por Channel (settings en DynamoDB)

```json
{
  "webhookUrl": "https://client.com/webhook",
  "expiresInMinutes": 15,
  "colors": {
    "primary": "#0066CC",
    "headerBackground": "#FFFFFF",
    "footerBackground": "#F5F5F5",
    "headerFontColor": "#333333",
    "footerFontColor": "#666666"
  },
  "layout": {
    "headerAlign": "left" | "center" | "right",
    "footerAlign": "left" | "center" | "right"
  },
  "headerTitle": "Client Verification",
  "headerLogoUrl": "/logos/client.png",
  "footerPrivacyPolicyUrl": "https://client.com/privacy",
  "footerWebsiteUrl": "https://client.com",
  "livenessConfidenceThreshold": 80,
  "compareFacesSimilarityThreshold": 80
}
```

## Guías de Desarrollo

1. **TypeScript:** Obligatorio en frontend y todas las Lambdas
2. **Nueva Lambda:** Requiere package.json propio, npm install local, y entrada en amplify.yml (backend.phases.build.commands)
3. **Logging:** CloudWatch con IP de origen para auditoría
4. **Tests:** No existe suite automatizada aún (known gap)

## Dependencias de Paquetes (por función)

```
ocr-handler:
- @aws-sdk/client-bedrock-runtime

liveness-handler:
- (sin AWS SDK específico, usa credenciales Cognito del frontend)

compare-faces-handler:
- @aws-sdk/client-rekognition

shared (cors, webhookNotifier):
- (utiliza fetch nativo de Node 18+)
```

## Gaps Conocidos y Roadmap

1. **Configuración de channels:** Actualmente en DynamoDB (correcto), pero podría migrarse a tabla dedicada si crece
2. **Firma de webhooks:** No implementada aún, clients reciben POST sin verificación
3. **Rate limiting:** No implementado en Lambda Function URLs (API Gateway sí lo tendría)
4. **Tests automatizados:** No existen (unit + integration)