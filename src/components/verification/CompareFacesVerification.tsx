import { useState, useEffect, useCallback } from 'react';
import {
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
import { compareFaces, CompareFacesResultData } from '../../services/compareFaces';
import { useTranslation } from '../../i18n/i18n';
import { livenessDictionary } from '../../i18n/livenessDictionary';
import outputs from '../../../amplify_outputs.json';

interface CompareFacesVerificationProps {
  tenant: string;
  webhookUrl?: string;
  geolocation?: string | null;
  similarityThreshold: number;
}

type Step = 'document' | 'liveness' | 'comparing' | 'done';

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

  const handleDocumentCapture = (photo: string) => {
    setDocumentImage(photo);
    setStep('liveness');
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

            {step === 'liveness' && (
              <Flex direction="column" gap="m" width="100%" alignItems="center">
                <Badge variation="success">{t('compareFaces.livenessStep')}</Badge>
                {error ? (
                  <Flex direction="column" gap="m" alignItems="center">
                    <Text color="font.error">{error}</Text>
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
                {error ? (
                  <Text color="font.error">{error}</Text>
                ) : result ? (
                  <>
                    <Heading level={4}>
                      {result.isMatch ? `✅ ${t('compareFaces.match')}` : `⚠️ ${t('compareFaces.noMatch')}`}
                    </Heading>
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
                ) : null}
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
