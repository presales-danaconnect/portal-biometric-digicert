---
inclusion: always
---

# UI Standards & Design Guidelines

## Design Philosophy
- Minimalist, professional, trustworthy appearance for identity verification
- Neutral base design that adapts per tenant via configurable colors
- Mobile-first, works across device sizes
- Camera-first: every capture step is done live through the device camera, never file upload

## Component Library

All UI is built with @aws-amplify/ui-react components, not raw HTML/CSS and not Tailwind. Common components used throughout: Card (variation="elevated" for the main card, variation="outlined" for nested content areas), Flex, Heading, Text, Badge, Button (variation="primary" / "warning" / default), Divider, Loader, Image, Alert.

FaceLivenessDetector comes from @aws-amplify/ui-react-liveness and renders its own internal camera UI; we only control its displayText strings (see livenessDictionary.ts) and its container.

## Layout Structure

### Fixed 3-Section Layout
Header (always rendered) -> Content (service-specific) -> Footer (always rendered). There is no "enabled/disabled" flag for Header or Footer; every tenant always shows both, configured via tenants.json (a tenant can pass an empty headerTitle to effectively hide the text and show only a logo).

### Tenant Configuration (real schema, in src/config/tenants.json)
Each tenant entry provides:
- headerTitle, headerLogoUrl
- footerPrivacyPolicyUrl, footerWebsiteUrl
- webhookUrl
- livenessConfidenceThreshold, compareFacesSimilarityThreshold (numbers, 0-100)
- colors: primary, headerBackground, footerBackground, headerFontColor, footerFontColor
- layout: headerAlign, footerAlign ("left" | "center" | "right")

Header and Footer receive these as props (backgroundColor, fontColor, align) and apply them directly as Amplify UI style props; there is no separate CSS theming layer.

## Result Messaging (unified pattern across all 3 services)

Every service (OCRVerification, LivenessCheck, CompareFacesVerification) shows outcome messages the same way: an Alert placed immediately below the Divider that separates the title/badge area from the content Card.
- Success: <Alert variation="success">
- Failure/error: <Alert variation="error">, dismissible where appropriate
- Never use the browser's native alert(); errors and results always render inline in the UI

## Service-Specific UI Patterns (as actually implemented)

### OCR Verification
- AutoCamera captures front, then back, with a rectangle guide overlay
- After each capture: preview + Continue/Retake buttons (no auto-advance)
- Submit button calls Bedrock; results render as a labeled list (Document Type, Country, Document #, etc.)
- If Bedrock determines the image isn't a valid ID document, this is shown via the unified Alert error pattern, not a generic failure

### Liveness Check
- Session is created automatically on mount (no manual "Start" button)
- FaceLivenessDetector renders once a sessionId exists
- Result: confidence score compared against the tenant's livenessConfidenceThreshold to decide success/fail (Rekognition's own "SUCCEEDED" status only means the technical analysis completed, not that the person passed)
- Reference image is shown alongside the confidence score

### Compare Faces
- Step 1: capture ID document photo (rectangle guide)
- Step 2: Bedrock validates it's a real ID document before continuing; if invalid, shows the captured photo plus a manual Retake button (camera does not auto-restart)
- Step 3: preview captured document with Continue/Retake
- Step 4: Liveness (same as standalone Liveness flow)
- Step 5: Rekognition CompareFaces between the document photo and the Liveness reference image; result shows similarity % and match/no-match via the unified Alert pattern

## Camera Capture (AutoCamera component)
- Auto-activates on mount, requests camera permission
- Guide overlay: rectangle (documents) or circle (faces), depending on guideType prop
- Auto-captures after a configurable number of seconds with a visible countdown/progress indicator
- Handles and surfaces specific error states: permission denied, no camera found, generic error, each with a retry action

## Internationalization
Every user-facing string goes through the t() function from src/i18n/i18n.ts, sourced from en.json/es.json. Do not hardcode UI strings in components. FaceLivenessDetector's built-in strings are a separate exception, translated via livenessDictionary.ts due to that component's own prop schema.

## Accessibility
- Retry/action buttons meet minimum touch target sizing
- Alerts are used (not color alone) to convey success/failure, keeping a text label alongside the color
