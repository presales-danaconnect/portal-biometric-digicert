import { useState, useEffect } from 'react';
import { ThemeProvider } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { getConfig, CircuitConfig } from './services/biometricApi';
import { useGeolocation } from './hooks/useGeolocation';
import { useTranslation } from './i18n/i18n';
import { OCRVerification } from './components/verification/OCRVerification';
import { LivenessCheck } from './components/verification/LivenessCheck';
import { CompareFacesVerification } from './components/verification/CompareFacesVerification';
import { DataVerification } from './components/verification/DataVerification';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import { createTenantTheme } from './theme';

const containerStyle: React.CSSProperties = {
  maxWidth: '640px',
  margin: '0 auto',
  width: '100%',
  padding: '24px 16px',
};

const livenessContainerStyle: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  width: '100%',
  padding: '24px 16px',
};

function App() {
  const { t } = useTranslation();
  const geolocation = useGeolocation();
  const urlParams = new URLSearchParams(window.location.search);
  const circuitId = urlParams.get('circuit');
  const wamid = urlParams.get('wamid') || undefined;
  const [config, setConfig] = useState<CircuitConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!circuitId) {
      setError(t('circuit.invalid'));
      setLoading(false);
      return;
    }
    getConfig(circuitId)
      .then((data) => {
        setConfig(data);
        if (data.stepsCompleted?.length > 0) {
          setCurrentStepIndex(data.stepsCompleted.length);
        }
        if (data.status === 'completed' || data.status === 'failed') {
          setCompleted(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(t('circuit.error'));
        setLoading(false);
      });
  }, [circuitId]);

  const handleStepComplete = () => {
    if (!config) return;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= config.steps.length) {
      setCompleted(true);
    } else {
      setCurrentStepIndex(nextIndex);
    }
  };
  const handleStepRetry = (retryStep: string) => {
    const retryIndex = config?.steps.indexOf(retryStep) ?? -1;
    if (retryIndex >= 0) {
      setCurrentStepIndex(retryIndex);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        backgroundColor: '#f8fafc',
      }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          border: '4px solid #e2e8f0',
          borderTopColor: '#0a1a3c',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
          {t('circuit.loading')}
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !config || !circuitId) {
    const isCompleted = error?.includes('completed') || error?.includes('completada');
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '48px 40px',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            backgroundColor: isCompleted ? '#f0fdf4' : '#fff7ed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 28px',
            fontSize: '32px',
          }}>
            {isCompleted ? '✅' : !circuitId ? '🔗' : '⚠️'}
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>
            {isCompleted ? t('circuit.expired') : !circuitId ? t('circuit.invalid') : t('circuit.error')}
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
            {t('circuit.contactSupport')}
          </p>
        </div>
      </div>
    );
  }

  const theme = createTenantTheme({
    primary: config.ui.colors.primary,
    background: config.ui.colors.background,
  });

  const currentStep = config.steps[currentStepIndex];
  const isLiveness = currentStep === 'liveness' && !completed;

  const renderStep = () => {
    if (completed) {
      return (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: '#f0fdf4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '32px',
          }}>✅</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            {t('circuit.completed') || 'Verification Complete'}
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            {t('circuit.completedMessage') || 'Your identity has been verified successfully.'}
          </p>
        </div>
      );
    }

    switch (currentStep) {
      case 'liveness':
        return (
          <LivenessCheck
            circuitId={circuitId}
            thresholds={config.thresholds}
            onComplete={handleStepComplete}
            geolocation={geolocation}
            primaryColor={config.ui.colors.primary}
            wamid={wamid}
          />
        );
      case 'ocr':
        return (
          <OCRVerification
            circuitId={circuitId}
            thresholds={config.thresholds}
            onComplete={handleStepComplete}
            geolocation={geolocation}
            primaryColor={config.ui.colors.primary}
            wamid={wamid}
          />
        );
      case 'compare-faces':
        return (
          <CompareFacesVerification
            circuitId={circuitId}
            thresholds={config.thresholds}
            onComplete={handleStepComplete}
            onRetry={handleStepRetry}
            geolocation={geolocation}
            primaryColor={config.ui.colors.primary}
            wamid={wamid}
          />
        );
      case 'data-verification':
        return (
          <DataVerification
            circuitId={circuitId}
            thresholds={config.thresholds}
            onComplete={handleStepComplete}
            onRetry={handleStepRetry}
            geolocation={geolocation}
            primaryColor={config.ui.colors.primary}
            wamid={wamid}
          />
        );
      default:
        return <p>Unknown step: {currentStep}</p>;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: config.ui.colors.background,
      }}>
        <Header
          title={config.ui.headerTitle}
          logoUrl={config.ui.headerLogoUrl}
          backgroundColor={config.ui.colors.headerBackground}
          fontColor={config.ui.colors.headerFontColor}
          align={config.ui.layout.headerAlign as 'left' | 'right' | 'center'}
          primaryColor={config.ui.colors.primary}
        />

        <main style={isLiveness ? { ...livenessContainerStyle, flex: 1 } : { flex: 1, ...containerStyle }}>
          {renderStep()}
        </main>
        <Footer
          privacyPolicyUrl={config.ui.footerPrivacyPolicyUrl}
          websiteUrl={config.ui.footerWebsiteUrl}
          backgroundColor={config.ui.colors.footerBackground}
          fontColor={config.ui.colors.footerFontColor}
          align={config.ui.layout.footerAlign as 'left' | 'right' | 'center'}
        />
      </div>
    </ThemeProvider>
  );
}

export default App;