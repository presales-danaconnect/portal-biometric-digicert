import { useState, useEffect, useCallback } from 'react';
import { FaceLivenessDetector } from '@aws-amplify/ui-react-liveness';
import { createLivenessSession, submitLivenessResult } from '../../services/liveness';
import { useTranslation } from '../../i18n/i18n';
import { livenessDictionary } from '../../i18n/livenessDictionary';
import { useAttemptTracker } from '../../hooks/useAttemptTracker';
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
  const { recordAttempt, hasReachedLimit } = useAttemptTracker(circuitId, 'liveness', thresholds.maxAttempts);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    if (!hasReachedLimit) {
      startSession();
    }
  }, []);

  const handleAnalysisComplete = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const response = await submitLivenessResult(circuitId, sessionId, geolocation);
      recordAttempt();
      if (response.success && response.data && response.data.confidence >= thresholds.livenessConfidenceThreshold) {
        onComplete();
      } else {
        setError(t('liveness.failed'));
        setSessionId(null);
        if (!hasReachedLimit) startSession();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'));
      setSessionId(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (hasReachedLimit) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
        <h3 style={{ color: '#0f172a', marginBottom: '8px' }}>{t('common.maxAttemptsReached')}</h3>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', width: '100%' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a', margin: '0 0 6px' }}>
          👤 {t('liveness.title')}
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          {t('liveness.instructions')}
        </p>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '16px',
          color: '#dc2626',
          fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}>
        {isLoading && !sessionId ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #f1f5f9',
              borderTop: '3px solid #0a1a3c',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }} />
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              {t('liveness.creatingSession')}
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : sessionId ? (
          <FaceLivenessDetector
            sessionId={sessionId}
            region={outputs.auth.aws_region}
            displayText={livenessDictionary[lang]}
            onAnalysisComplete={handleAnalysisComplete}
            onError={(err) => {
              console.error('Liveness error:', err);
              setError(t('liveness.failed'));
              setSessionId(null);
              recordAttempt();
            }}
          />
        ) : (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <button
              onClick={startSession}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '10px',
                background: '#0a1a3c',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {t('liveness.tryAgain')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}