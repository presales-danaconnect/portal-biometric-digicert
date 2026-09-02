import { useState, useEffect, useCallback } from 'react';
import { FaceLivenessDetector } from '@aws-amplify/ui-react-liveness';
import { ThemeProvider } from '@aws-amplify/ui-react';
import { createLivenessSession, submitLivenessResult } from '../../services/liveness';
import { useTranslation } from '../../i18n/i18n';
import { livenessDictionary } from '../../i18n/livenessDictionary';
import { useAttemptTracker } from '../../hooks/useAttemptTracker';
import { createTenantTheme } from '../../theme';
import outputs from '../../../amplify_outputs.json';

interface LivenessCheckProps {
  circuitId: string;
  thresholds: {
    livenessConfidenceThreshold: number;
    maxAttempts: number;
  };
  onComplete: () => void;
  geolocation?: string | null;
  primaryColor?: string;
  wamid?: string;
}

export function LivenessCheck({
  circuitId,
  thresholds,
  onComplete,
  geolocation,
  primaryColor,
  wamid,
}: LivenessCheckProps) {
  const { t, lang } = useTranslation();
  const { recordAttempt, hasReachedLimit, attemptsUsed } = useAttemptTracker(
    circuitId,
    'liveness',
    thresholds.maxAttempts
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const theme = createTenantTheme({
    primary: primaryColor || '#0f172a',
    background: '#ffffff',
  });

  const fetchSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSessionId(null);
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
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!hasReachedLimit) {
      fetchSession();
    }
  }, []);

  const handleAnalysisComplete = async () => {
    if (!sessionId) return;
    try {
      const response = await submitLivenessResult(circuitId, sessionId, geolocation, wamid);
      recordAttempt();
      if (response.success) {
        onComplete();
      } else {
        setError(t('liveness.failed'));
        setSessionId(null);
        if (attemptsUsed + 1 < thresholds.maxAttempts) {
          setTimeout(async () => {
            await fetchSession();
          }, 2000);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'));
      setSessionId(null);
      if (attemptsUsed + 1 < thresholds.maxAttempts) {
        await fetchSession();
      }
    }
  };

  const handleUserCancel = () => {
    setError(t('liveness.cancelled'));
    recordAttempt();
    setSessionId(null);
    if (attemptsUsed + 1 < thresholds.maxAttempts) {
      setTimeout(async () => {
        await fetchSession();
      }, 2000);
    }
  };

  const handleError = async (err: { state: string; error?: Error }) => {
    console.warn('Liveness error:', err.state, err?.error?.message);
    const state = err?.state;
    let shouldCountAttempt = false;
    let delay = 0;

    switch (state) {
      case 'FACE_DISTANCE_ERROR':
        setError(t('liveness.faceDistanceError'));
        shouldCountAttempt = true;
        break;
      case 'MULTIPLE_FACES_ERROR':
        setError(t('liveness.multipleFacesError'));
        shouldCountAttempt = true;
        break;
      case 'FRESHNESS_TIMEOUT':
      case 'TIMEOUT':
        setError(t('liveness.timeout'));
        shouldCountAttempt = true;
        break;
      case 'MOBILE_LANDSCAPE_ERROR':
        setError(t('liveness.landscapeError'));
        delay = 3000;
        break;
      case 'CAMERA_ACCESS_ERROR':
        setError(t('liveness.cameraError'));
        delay = 3000;
        break;
      case 'CAMERA_FRAMERATE_ERROR':
        setError(t('liveness.cameraFramerateError'));
        shouldCountAttempt = true;
        break;
      case 'SERVER_ERROR':
      case 'RUNTIME_ERROR':
      case 'CONNECTION_TIMEOUT':
        setError(null);
        break;
      default:
        setError(t('liveness.failed'));
        shouldCountAttempt = true;
    }

    if (shouldCountAttempt) {
      recordAttempt();
    }

    setSessionId(null);

    const newAttemptsUsed = shouldCountAttempt ? attemptsUsed + 1 : attemptsUsed;
    if (newAttemptsUsed < thresholds.maxAttempts) {
      setTimeout(async () => {
        await fetchSession();
      }, delay);
    }
  };

  if (hasReachedLimit) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '48px 24px',
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
        <p style={{ fontWeight: 600, color: '#0f172a', fontSize: '16px' }}>
          {t('common.maxAttemptsReached')}
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 600,
          color: '#0f172a',
          margin: '0 0 6px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>👤</span>
          <span>{t('liveness.title')}</span>
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
        backgroundColor: '#eff3f9',
        borderRadius: '16px',
        border: '1px solid #eff3f9',
        boxShadow: '0 1px 3px #dadde2',
        paddingBottom: '16px',
      }}>
        <ThemeProvider theme={theme}>
          {loading ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '3px solid #f1f5f9',
                borderTopColor: primaryColor || '#0f172a',
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
              key={sessionId}
              sessionId={sessionId}
              region={outputs.auth.aws_region}
              displayText={livenessDictionary[lang]}
              onAnalysisComplete={handleAnalysisComplete}
              onUserCancel={handleUserCancel}
              onError={handleError}
            />
          ) : (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <button
                onClick={fetchSession}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '10px',
                  background: primaryColor || '#0f172a',
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
        </ThemeProvider>
      </div>
    </>
  );
}