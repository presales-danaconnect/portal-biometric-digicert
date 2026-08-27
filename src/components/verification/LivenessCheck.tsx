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
} from '@aws-amplify/ui-react';
import { FaceLivenessDetector } from '@aws-amplify/ui-react-liveness';
import { createLivenessSession, submitLivenessResult } from '../../services/liveness';
import { useTranslation } from '../../i18n/i18n';
import { livenessDictionary } from '../../i18n/livenessDictionary';
import outputs from '../../../amplify_outputs.json';

interface LivenessCheckProps {
  circuitId: string;
  thresholds: {
    livenessConfidenceThreshold: number;
    maxAttempts: number;
  };
  onComplete: () => void;
  geolocation?: string | null;
}

export function LivenessCheck({
  circuitId,
  thresholds,
  onComplete,
  geolocation,
}: LivenessCheckProps) {
  const { t, lang } = useTranslation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const startSession = useCallback(async () => {
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

  useEffect(() => {
    if (attempts < thresholds.maxAttempts) {
      startSession();
    }
  }, []);

  const handleAnalysisComplete = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const response = await submitLivenessResult(circuitId, sessionId, geolocation);
      if (response.success && response.data && response.data.confidence >= thresholds.livenessConfidenceThreshold) {
        onComplete();
      } else {
        setAttempts(prev => prev + 1);
        setError(t('liveness.failed'));
        setSessionId(null);
        if (attempts + 1 < thresholds.maxAttempts) {
          startSession();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'));
      setAttempts(prev => prev + 1);
      setSessionId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const hasReachedLimit = attempts >= thresholds.maxAttempts;

  return (
    <Card padding="xl" width="100%" borderRadius="xl">
      <Flex direction="column" gap="xl">
        <Flex direction="column" gap="xs">
          <Heading level={2}>👤 {t('liveness.title')}</Heading>
          <Badge variation="info">{t('liveness.instructions')}</Badge>
        </Flex>
        <Divider />

        {error && (
          <Alert variation="error" isDismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {hasReachedLimit && (
          <Alert variation="error">{t('common.maxAttemptsReached')}</Alert>
        )}

        <Card variation="outlined">
          <Flex direction="column" gap="l" alignItems="center" padding="l">
            {isLoading && !sessionId ? (
              <Flex direction="column" gap="m" alignItems="center">
                <Loader size="large" />
                <Text>{t('liveness.creatingSession')}</Text>
              </Flex>
            ) : sessionId && !hasReachedLimit ? (
              <FaceLivenessDetector
                sessionId={sessionId}
                region={outputs.auth.aws_region}
                displayText={livenessDictionary[lang]}
                onAnalysisComplete={handleAnalysisComplete}
                onError={(err) => {
                  console.error('FaceLivenessDetector error:', err);
                  setError(t('liveness.failed'));
                  setAttempts(prev => prev + 1);
                  setSessionId(null);
                }}
              />
            ) : !hasReachedLimit ? (
              <Button variation="primary" onClick={startSession}>
                {t('liveness.tryAgain')}
              </Button>
            ) : null}
          </Flex>
        </Card>
      </Flex>
    </Card>
  );
}
