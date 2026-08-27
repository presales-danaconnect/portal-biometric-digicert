---
inclusion: always
---

# Estructura del Proyecto y Arquitectura

## Organización de Carpetas

```
portal-biometric-digicert/
├── amplify/                              # AWS Amplify Gen 2 backend
│   ├── auth/
│   │   └── resource.ts                   # Cognito Identity Pool (guest access)
│   ├── backend.ts                        # Main backend: funciones, URLs, IAM
│   └── functions/
│       ├── shared/                       # Código compartido entre Lambdas
│       │   ├── cors.ts                   # getCorsHeaders(), lee PRODUCTION_ORIGIN
│       │   └── webhookNotifier.ts        # notifyWebhook() - POST al webhook del channel
│       ├── start_circuit/                # Crea circuito de verificación
│       │   ├── resource.ts
│       │   ├── handler.ts
│       │   ├── start_circuit.ts          # Lógica principal
│       │   └── package.json
│       ├── ocr-handler/                  # Bedrock OCR + validación
│       │   ├── resource.ts
│       │   ├── handler.ts
│       │   ├── ocr-handler.ts
│       │   ├── ocrPrompt.ts
│       │   └── package.json
│       ├── liveness-handler/             # Rekognition Face Liveness
│       │   ├── resource.ts
│       │   ├── handler.ts
│       │   ├── liveness-handler.ts
│       │   └── package.json
│       ├── compare-faces-handler/        # Rekognition CompareFaces
│       │   ├── resource.ts
│       │   ├── handler.ts
│       │   ├── compare-faces-handler.ts
│       │   ├── documentValidationPrompt.ts
│       │   └── package.json
│       ├── data-verification-handler/    # Comparación de datos sin AI externa
│       │   ├── resource.ts
│       │   ├── handler.ts
│       │   ├── data-verification-handler.ts
│       │   └── package.json
│       └── webhook-dispatcher/            # Reintentos y routing de webhooks
│           ├── resource.ts
│           ├── handler.ts
│           ├── webhook-dispatcher.ts
│           └── package.json
├── src/                                  # Frontend React
│   ├── App.tsx                           # Lee ?circuit, ?lang; routing a servicios
│   ├── main.tsx                          # Amplify.configure() + React root
│   ├── config/
│   │   └── tenants.ts                    # getTenantConfig() - fallback a default
│   ├── services/
│   │   ├── api.ts                        # callStartCircuit(), getCircuit()
│   │   ├── ocr.ts                        # callOCRAPI()
│   │   ├── liveness.ts                   # createSession(), getResults()
│   │   ├── compareFaces.ts               # validateDocument(), compareFaces()
│   │   └── dataVerification.ts           # verifyData()
│   ├── hooks/
│   │   └── useGeolocation.ts             # Captura geolocation una vez
│   ├── i18n/
│   │   ├── en.json, es.json              # Traducciones UI
│   │   ├── i18n.ts                       # useTranslation(), resolve lang
│   │   └── livenessDictionary.ts         # FaceLivenessDetector strings
│   └── styles/
│       └── global.css                    # Estilos globales (mínimos)
├── docs/
│   └── rate-limiting.md                  # Notas sobre rate limiting
├── amplify.yml                           # CI/CD - cada Lambda necesita su línea
├── .env                                  # Local: VITE_*_ENDPOINTS (gitignored)
└── package.json                          # Frontend deps (npm install frontend)
```

## Parámetros de URL

### Estructura de URL para Verificación

```
https://portal.digicert.com/verify?circuit={circuit_id}&lang={es|en}
```

### Procesamiento en App.tsx (sin router library)

```typescript
// Extraer parámetros
const params = new URLSearchParams(window.location.search);
const circuitId = params.get('circuit');      // Obligatorio
const lang = params.get('lang') || 'en';      // Default: 'en'

// Consultar circuito
const circuit = await getCircuit(circuitId);
// Validar: existe, no expirado, no completado

// Renderizar servicio según circuit.channel_type
switch (circuit.channel_type) {
  case 'liveness':      render <LivenessCheck />;
  case 'ocr':           render <OCRVerification />;
  case 'compare-faces': render <CompareFacesVerification />;
  case 'data-verification': render <DataVerification />;
  default:              showError('Canal desconocido');
}
```

## Tablas DynamoDB

### Tabla: channels (configuración de canales)

