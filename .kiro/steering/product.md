---
inclusion: always
---

# Product Overview: Portal de Verificación Biométrica como Servicio

## ¿Qué es este producto?
Plataforma SaaS que permite a negocios integrar flujos de verificación de identidad en sus aplicaciones mediante URL o iframe. El primer cliente es DigiCert.

## Flujo de Negocio Completo

### 1. Configuración del Canal (Setup)
El equipo de Soporte crea un nuevo channel en DynamoDB con la configuración del cliente:

```typescript
// Tabla channels (DynamoDB)
{
  channel_id: "uuid-string",           // UUID generado por Soporte
  id_client: "digi-001",               // Identificador interno del cliente
  code_client: "digicert",             // Código único del cliente
  username: "digicert_admin",          // Usuario que creó el canal
  channel_type: "liveness|ocr|compare-faces|data-verification",
  created_at: "2025-01-15T10:30:00Z",  // ISO 8601
  settings: {                          // JSON con configuración del canal
    webhookUrl: "https://api.digicert.com/webhook/verify",
    colors: { primary: "#0066CC", ... },
    headerTitle: "DigiCert Verification",
    headerLogoUrl: "/logos/digicert.png",
    footerPrivacyPolicyUrl: "https://digicert.com/privacy",
    footerWebsiteUrl: "https://digicert.com",
    expiresInMinutes: 15,
    // ... más configs según el servicio
  }
}
```

El Soporte entrega al cliente:
- `channel_id` (UUID) - identificador público del canal
- `api_key` - clave para autenticación de la API pública
- `admin_key` - clave para operaciones administrativas (uso interno, Postman)

### 2. Inicio del Circuito de Verificación

El cliente llama a la API para iniciar un circuito de verificación:

```http
POST /api/v2/biometric/start_circuit/{channel_id}
x-api-key: {api_key}
Content-Type: application/json

{
  "person": {
    "name": "Lizeth Castro",
    "documentNumber": "27.600.962",
    "email": "lcastro@danaconnect.com",
    "birthDate": "1990-01-15"
  }
}
```

**Validaciones en start_circuit:**
1. Verificar que el channel_id existe y está activo
2. Verificar que la api_key corresponde al channel
3. Generar circuit_id (UUID de un solo uso)
4. Crear registro en ts_biometric_history con status "pending"
5. Setear expires_at = now() + 15 minutos
6. Devolver link de verificación al cliente

**Respuesta de start_circuit:**

```json
{
  "circuitId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "link": "https://portal.digicert.com/verify?circuit=a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### 3. Presentación al Usuario Final

El cliente abre el link en el navegador del usuario final:
- **Iframe:** `<iframe src="https://portal.../verify?circuit=..."></iframe>`
- **Redirect:** El usuario navega directamente al link

**Validaciones en el frontend:**
1. Extraer `circuit` de los query params
2. Consultar el circuito para obtener:
   - channel_id, channel_type
   - person (para data-verification)
   - Configuración del canal (colores, header, footer, labels)
3. Si el circuito no existe, expiró, o ya fue completado → mostrar error
4. Renderizar el servicio correspondiente (liveness/ocr/compare-faces/data-verification)

### 4. Ejecución del Servicio

#### liveness
1. Usuario se posiciona frente a la cámara
2. FaceLivenessDetector de AWS ejecuta el challenge de liveness
3. Obtener confidence score de Rekognition
4. Comparar con threshold configurado en el canal

#### ocr
1. Capturar foto del frente del documento (AutoCamera)
2. Capturar foto del reverso del documento (AutoCamera)
3. Bedrock Claude Sonnet 4.5 extrae datos estructurados
4. Retornar: documentType, country, documentNumber, names, birthDate, expirationDate, gender, nationality

#### compare-faces
1. Capturar foto del documento de identidad (rectángulo guide)
2. Bedrock valida que sea un documento válido (rechaza si no lo es)
3. Ejecutar liveness check (mismo flujo que servicio liveness)
4. Rekognition CompareFaces: comparar foto del documento vs referencia del liveness
5. Retornar similitud % y resultado de match/no-match

#### data-verification
1. NO usa Rekognition ni Bedrock
2. Compara los datos de `person` (enviados en start_circuit) con los datos ya extraídos previamente
3. Útil cuando el cliente ya tiene los datos del documento y solo quiere verificarlos
4. Verifica: name, documentNumber, birthDate (exact match)

### 5. Finalización y Webhook

Al completar la verificación (éxito o fallo):

1. **Actualizar ts_biometric_history:**
   - status: "completed" | "failed"
   - completed_at: timestamp
   - result: JSON estructurado con el resultado del servicio

2. **Notificar al cliente via webhook:**
```http
POST {webhookUrl}
Content-Type: application/json

{
  "circuitId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "channelId": "channel-uuid",
  "channelType": "liveness",
  "status": "completed",
  "person": {
    "name": "Lizeth Castro",
    "documentNumber": "27.600.962",
    "email": "lcastro@danaconnect.com",
    "birthDate": "1990-01-15"
  },
  "result": {
    // Resultado específico del servicio
    "confidence": 98.5,
    "referenceImage": "base64...",
    // ...
  },
  "completedAt": "2025-01-15T10:35:00Z",
  "geolocation": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "city": "New York",
    "country": "US"
  }
}
```

## Parámetros de URL para el Frontend

```
https://portal.digicert.com/verify?circuit={circuit_id}&lang={es|en}
```

- **circuit**: UUID del circuito de verificación (obligatorio)
- **lang**: Idioma de la UI, `es` o `en` (default: `en`)

## Servicios Disponibles

| Servicio | AWS AI Service | Descripción |
|----------|----------------|-------------|
| `liveness` | Rekognition FaceLiveness | Verifica que la persona está presente en tiempo real |
| `ocr` | Bedrock Claude Sonnet 4.5 | Extrae datos estructurados del documento de identidad |
| `compare-faces` | Rekognition CompareFaces | Compara foto del documento con cara en vivo |
| `data-verification` | (Ninguno) | Compara datos de person vs datos ya extraídos |

## Características Clave

- **Channel-based**: Cada cliente tiene uno o más channels configurados
- **Circuit de un solo uso**: circuit_id expira en 15 minutos o tras completar
- **Webhook-first**: El resultado se envía al webhook del cliente, el frontend es solo para la UI
- **Multi-idioma**: Español e inglés soportados
- **Personalizable**: Colores, header, footer, labels configurables por channel
- **Standalone o iframe**: Funciona embebido o como página independiente