/**
 * Display text dictionary for Amplify's FaceLivenessDetector component.
 * Keys are dictated by @aws-amplify/ui-react-liveness, not by our own
 * i18n schema — kept separate from en.json/es.json for that reason.
 *
 * Empty strings ('') or single-space values (' ') are intentional:
 * they suppress that specific hint/text from rendering at all.
 */

export const livenessDictionary = {
  en: {
    photosensitivyWarningHeadingText: 'This check flashes different colors.',
    photosensitivyWarningBodyText: 'Use caution if you are photosensitive.',
    photosensitivyWarningInfoText: ' ',
    hintCenterFaceInstructionText: '',
    goodFitCaptionText: 'Good fit',
    tooFarCaptionText: 'Move closer',
    hintCenterFaceText: '',
    startScreenBeginCheckText: 'Start verification',
    hintHoldFaceForFreshnessText: 'Hold still',
    hintTooCloseText: 'Move back',
    hintConnectingText: 'Connecting...',
    hintVerifyingText: 'Verifying...',
    hintTooFarText: 'Move closer',
    waitingCameraPermissionText: 'Waiting for camera permission...',
    hintMoveFaceFrontOfCameraText: 'Position your face in front of the camera',
    hintCanNotIdentifyText: 'Position your face in front of the camera',
    cameraNotFoundHeadingText: 'Camera not available',
    cameraNotFoundMessageText: 'Check that a camera is connected and no other application is using it. You may need to go to settings to grant camera permissions, refresh the page, and try again.',
    retryCameraPermissionsText: 'Retry',
    landscapeHeaderText: 'Landscape orientation not supported',
    landscapeMessageText: 'Rotate your device to portrait orientation.',
  },
  es: {
    photosensitivyWarningHeadingText: 'Esta verificación muestra luces de colores.',
    photosensitivyWarningBodyText: 'Ten cuidado si eres fotosensible.',
    photosensitivyWarningInfoText: ' ',
    hintCenterFaceInstructionText: '',
    goodFitCaptionText: 'Buen ajuste',
    tooFarCaptionText: 'Demasiado lejos',
    hintCenterFaceText: '',
    startScreenBeginCheckText: 'Comenzar a verificar',
    hintHoldFaceForFreshnessText: 'Quédate quieto',
    hintTooCloseText: 'Muévete hacia atrás',
    hintConnectingText: 'Conectando...',
    hintVerifyingText: 'Verificando...',
    hintTooFarText: 'Acércate más',
    waitingCameraPermissionText: 'Esperando que concedas el permiso de la cámara...',
    hintMoveFaceFrontOfCameraText: 'Coloca tu cara en frente de la cámara',
    hintCanNotIdentifyText: 'Coloca tu cara en frente de la cámara',
    cameraNotFoundHeadingText: 'La cámara no está disponible',
    cameraNotFoundMessageText: 'Verifica que una cámara esté conectada y que no haya otra aplicación utilizando la cámara. Es posible que debas ir a la configuración para otorgar permisos de cámara, refrescar la página y volver a intentarlo.',
    retryCameraPermissionsText: 'Reintentar',
    landscapeHeaderText: 'Orientación horizontal no compatible',
    landscapeMessageText: 'Gira tu dispositivo a la orientación vertical.',
  },
} as const;
