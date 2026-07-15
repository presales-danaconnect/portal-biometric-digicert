import { useState, useEffect, useCallback } from 'react';
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
import { FaceLivenessDetector } from '@aws-amplify/ui-react-liveness';
import { AutoCamera } from './AutoCamera';
import { createLivenessSession } from '../../services/liveness';
import { compareFaces, validateDocument, CompareFacesResultData } from '../../services/compareFaces';
import { useTranslation } from '../../i18n/i18n';
import { livenessDictionary } from '../../i18n/livenessDictionary';
import outputs from '../../../amplify_outputs.json';

interface CompareFacesVerificationProps {
  tenant: string;
  webhookUrl?: string;
  geolocation?: string | null;
  similarityThreshold: number;
}

type Step = 'document' | 'validating' | 'documentInvalid' | 'documentPreview' | 'liveness' | 'comparing' | 'done';

export function CompareFacesVerification({
  tenant,
  webhookUrl,
  geolocation,
  similarityThreshold,
}: CompareFacesVerificationProps) {
  const { t, lang } = useTranslation();

  const [step, setStep] = useState<Step>('document');
  const [documentImage, setDocumentImage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [result, setResult] = useState<CompareFacesResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startLivenessSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await createLivenessSession();
      if (response.success && response.sessionId) {
        setSessionId(response.sessionId);
      } else {
        setError(response.error || t('common.unknownError'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Al entrar al paso de liveness, crea la sesión automáticamente
  useEffect(() => {
    if (step === 'liveness' && !sessionId && !error) {
      startLivenessSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleDocumentCapture = async (photo: string) => {
    setDocumentImage(photo);
    setStep('validating');
    setError(null);
    try {
      const response = await validateDocument(photo);
      if (response.success && response.data?.isValidDocument) {
        setStep('documentPreview');
      } else {
        const errorKey = response.errorCode ? `compareFaces.errors.${response.errorCode}` : null;
        setError(errorKey ? t(errorKey) : (response.error || t('common.unknownError')));
        setStep('documentInvalid');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'));
      setStep('documentInvalid');
    }
  };

  const handleContinueToLiveness = () => {
    setStep('liveness');
  };

  const handleRetakeDocument = () => {
    setDocumentImage(null);
    setError(null);
    setStep('document');
  };

  const handleAnalysisComplete = async () => {
    if (!sessionId || !documentImage) return;
    setStep('comparing');
    setIsLoading(true);
    try {
      const response = await compareFaces(
        sessionId,
        documentImage,
        tenant,
        webhookUrl,
        geolocation,
        similarityThreshold
      );
      if (response.success && response.data) {
        setResult(response.data);
      } else {
        const errorKey = response.errorCode ? `compareFaces.errors.${response.errorCode}` : null;
        setError(errorKey ? t(errorKey) : (response.error || t('common.unknownError')));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setIsLoading(false);
      setStep('done');
    }
  };

  const handleRetry = () => {
    setStep('document');
    setDocumentImage(null);
    setSessionId(null);
    setResult(null);
    setError(null);
  };

  return (
    <Card variation="elevated" padding="xl" width="100%">
      <Flex direction="column" gap="xl">
        <Flex direction="column" gap="xs">
          <Heading level={2}>🔄 {t('compareFaces.title')}</Heading>
          <Badge size="small" variation="warning">
            Tenant: {tenant} | AWS Rekognition
          </Badge>
        </Flex>

        <Divider />

        {step === 'done' && result && (
          <Alert variation={result.isMatch ? 'success' : 'error'}>
            {result.isMatch ? t('compareFaces.match') : t('compareFaces.noMatch')}
          </Alert>
        )}

        {error && (
          <Alert variation="error" isDismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Card variation="outlined">
          <Flex direction="column" gap="l" alignItems="center" padding="l">
            {step === 'document' && (
              <Flex direction="column" gap="m" width="100%" alignItems="center">
                <Badge>{t('compareFaces.documentStep')}</Badge>
                <AutoCamera
                  guideType="rectangle"
                  guideText={t('compareFaces.documentGuideText')}
                  maxSeconds={5}
                  onCapture={handleDocumentCapture}
                />
              </Flex>
            )}

            {step === 'validating' && (
              <Flex direction="column" gap="m" alignItems="center">
                <Loader size="large" />
                <Text>{t('compareFaces.validatingDocument')}</Text>
              </Flex>
            )}

            {step === 'documentInvalid' && documentImage && (
              <Flex direction="column" gap="l" width="100%" alignItems="center">
                <Badge>{t('compareFaces.documentStep')}</Badge>
                <Image
                  src={documentImage}
                  alt="Document"
                  width="200px"
                  height="130px"
                  borderRadius="small"
                  objectFit="cover"
                />
                <Button variation="primary" onClick={handleRetakeDocument}>
                  {t('ocr.retake')}
                </Button>
              </Flex>
            )}

            {step === 'documentPreview' && documentImage && (
              <Flex direction="column" gap="l" width="100%" alignItems="center">
                <Badge>{t('compareFaces.documentStep')}</Badge>
                <Heading level={4}>✅ {t('ocr.photoCaptured')}</Heading>
                <Image
                  src={documentImage}
                  alt="Document"
                  width="200px"
                  height="130px"
                  borderRadius="small"
                  objectFit="cover"
                />
                <Flex gap="m" wrap="wrap" justifyContent="center">
                  <Button variation="primary" onClick={handleContinueToLiveness}>
                    {t('ocr.continue')}
                  </Button>
                  <Button onClick={handleRetakeDocument}>
                    {t('ocr.retake')}
                  </Button>
                </Flex>
              </Flex>
            )}

            {step === 'liveness' && (
              <Flex direction="column" gap="m" width="100%" alignItems="center">
                <Badge variation="success">{t('compareFaces.livenessStep')}</Badge>
                {error ? (
                  <Flex direction="column" gap="m" alignItems="center">
                    <Button variation="primary" onClick={handleRetry}>
                      {t('compareFaces.tryAgain')}
                    </Button>
                  </Flex>
                ) : isLoading && !sessionId ? (
                  <Flex direction="column" gap="m" alignItems="center">
                    <Loader size="large" />
                    <Text>{t('compareFaces.creatingSession')}</Text>
                  </Flex>
                ) : sessionId ? (
                  <FaceLivenessDetector
                    sessionId={sessionId}
                    region={outputs.auth.aws_region}
                    displayText={livenessDictionary[lang]}
                    onAnalysisComplete={handleAnalysisComplete}
                    onError={(err) => {
                      console.error('FaceLivenessDetector error:', err);
                      setError(t('liveness.failed'));
                    }}
                  />
                ) : null}
              </Flex>
            )}

            {step === 'comparing' && (
              <Flex direction="column" gap="m" alignItems="center">
                <Loader size="large" />
                <Text>{t('compareFaces.comparing')}</Text>
              </Flex>
            )}

            {step === 'done' && (
              <Flex direction="column" gap="l" width="100%" alignItems="center">
                {result && (
                  <>
                    <Text>
                      {t('compareFaces.similarity')}: {result.similarity.toFixed(2)}%
                    </Text>
                    {documentImage && (
                      <Image
                        src={documentImage}
                        alt="Document"
                        width="150px"
                        height="100px"
                        borderRadius="small"
                        objectFit="cover"
                      />
                    )}
                  </>
                )}
                <Button variation="primary" onClick={handleRetry}>
                  {t('compareFaces.tryAgain')}
                </Button>
              </Flex>
            )}
          </Flex>
        </Card>
      </Flex>
    </Card>
  );
}