```json
{
  "channel_id": "550e8400-e29b-41d4-a716-446655440000",
  "id_client": "digicert-001",
  "code_client": "digicert",
  "username": "admin_soporte",
  "channel_type": "liveness",
  "created_at": "2025-01-15T10:30:00Z",
  "settings": {
    "webhookUrl": "https://api.digicert.com/webhook/biometric",
    "expiresInMinutes": 15,
    "colors": {
      "primary": "#0066CC",
      "headerBackground": "#FFFFFF",
      "footerBackground": "#F5F5F5",
      "headerFontColor": "#333333",
      "footerFontColor": "#666666"
    },
    "layout": {
      "headerAlign": "left",
      "footerAlign": "right"
    },
    "headerTitle": "DigiCert Identity Verification",
    "headerLogoUrl": "/logos/digicert.png",
    "footerPrivacyPolicyUrl": "https://digicert.com/privacy",
    "footerWebsiteUrl": "https://digicert.com",
    "livenessConfidenceThreshold": 80,
    "compareFacesSimilarityThreshold": 85
  }
}
```

### Tabla: ts_biometric_history (historial de verificaciones)

```json
{
  "history_id": "550e8400-e29b-41d4-a716-446655440001",
  "circuit_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "channel_id": "550e8400-e29b-41d4-a716-446655440000",
  "channel_type": "liveness",
  "status": "completed",
  "person": {
    "name": "Lizeth Castro",
    "documentNumber": "27.600.962",
    "email": "lcastro@danaconnect.com",
    "birthDate": "1990-01-15"
  },
  "result": {
    "confidence": 98.5,
    "referenceImage": "base64...",
    "passed": true
  },
  "created_at": "2025-01-15T10:30:00Z",
  "expires_at": "2025-01-15T10:45:00Z",
  "completed_at": "2025-01-15T10:35:00Z",
  "geolocation": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "city": "New York",
    "country": "US"
  }
}
```

**GSI para búsqueda por circuit_id:**
```
GSI1: PK = circuit_id, SK = created_at
```

## Endpoints de API Gateway

### API Pública (x-api-key por canal)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v2/biometric/start_circuit/{channel_id}` | Inicia circuito de verificación |
| GET | `/api/v2/biometric/circuit/{circuit_id}` | Consulta estado del circuito |

### API Admin (x-admin-key, solo Soporte)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v2/admin/channel` | Crear nuevo channel |
| GET | `/api/v2/admin/channel/{channel_id}` | Obtener configuración |
| PUT | `/api/v2/admin/channel/{channel_id}` | Actualizar configuración |
| GET | `/api/v2/admin/history` | Consultar historial de verificaciones |
| GET | `/api/v2/admin/history/{circuit_id}` | Detalle de circuito específico |

## Flujo de Request al Backend

### Flujo start_circuit
1. Cliente llama POST `/api/v2/biometric/start_circuit/{channel_id}` con x-api-key
2. API Gateway valida API key y ruta
3. Lambda start_circuit:
   - Consulta DynamoDB channels (verifica channel_id + api_key)
   - Genera circuit_id (UUID)
   - Crea registro en ts_biometric_history con status "pending"
   - Set expires_at = now() + 15 minutos
   - Retorna { circuitId, link }
4. Cliente recibe link y lo presenta al usuario final

### Flujo de Verificación (frontend → Lambda del servicio)
1. Frontend extrae circuit_id de URL
2. Frontend consulta GET `/api/v2/biometric/circuit/{circuit_id}` para obtener configuración
3. Frontend captura imágenes (AutoCamera o FaceLivenessDetector)
4. Frontend llama a la Lambda del servicio (ocr/liveness/compare-faces/data-verification)
5. Lambda procesa y actualiza ts_biometric_history
6. Lambda envía webhook al webhookUrl del canal
7. Lambda retorna resultado ligero al frontend

## Decisiones Arquitectónicas Clave

### Una Lambda por servicio + start_circuit + webhook_dispatcher
Cada verificación tiene su propia Lambda con su Function URL, package.json, y permisos IAM. Esto:
- Mantiene el blast radius pequeño
- Permite escalar/fallar independientemente
- Evita que una Lambda monolítica maneje todo

### API Gateway con Custom Domain
- URLs base: `https://api.portal.com/api/v2/biometric/...`
- Custom domain configurado en producción
- Variables de entorno para endpoints del frontend

### DynamoDB para datos transaccionales
- **channels:** Configuración de canales (lectura frecuente, escritura poco frecuente)
- **ts_biometric_history:** Historial de verificaciones (lectura/escritura frecuente)
- TTL en expires_at para limpieza automática de circuitos expirados

### Webhooks server-to-server
- Lambda envía POST al webhookUrl del canal
- Browser NUNCA llama directamente al webhook del cliente
- Evita CORS y expone menos información al cliente

### Channel settings como JSON en DynamoDB
- Flexible para agregar nuevas configuraciones sin migrar schema
- Diferentes channels pueden tener diferentes settings
- Fallback a valores por defecto si no viene un setting específico

### Datos de person en start_circuit
- Required para todos los servicios (incluyendo liveness sin OCR)
- Permite data-verification sin reingresar datos
- Se guarda en ts_biometric_history y se envía al webhook