---
inclusion: always
---

# Estándares de UI y Guía de Diseño

## Filosofía de Diseño
- Minimalista, profesional, confiable para verificación de identidad
- Diseño base neutral que se adapta por channel mediante colores configurables
- Mobile-first, funciona en todos los tamaños de pantalla
- Cámara primero: toda captura se hace en vivo con la cámara del dispositivo, nunca upload de archivos

## Biblioteca de Componentes

Toda la UI se construye con componentes de @aws-amplify/ui-react, NO HTML/CSS raw ni Tailwind.

**Componentes usados frecuentemente:**
- `Card` (variation="elevated" para el card principal, variation="outlined" para contenido anidado)
- `Flex`, `Heading`, `Text`, `Badge`
- `Button` (variation="primary" / "warning" / default)
- `Divider`, `Loader`, `Image`
- `Alert` (para mensajes de éxito/error)

**FaceLivenessDetector:**
- Viene de @aws-amplify/ui-react-liveness
- Renderiza su propia UI de cámara internamente
- Solo controlamos sus strings mediante `displayText` (ver livenessDictionary.ts)

## Estructura de Layout

### Layout Fijo de 3 Secciones

```
┌─────────────────────────────────────┐
│           HEADER (opcional)         │  ← Configurable por channel
├─────────────────────────────────────┤
│                                     │
│           CONTENT                   │  ← Servicio específico (liveness/ocr/compare-faces/data-verification)
│                                     │
├─────────────────────────────────────┤
│           FOOTER (opcional)         │  ← Configurable por channel
└─────────────────────────────────────┘
```

### Header y Footer (Controlado por Channel)

**Header:**
- Se renderiza SIEMPRE, pero puede estar "vacío"
- Configuración tomada de `channel.settings` en DynamoDB:
  - `headerTitle`: Texto del header (si está vacío, muestra solo el logo)
  - `headerLogoUrl`: URL del logo del cliente
  - `headerBackground`: Color de fondo
  - `headerFontColor`: Color del texto
  - `headerAlign`: "left" | "center" | "right"

**Footer:**
- Se renderiza SIEMPRE, pero puede estar "vacío"
- Configuración tomada de `channel.settings`:
  - `footerPrivacyPolicyUrl`: Link a política de privacidad
  - `footerWebsiteUrl`: Link al sitio del cliente
  - `footerBackground`: Color de fondo
  - `footerFontColor`: Color del texto
  - `footerAlign`: "left" | "center" | "right"

**No hay flag de enabled/disabled:** Si un canal no tiene configurado un elemento, simplemente no muestra contenido textual pero el espacio del layout se preserva (o se oculta completamente si both title y logo están vacíos en el header).

## Patrón de Mensajes de Resultado (unificado)

Los 3 servicios de verificación muestran mensajes de resultado de la misma manera:

```
┌─────────────────────────────┐
│     Título del Servicio     │
│     Badge: Completado       │
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │   ALERT (resultado)   │  │  ← Alert VA aquí, debajo del Divider
│  └───────────────────────┘  │
│                             │
│   Contenido del servicio    │
│   (imágenes, datos, etc.)   │
│                             │
└─────────────────────────────┘
```

- **Éxito:** `<Alert variation="success">`
- **Error/Fracaso:** `<Alert variation="error">`, dismissible cuando corresponda
- **NUNCA usar alert() del navegador:** Todos los resultados e errores se renderizan inline

## Patrones de UI por Servicio

### Liveness Check (Rekognition)
1. **Sin botón de "Start":** La sesión se crea automáticamente al montar el componente
2. **FaceLivenessDetector:** Se renderiza una vez que existe sessionId
3. **Resultado:**
   - Mostrar confidence score de Rekognition
   - Comparar contra `settings.livenessConfidenceThreshold` (configurable por channel)
   - Mostrar imagen de referencia junto al score
   - Alert de éxito/fracaso basado en el threshold

### OCR Verification (Bedrock)
1. **Paso 1:** Capturar frente del documento (guía rectangular)
2. **Paso 2:** Capturar reverso del documento (guía rectangular)
3. **Después de cada captura:** Preview + botones Continue/Retake (no auto-advance)
4. **Submit:** Envía ambas imágenes a Bedrock
5. **Resultados:** Lista de campos extraídos con labels (Tipo de Documento, País, Número, etc.)
6. **Documento inválido:** Si Bedrock determina que no es un ID válido, mostrar Alert de error (NO failure genérico)

### Compare Faces (Rekognition)
1. **Paso 1:** Capturar foto del documento de identidad (guía rectangular)
2. **Paso 2:** Bedrock valida que sea un documento válido
   - Si es inválido: mostrar foto capturada + botón Retake manual
   - NO auto-reiniciar la cámara
3. **Paso 3:** Preview del documento + Continue/Retake
4. **Paso 4:** Liveness check (mismo flujo que servicio standalone)
5. **Paso 5:** Rekognition CompareFaces
   - Comparar referencia del liveness vs foto del documento
   - Mostrar % de similitud
   - Alert de match/no-match

### Data Verification (sin AI externa)
1. Solo compara datos de `person` (enviados en start_circuit) con los datos del documento
2. No usa Rekognition ni Bedrock
3. Muestra resultado de la comparación (match/no-match por campo)

## Componente AutoCamera

- **Auto-activación:** Solicita permiso de cámara al montar
- **Guía overlay:**
  - Rectángulo: para documentos
  - Círculo: para rostros
- **Auto-capture:** Después de N segundos configurables (con indicador de countdown visible)
- **Estados de error:**
  - Permiso denegado → retry action
  - Cámara no encontrada → retry action
  - Error genérico → retry action

## Colores por Channel

Los colores se leen de `channel.settings.colors` y se aplican directamente como props de Amplify UI:

```json
{
  "colors": {
    "primary": "#0066CC",
    "headerBackground": "#FFFFFF",
    "footerBackground": "#F5F5F5",
    "headerFontColor": "#333333",
    "footerFontColor": "#666666"
  }
}
```

**NO hay capa separada de CSS theming:** Los colores van directos a los componentes como `backgroundColor`, `color`, etc.

## Configuración del Channel (DynamoDB)

```json
{
  "channel_id": "uuid",
  "channel_type": "liveness",
  "settings": {
    "webhookUrl": "https://...",
    "expiresInMinutes": 15,
    "colors": { ... },
    "layout": {
      "headerAlign": "left" | "center" | "right",
      "footerAlign": "left" | "center" | "right"
    },
    "headerTitle": "DigiCert Verification",
    "headerLogoUrl": "/logos/digicert.png",
    "footerPrivacyPolicyUrl": "https://digicert.com/privacy",
    "footerWebsiteUrl": "https://digicert.com",
    "livenessConfidenceThreshold": 80,
    "compareFacesSimilarityThreshold": 85
  }
}
```

## Internacionalización (i18n)

- **Keys de UI:** Todas las strings de la interfaz van en `en.json` / `es.json`
- **Selección de idioma:** Parametro `?lang=` en la URL (default: `en`)
- **Función t():** Usar `t('key')` para todas las strings visibles
- **FaceLivenessDetector:** Sus strings internas se traducen por separado en `livenessDictionary.ts` (no usa las keys de en.json)

**NO hardcodear strings en componentes:** Todo pasa por el sistema de i18n.

## Accesibilidad

- **Botones de retry/action:** Cumplen con tamaño mínimo de touch target
- **Alerts:** Con color + texto label (NO confiar solo en color)
- **Contraste:** Colores deben pasar WCAG AA mínimo
- **Focus states:** Elementos interactivos tienen estado de focus visible