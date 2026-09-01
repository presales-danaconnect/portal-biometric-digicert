import { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/i18n';
import { processCircuit } from '../../services/biometricApi';

interface DataVerificationProps {
  circuitId: string;
  thresholds: {
    maxAttempts: number;
  };
  onComplete: () => void;
  geolocation?: string | null;
  primaryColor?: string;
}

export function DataVerification({
  circuitId,
  onComplete,
  geolocation,
  primaryColor = '#0f172a',
}: DataVerificationProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'processing' | 'error' | 'max_attempts'>('processing');
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setStatus('processing');
    setError(null);
    try {
      const response = await processCircuit(circuitId, 'data-verification', {}, geolocation || undefined);
      const stepResult = response.stepResult as any;

      if (response.status !== 'failed' && stepResult?.success !== false) {
        onComplete();
      } else if (response.status === 'failed' || stepResult?.errorCode === 'MAX_ATTEMPTS_REACHED') {
        setError(t('common.maxAttemptsReached'));
        setStatus('max_attempts');
      } else {
        const matches = stepResult?.matches || {};
        const failedFields = Object.entries(matches)
          .filter(([, v]) => !v)
          .map(([k]) => k);
        setError(
          failedFields.length > 0
            ? `${t('dataVerification.mismatch') || 'Data mismatch'}: ${failedFields.join(', ')}`
            : t('dataVerification.failed') || 'Data verification failed.'
        );
        setStatus('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'));
      setStatus('error');
    }
  };

  useEffect(() => {
    handleVerify();
  }, []);

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
          <span>📋</span>
          <span>{t('dataVerification.title') || 'Data Verification'}</span>
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
        overflow: 'hidden',
      }}>
        {status === 'processing' ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '3px solid #f1f5f9',
              borderTopColor: primaryColor,
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }} />
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              {t('dataVerification.processing') || 'Verifying data...'}
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : status === 'max_attempts' ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
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
        ) : (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
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
                background: primaryColor,
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {t('dataVerification.retry') || 'Try Again'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}