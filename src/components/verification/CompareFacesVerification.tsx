import { useState } from 'react';
import { useTranslation } from '../../i18n/i18n';
import { useAttemptTracker } from '../../hooks/useAttemptTracker';
import { processCircuit } from '../../services/biometricApi';

interface CompareFacesVerificationProps {
  circuitId: string;
  thresholds: {
    compareFacesSimilarityThreshold: number;
    maxAttempts: number;
  };
  onComplete: () => void;
  geolocation?: string | null;
}

export function CompareFacesVerification({
  circuitId,
  thresholds,
  onComplete,
  geolocation,
}: CompareFacesVerificationProps) {
  const { t } = useTranslation();
  const { recordAttempt, hasReachedLimit } = useAttemptTracker(circuitId, 'compare-faces', thresholds.maxAttempts);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await processCircuit(circuitId, 'compare-faces', {}, geolocation || undefined);
      recordAttempt();
      if (result.status !== 'failed') {
        onComplete();
      } else {
        setError(t('compareFaces.failed') || 'Face comparison failed. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'));
    } finally {
      setIsProcessing(false);
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
          🔍 {t('compareFaces.title') || 'Face Comparison'}
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          {t('compareFaces.instructions') || 'Comparing your face with the document photo.'}
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
        padding: '32px 24px',
        textAlign: 'center',
      }}>
        {isProcessing ? (
          <>
            <div style={{
              width: '48px',
              height: '48px',
              border: '3px solid #f1f5f9',
              borderTop: '3px solid #0a1a3c',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }} />
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              {t('compareFaces.processing') || 'Comparing faces...'}
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
              {t('compareFaces.ready') || 'Ready to compare your face with the document.'}
            </p>
            <button
              onClick={handleCompare}
              style={{
                padding: '12px 32px',
                border: 'none',
                borderRadius: '10px',
                background: '#0a1a3c',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {t('compareFaces.start') || 'Compare Now'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}