import { useState } from 'react';
import { useTranslation } from '../../i18n/i18n';
import { useAttemptTracker } from '../../hooks/useAttemptTracker';
import { processCircuit } from '../../services/biometricApi';

interface DataVerificationProps {
  circuitId: string;
  thresholds: {
    maxAttempts: number;
  };
  onComplete: () => void;
  geolocation?: string | null;
}

export function DataVerification({
  circuitId,
  thresholds,
  onComplete,
  geolocation,
}: DataVerificationProps) {
  const { t } = useTranslation();
  const { recordAttempt, hasReachedLimit } = useAttemptTracker(circuitId, 'data-verification', thresholds.maxAttempts);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ matches: Record<string, boolean> } | null>(null);

  const handleVerify = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const response = await processCircuit(circuitId, 'data-verification', {}, geolocation || undefined);
      recordAttempt();
      if (response.status !== 'failed') {
        setResult((response.stepResult as any)?.matches || {});
        onComplete();
      } else {
        setError(t('dataVerification.failed') || 'Data verification failed. Please try again.');
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
          ✅ {t('dataVerification.title') || 'Data Verification'}
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          {t('dataVerification.instructions') || 'Verifying your document data matches your information.'}
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
              {t('dataVerification.processing') || 'Verifying data...'}
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        ) : result ? (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <p style={{ color: '#16a34a', fontSize: '14px' }}>
              {t('dataVerification.success') || 'Data verified successfully.'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
              {t('dataVerification.ready') || 'Ready to verify your document data.'}
            </p>
            <button
              onClick={handleVerify}
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
              {t('dataVerification.start') || 'Verify Data'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}