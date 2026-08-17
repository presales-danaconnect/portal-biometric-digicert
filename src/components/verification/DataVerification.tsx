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
import { verifyData, DataVerificationResultData } from '../../services/dataVerification';
import { useTranslation } from '../../i18n/i18n';
import { useAttemptTracker } from '../../hooks/useAttemptTracker';

interface DataVerificationProps {
  tenant: string;
  webhookUrl?: string;
  geolocation?: string | null;
  dataVerificationApiUrl?: string;
  docRef?: string | null;
  requiresBack?: boolean;
  reference?: string | null;
  maxAttempts?: number;
}

type Step = 'front' | 'frontPreview' | 'back' | 'backPreview' | 'querying' | 'done';

export function DataVerification({
  tenant,
  webhookUrl,
  geolocation,
  dataVerificationApiUrl,
  docRef,
  requiresBack = false,
  reference,
  maxAttempts = 3,
}: DataVerificationProps) {
  const { t } = useTranslation();
  const { hasReachedLimit, recordAttempt } = useAttemptTracker(tenant, 'data-verification', maxAttempts);

  const [step, setStep] = useState<Step>('front');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [result, setResult] = useState<DataVerificationResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFrontCapture = useCallback((photo: string) => {
    setFrontImage(photo);
    setStep('frontPreview');
  }, []);

  const handleBackCapture = useCallback((photo: string) => {
    setBackImage(photo);
    setStep('backPreview');
  }, []);

  const handleRetakeFront = () => {
    setFrontImage(null);
    setStep('front');
  };

  const handleRetakeBack = () => {
    setBackImage(null);
    setStep('back');
  };

  const handleSubmit = async () => {
    if (!frontImage || !dataVerificationApiUrl || !docRef) return;
    if (requiresBack && !backImage) return;

    setStep('querying');
    setError(null);

    try {
      const response = await verifyData(
        frontImage,
        backImage || undefined,
        docRef,
        tenant,
        webhookUrl,
        geolocation,
        dataVerificationApiUrl,
        reference
      );

      if (response.success && response.data) {
        setResult(response.data);
      } else {
        const errorKey = response.errorCode ? `dataVerification.errors.${response.errorCode}` : null;
        setError(errorKey ? t(errorKey) : (response.error || t('common.unknownError')));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setStep('done');
      recordAttempt();
    }
  };

  const handleRetry = () => {
    setStep('front');
    setFrontImage(null);
    setBackImage(null);
    setResult(null);
    setError(null);
  };

  if (!dataVerificationApiUrl || !docRef) {
    return (
      <Card variation="elevated" padding="xl" width="100%">
        <Flex direction="column" gap="xl">
          <Heading level={2}>🔎 {t('dataVerification.title')}</Heading>
          <Divider />
          <Alert variation="error">
            {t('dataVerification.errors.MISSING_PARAMS')}
          </Alert>
        </Flex>
      </Card>
    );
  }

  const isMatch = !!(result?.found && result?.analysis?.overallMatch);

  return (
    <Card padding="xl" width="100%" borderRadius="xl">
      <Flex direction="column" gap="xl">
        <Flex direction="column" gap="xs">
          <Heading level={2}>🔎 {t('dataVerification.title')}</Heading>
          <Badge size="small" variation="info">
            Tenant: {tenant}
          </Badge>
        </Flex>

        <Divider />

        {step === 'done' && result && result.found && (
          <Alert variation={isMatch ? 'success' : 'error'}>
            {isMatch ? t('dataVerification.match') : t('dataVerification.noMatch')}
          </Alert>
        )}

        {step === 'done' && result && !result.found && (
          <Alert variation="error">
            {t('dataVerification.notFound')}
          </Alert>
        )}

        {error && (
          <Alert variation="error" isDismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {step === 'done' && hasReachedLimit && !isMatch && (
          <Alert variation="error">
            {t('common.maxAttemptsReached')}
          </Alert>
        )}

        <Card variation="outlined">
          <Flex direction="column" gap="l" alignItems="center" padding="l">
            {step === 'front' && (
              <AutoCamera
                guideType="rectangle"
                guideText={t('dataVerification.documentGuideText')}
                maxSeconds={5}
                onCapture={handleFrontCapture}
              />
            )}

            {step === 'frontPreview' && frontImage && (
              <Flex direction="column" gap="l" width="100%" alignItems="center">
                <Badge>{t('ocr.frontSide')}</Badge>
                <Image
                  src={frontImage}
                  alt="Front"
                  width="200px"
                  height="130px"
                  borderRadius="small"
                  objectFit="cover"
                />
                <Flex gap="m" wrap="wrap" justifyContent="center">
                  {requiresBack ? (
                    <Button variation="primary" onClick={() => setStep('back')}>
                      {t('ocr.continue')}
                    </Button>
                  ) : (
                    <Button variation="primary" onClick={handleSubmit}>
                      {t('ocr.submit')}
                    </Button>
                  )}
                  <Button onClick={handleRetakeFront}>
                    {t('ocr.retake')}
                  </Button>
                </Flex>
              </Flex>
            )}

            {step === 'back' && (
              <AutoCamera
                guideType="rectangle"
                guideText={t('dataVerification.documentGuideTextBack')}
                maxSeconds={5}
                onCapture={handleBackCapture}
              />
            )}

            {step === 'backPreview' && backImage && (
              <Flex direction="column" gap="l" width="100%" alignItems="center">
                <Badge>{t('ocr.backSide')}</Badge>
                <Image
                  src={backImage}
                  alt="Back"
                  width="200px"
                  height="130px"
                  borderRadius="small"
                  objectFit="cover"
                />
                <Flex gap="m" wrap="wrap" justifyContent="center">
                  <Button variation="primary" onClick={handleSubmit}>
                    {t('ocr.submit')}
                  </Button>
                  <Button onClick={handleRetakeBack}>
                    {t('ocr.retake')}
                  </Button>
                </Flex>
              </Flex>
            )}

            {step === 'querying' && (
              <Flex direction="column" gap="m" alignItems="center">
                <Loader size="large" />
                <Text>{t('dataVerification.querying')}</Text>
              </Flex>
            )}

            {step === 'done' && result && result.found && (
              <Flex direction="column" gap="l" width="100%" alignItems="center">
                <Flex direction="column" gap="xs">
                  <Text><strong>{t('dataVerification.documentNumber')}:</strong> {result.ocrData.documentNumber}</Text>
                  <Text><strong>{t('dataVerification.names')}:</strong> {result.ocrData.firstName}</Text>
                  <Text><strong>{t('dataVerification.lastNames')}:</strong> {result.ocrData.lastName}</Text>
                  <Text><strong>{t('dataVerification.birthDate')}:</strong> {result.ocrData.birthDate}</Text>
                  {result.analysis && (
                    <Text fontSize="small" color="font.secondary">{result.analysis.summary}</Text>
                  )}
                </Flex>
                {/* Success ends the flow — no retry button shown at all.
                    Failure only offers retry if attempts remain. */}
                {!isMatch && !hasReachedLimit && (
                  <Button variation="primary" onClick={handleRetry}>
                    {t('dataVerification.tryAgain')}
                  </Button>
                )}
              </Flex>
            )}

            {step === 'done' && result && !result.found && !hasReachedLimit && (
              <Flex direction="column" gap="m" alignItems="center">
                <Button variation="primary" onClick={handleRetry}>
                  {t('dataVerification.tryAgain')}
                </Button>
              </Flex>
            )}

            {step === 'done' && error && !hasReachedLimit && (
              <Flex direction="column" gap="m" alignItems="center">
                <Button variation="primary" onClick={handleRetry}>
                  {t('dataVerification.tryAgain')}
                </Button>
              </Flex>
            )}
          </Flex>
        </Card>
      </Flex>
    </Card>
  );
}
