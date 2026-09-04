import { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/i18n';
import { processCircuit } from '../../services/biometricApi';

interface CompareFacesVerificationProps {
  circuitId: string;
  thresholds: {
    compareFacesSimilarityThreshold: number;
    maxAttempts: number;
  };
  onComplete: () => void;
  onRetry?: (step: string) => void;
  geolocation?: string | null;
  primaryColor?: string;
  wamid?: string;
}

export function CompareFacesVerification({
  circuitId,
  onComplete,
  onRetry,
  geolocation,
  primaryColor = '#0f172a',
  wamid,
}: CompareFacesVerificationProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'processing' | 'error' | 'retry_ocr' | 'max_attempts'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    setStatus('processing');
    setError(null);
    try {
      const result = await processCircuit(circuitId, 'compare-faces', {}, geolocation || undefined, wamid);
      const errorCode = (result.stepResult as any)?.errorCode;
      const similarity = (result.stepResult as any)?.similarity || 0;

      if (result.status !== 'failed' && (result.stepResult as any)?.success) {
        onComplete();
      } else if (errorCode === 'MAX_ATTEMPTS_REACHED') {
        setError(t('common.maxAttemptsReached'));
        setStatus('max_attempts');
      } else if (errorCode === 'NO_FACE_IN_IMAGE') {
        setError(t('compareFaces.noFaceDetected'));
        setStatus('retry_ocr');
      } else if (similarity > 0) {
        setError(`${t('compareFaces.lowSimilarity')} (${similarity}%)`);
        setStatus('retry_ocr');
      } else {
        setError(t('compareFaces.failed'));
        setStatus('retry_ocr');
      }
    } catch (err) {
      const response = (err as any)?.response;
      const errorCode = response?.stepResult?.errorCode || response?.errorCode;
      console.log('process_circuit error response:', JSON.stringify(response));
  console.log('process_circuit error:', err);
      if (errorCode === 'NO_FACE_IN_IMAGE') {
        setError(t('compareFaces.noFaceDetected'));
        setStatus('retry_ocr');
      } else if (errorCode === 'MAX_ATTEMPTS_REACHED') {
        setError(t('common.maxAttemptsReached'));
        setStatus('max_attempts');
      } else {
        setError(err instanceof Error ? err.message : t('common.unknownError'));
        setStatus('error');
      }
    }
  };

  useEffect(() => {
    handleCompare();
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
          <span>🔍</span>
          <span>{t('compareFaces.title') || 'Face Comparison'}</span>
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
              {t('compareFaces.processing') || 'Comparing faces...'}
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
        ) : status === 'retry_ocr' ? (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
              {t('compareFaces.retakeDocumentHint') || 'Please retake the document photo ensuring your face is clearly visible.'}
            </p>
            <button
              onClick={() => onRetry?.('ocr')}
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
              {t('compareFaces.retakeDocument') || 'Retake Document Photo'}
            </button>
          </div>
        ) : status === 'error' ? (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
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
                background: primaryColor,
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {t('compareFaces.retry') || 'Try Again'}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}