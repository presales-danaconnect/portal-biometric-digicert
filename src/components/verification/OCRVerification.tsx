import { useState, useCallback } from 'react';
import {
  Alert,
  Button,
  Card,
  Flex,
  Heading,
  Text,
  Badge,
  Divider,
  Loader,
  Image,
} from '@aws-amplify/ui-react';
import { AutoCamera } from './AutoCamera';
import { callOCRAPI, OCRResponse } from '../../services/api';
import { useTranslation } from '../../i18n/i18n';
import { useAttemptTracker } from '../../hooks/useAttemptTracker';

interface OCRVerificationProps {
  tenant: string;
  webhookUrl?: string;
  geolocation?: string | null;
  requiresBack?: boolean;
  reference?: string | null;
  confidenceThreshold?: number;
  maxAttempts?: number;
}

type OcrStep = 'front' | 'frontFreezed' | 'back' | 'backFreezed' | 'done';

export function OCRVerification({
  tenant,
  webhookUrl,
  geolocation,
  requiresBack = false,
  reference,
  confidenceThreshold = 70,
  maxAttempts = 3,
}: OCRVerificationProps) {
  const { t } = useTranslation();
  const { hasReachedLimit, recordAttempt } = useAttemptTracker(tenant, 'ocr', maxAttempts);

  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [ocrStep, setOcrStep] = useState<OcrStep>('front');
  const [ocrResult, setOcrResult] = useState<OCRResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOCRCapture = useCallback((photo: string) => {
    if (ocrStep === 'front') {
      setFrontImage(photo);
      setOcrStep('frontFreezed');
    } else if (ocrStep === 'back') {
      setBackImage(photo);
      setOcrStep('backFreezed');
    }
  }, [ocrStep]);

  const handleOCROnSubmit = useCallback(async () => {
    if (!frontImage) return;
    if (requiresBack && !backImage) return;

    setOcrStep('done');
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const result = await callOCRAPI(frontImage, backImage || undefined, tenant, webhookUrl, geolocation, reference);
      if (result.success && result.data) {
        setOcrResult(result);
        recordAttempt();
      } else if (result.errorCode === 'NOT_A_DOCUMENT') {
        setErrorMessage(t('ocr.notADocument'));
        recordAttempt();
      } else {
        setErrorMessage(result.error || t('common.unknownError'));
        recordAttempt();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('common.unknownError'));
      recordAttempt();
    } finally {
      setIsProcessing(false);
    }
  }, [frontImage, backImage, requiresBack, tenant, webhookUrl, geolocation, reference, t, recordAttempt]);

  const handleContinueOCR = () => {
    if (ocrStep === 'frontFreezed' && requiresBack) {
      setOcrStep('back');
    } else if (ocrStep === 'backFreezed') {
      setOcrStep('done');
    }
  };

  const handleRetakeOCR = () => {
    if (ocrStep === 'frontFreezed') {
      setFrontImage(null);
      setOcrStep('front');
    } else if (ocrStep === 'backFreezed') {
      setBackImage(null);
      setOcrStep('back');
    }
  };

  const handleStartOver = () => {
    setFrontImage(null);
    setBackImage(null);
    setOcrStep('front');
    setOcrResult(null);
    setErrorMessage(null);
  };

  const stepMessages = {
    front: t('ocr.steps.front'),
    frontFreezed: t('ocr.steps.frontFreezed'),
    back: t('ocr.steps.back'),
    backFreezed: t('ocr.steps.backFreezed'),
    done: t('ocr.steps.done'),
  };

  const currentMessage = stepMessages[ocrStep];
  const showCamera = ocrStep === 'front' || ocrStep === 'back';
  const showPhotos = ocrStep === 'frontFreezed' || ocrStep === 'backFreezed' || ocrStep === 'done';

  // OCR is only considered a real success when Bedrock's self-reported
  // confidence score meets the tenant's configured threshold — a low
  // score means fields were likely misread even if extraction "succeeded"
  // technically.
  const confidence = ocrResult?.data?.documentInfo.confidence ?? 0;
  const isSuccessful = !!(ocrResult && ocrResult.data && confidence >= confidenceThreshold);
  const isLowConfidence = !!(ocrResult && ocrResult.data && confidence < confidenceThreshold);

  return (
    <Card padding="xl" width="100%" borderRadius="xl">
      <Flex direction="column" gap="xl">
        <Flex direction="column" gap="xs">
          <Heading level={2}>📄 {t('ocr.title')}</Heading>
          <Badge variation="info">
            {t('ocr.instructions')}
          </Badge>
        </Flex>

        <Divider />

        {errorMessage && (
          <Alert variation="error" isDismissible onDismiss={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        )}

        {isSuccessful && (
          <Alert variation="success">
            {t('ocr.results')}
          </Alert>
        )}

        {isLowConfidence && (
          <Alert variation="error">
            {t('ocr.lowConfidence')}
          </Alert>
        )}

        {hasReachedLimit && !isSuccessful && (
          <Alert variation="error">
            {t('common.maxAttemptsReached')}
          </Alert>
        )}

        <Card variation="outlined">
          <Flex direction="column" gap="l" alignItems="center" padding="l">
            {showCamera ? (
              <AutoCamera
                guideType="rectangle"
                guideText={currentMessage}
                maxSeconds={5}
                onCapture={handleOCRCapture}
              />
            ) : showPhotos ? (
              <Flex direction="column" gap="l" width="100%">
                <Heading level={4}>✅ {t('ocr.photoCaptured')}</Heading>

                <Flex direction="row" gap="l" wrap="wrap" justifyContent="center">
                  {frontImage && (
                    <Flex direction="column" gap="xs" alignItems="center">
                      <Badge>{t('ocr.frontSide')}</Badge>
                      <Image
                        src={frontImage}
                        alt="Front"
                        width="150px"
                        height="100px"
                        borderRadius="small"
                        objectFit="cover"
                      />
                    </Flex>
                  )}

                  {backImage && (
                    <Flex direction="column" gap="xs" alignItems="center">
                      <Badge>{t('ocr.backSide')}</Badge>
                      <Image
                        src={backImage}
                        alt="Back"
                        width="150px"
                        height="100px"
                        borderRadius="small"
                        objectFit="cover"
                      />
                    </Flex>
                  )}
                </Flex>

                {ocrStep === 'frontFreezed' && (
                  <Flex gap="m" wrap="wrap" justifyContent="center">
                    {requiresBack ? (
                      <Button variation="primary" onClick={handleContinueOCR}>
                        {t('ocr.continue')}
                      </Button>
                    ) : (
                      <Button variation="primary" onClick={handleOCROnSubmit} isDisabled={isProcessing}>
                        {t('ocr.submit')}
                      </Button>
                    )}
                    <Button onClick={handleRetakeOCR}>
                      {t('ocr.retake')}
                    </Button>
                  </Flex>
                )}

                {ocrStep === 'backFreezed' && (
                  <Flex gap="m" wrap="wrap" justifyContent="center">
                    <Button variation="primary" onClick={handleOCROnSubmit} isDisabled={isProcessing}>
                      {t('ocr.submit')}
                    </Button>
                    <Button onClick={handleRetakeOCR}>
                      {t('ocr.retake')}
                    </Button>
                  </Flex>
                )}

                {ocrStep === 'done' && isProcessing && (
                  <Flex gap="xs" alignItems="center">
                    <Loader size="small" />
                    <Text>{t('ocr.processing')}</Text>
                  </Flex>
                )}
              </Flex>
            ) : null}
          </Flex>
        </Card>

        {ocrStep === 'done' && !isProcessing && (ocrResult || errorMessage) && (
          <Flex direction="column" gap="m" alignItems="center" width="100%">
            {/* Success ends the flow — no "Start Over" button shown at all.
                Failure or low confidence only offers a retry if attempts remain. */}
            {!isSuccessful && !hasReachedLimit && (
              <Button variation="warning" onClick={handleStartOver}>
                {t('ocr.startOver')}
              </Button>
            )}

            {ocrResult && ocrResult.data && (
              <Card variation="outlined" width="100%" padding="m">
                <Heading level={4}>📋 {t('ocr.results')}</Heading>
                <Divider />
                <Flex direction="column" gap="xs" marginTop="m">
                  <Text><strong>{t('ocr.confidence')}:</strong> {confidence.toFixed(0)}%</Text>
                  <Text><strong>{t('ocr.documentType')}:</strong> {ocrResult.data.documentInfo.documentType}</Text>
                  <Text><strong>{t('ocr.country')}:</strong> {ocrResult.data.documentInfo.country}</Text>
                  <Text><strong>{t('ocr.documentNumber')}:</strong> {ocrResult.data.documentInfo.documentNumber}</Text>
                  <Text><strong>{t('ocr.names')}:</strong> {ocrResult.data.documentInfo.firstName}</Text>
                  <Text><strong>{t('ocr.lastNames')}:</strong> {ocrResult.data.documentInfo.lastName}</Text>
                  <Text><strong>{t('ocr.birthDate')}:</strong> {ocrResult.data.documentInfo.birthDate}</Text>
                  <Text><strong>{t('ocr.expiration')}:</strong> {ocrResult.data.documentInfo.expirationDate}</Text>
                  {ocrResult.data.documentInfo.gender && <Text><strong>{t('ocr.gender')}:</strong> {ocrResult.data.documentInfo.gender}</Text>}
                  {ocrResult.data.documentInfo.nationality && <Text><strong>{t('ocr.nationality')}:</strong> {ocrResult.data.documentInfo.nationality}</Text>}
                </Flex>
              </Card>
            )}
          </Flex>
        )}
      </Flex>
    </Card>
  );
}
