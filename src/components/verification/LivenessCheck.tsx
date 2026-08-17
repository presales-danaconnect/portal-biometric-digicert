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
import { createLivenessSession, getLivenessResults, LivenessResultData } from '../../services/liveness';
import { useTranslation } from '../../i18n/i18n';
import { livenessDictionary } from '../../i18n/livenessDictionary';
import { useAttemptTracker } from '../../hooks/useAttemptTracker';
import outputs from '../../../amplify_outputs.json';

interface LivenessCheckProps {
  tenant: string;
  webhookUrl?: string;
  geolocation?: string | null;
  confidenceThreshold: number;
  reference?: string | null;
  maxAttempts?: number;
}

export function LivenessCheck({
  tenant,
  webhookUrl,
  geolocation,
  confidenceThreshold,
  reference,
  maxAttempts = 3,
}: LivenessCheckProps) {
  const { t, lang } = useTranslation();
  const { hasReachedLimit, recordAttempt } = useAttemptTracker(tenant, 'liveness', maxAttempts);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [result, setResult] = useState<LivenessResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
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

  useEffect(() => {
    if (!hasReachedLimit) {
      startSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalysisComplete = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const response = await getLivenessResults(sessionId, tenant, webhookUrl, geolocation, reference);
      if (response.success && response.data) {
        setResult(response.data);
        recordAttempt();
      } else {
        setError(response.error || t('common.unknownError'));
        recordAttempt();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'));
      recordAttempt();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setSessionId(null);
    setResult(null);
    setError(null);
    startSession();
  };

  const isLive = result
    ? result.status === 'SUCCEEDED' && result.confidence >= confidenceThreshold
    : false;

  return (
    <Card padding="xl" width="100%" borderRadius="xl">
      <Flex direction="column" gap="xl">
        <Flex direction="column" gap="xs">
          <Heading level={2}>👤 {t('liveness.title')}</Heading>
          <Badge variation="info">
            {t('liveness.instructions')}
          </Badge>
        </Flex>

        <Divider />

        {result && (
          <Alert variation={isLive ? 'success' : 'error'}>
            {isLive ? t('liveness.success') : t('liveness.failed')}
          </Alert>
        )}

        {error && !result && (
          <Alert variation="error" isDismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {hasReachedLimit && !isLive && (
          <Alert variation="error">
            {t('common.maxAttemptsReached')}
          </Alert>
        )}

        <Card variation="outlined">
          <Flex direction="column" gap="l" alignItems="center" padding="l">
            {result ? (
              <Flex direction="column" gap="l" width="100%" alignItems="center">
                <Text>
                  {t('liveness.confidence')}: {result.confidence?.toFixed(2)}%
                </Text>
                {result.referenceImage && (
                  <Image
                    src={`data:image/jpeg;base64,${result.referenceImage}`}
                    alt="Reference"
                    width="150px"
                    height="150px"
                    borderRadius="small"
                    objectFit="cover"
                  />
                )}
                {/* Success ends the flow — no retry button shown at all.
                    Failure only offers retry if attempts remain. */}
                {!isLive && !hasReachedLimit && (
                  <Button variation="primary" onClick={handleRetry}>
                    {t('liveness.tryAgain')}
                  </Button>
                )}
              </Flex>
            ) : error ? (
              <Flex direction="column" gap="m" alignItems="center">
                {!hasReachedLimit && (
                  <Button variation="primary" onClick={handleRetry}>
                    {t('liveness.tryAgain')}
                  </Button>
                )}
              </Flex>
            ) : isLoading && !sessionId ? (
              <Flex direction="column" gap="m" alignItems="center">
                <Loader size="large" />
                <Text>{t('liveness.creatingSession')}</Text>
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
                  recordAttempt();
                }}
              />
            ) : null}
          </Flex>
        </Card>
      </Flex>
    </Card>
  );
}
