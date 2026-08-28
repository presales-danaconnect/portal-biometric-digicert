import { useState, useCallback } from 'react';
import { useTranslation } from '../../i18n/i18n';
import { useAttemptTracker } from '../../hooks/useAttemptTracker';
import { getUploadUrl, uploadToS3, processCircuit } from '../../services/biometricApi';
import { AutoCamera } from './AutoCamera';

interface OCRVerificationProps {
  circuitId: string;
  thresholds: {
    ocrConfidenceThreshold: number;
    maxAttempts: number;
    requiresBackDocument: boolean;
  };
  onComplete: () => void;
  geolocation?: string | null;
  primaryColor?: string;
}

type OcrStep = 'front' | 'frontPreview' | 'back' | 'backPreview' | 'processing' | 'done';

export function OCRVerification({
  circuitId,
  thresholds,
  onComplete,
  geolocation,
  primaryColor = '#0a1a3c',
}: OCRVerificationProps) {
  const { t } = useTranslation();
  const { recordAttempt, hasReachedLimit } = useAttemptTracker(circuitId, 'ocr', thresholds.maxAttempts);
  const [step, setStep] = useState<OcrStep>('front');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = useCallback((photo: string) => {
    if (step === 'front') {
      setFrontImage(photo);
      setStep('frontPreview');
    } else if (step === 'back') {
      setBackImage(photo);
      setStep('backPreview');
    }
  }, [step]);

  const handleRetake = () => {
    if (step === 'frontPreview') {
      setFrontImage(null);
      setStep('front');
    } else if (step === 'backPreview') {
      setBackImage(null);
      setStep('back');
    }
  };

  const handleContinue = async () => {
    if (step === 'frontPreview' && thresholds.requiresBackDocument) {
      setStep('back');
      return;
    }
    setStep('processing');
    setError(null);
    try {
      if (frontImage) {
        const frontFile = await fetch(frontImage).then(r => r.blob()).then(b => new File([b], 'front.jpg', { type: 'image/jpeg' }));
        const { uploadUrl } = await getUploadUrl(circuitId, 'front');
        await uploadToS3(uploadUrl, frontFile);
      }
      if (thresholds.requiresBackDocument && backImage) {
        const backFile = await fetch(backImage).then(r => r.blob()).then(b => new File([b], 'back.jpg', { type: 'image/jpeg' }));
        const { uploadUrl } = await getUploadUrl(circuitId, 'back');
        await uploadToS3(uploadUrl, backFile);
      }
      const result = await processCircuit(circuitId, 'ocr', {}, geolocation || undefined);
      recordAttempt();
      if (result.status !== 'failed') {
        onComplete();
      } else {
        setError(t('ocr.notADocument'));
        setStep('front');
        setFrontImage(null);
        setBackImage(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.unknownError'));
      setStep('front');
      setFrontImage(null);
      setBackImage(null);
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
          📄 {t('ocr.title')}
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          {t('ocr.instructions')}
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
        {(step === 'front' || step === 'back') && (
          <>
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{
                backgroundColor: primaryColor,
                color: '#fff',
                fontSize: '11px',
                fontWeight: 500,
                padding: '3px 10px',
                borderRadius: '20px',
              }}>
                {step === 'front' ? t('ocr.frontSide') : t('ocr.backSide')}
              </span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                {step === 'front' ? t('ocr.captureFront') : t('ocr.captureBack')}
              </span>
            </div>
            <AutoCamera
              onCapture={handleCapture}
              guideType="rectangle"
              primaryColor={primaryColor}
            />
          </>
        )}

        {(step === 'frontPreview' || step === 'backPreview') && (
          <div style={{ padding: '20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}>
              <span style={{ color: '#16a34a', fontSize: '18px' }}>✓</span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>
                {t('ocr.photoCaptured')}
              </span>
              <span style={{
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '20px',
                marginLeft: 'auto',
              }}>
                {step === 'frontPreview' ? t('ocr.frontSide') : t('ocr.backSide')}
              </span>
            </div>

            <img
              src={step === 'frontPreview' ? frontImage! : backImage!}
              alt="Document"
              style={{
                width: '100%',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                marginBottom: '16px',
              }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleRetake}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  background: '#fff',
                  color: '#64748b',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {t('common.retake')}
              </button>
              <button
                onClick={handleContinue}
                style={{
                  flex: 2,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '10px',
                  background: primaryColor,
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {thresholds.requiresBackDocument && step === 'frontPreview'
                  ? t('common.continue')
                  : t('ocr.submit')}
              </button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: `3px solid #f1f5f9`,
              borderTop: `3px solid ${primaryColor}`,
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }} />
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              {t('ocr.processing')}
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
      </div>
    </div>
  );
}