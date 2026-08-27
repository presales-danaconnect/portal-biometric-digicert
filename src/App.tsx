import { useState, useEffect } from 'react';
import {
  Flex,
  View,
  ThemeProvider,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { getConfig, CircuitConfig } from './services/biometricApi';
import { OCRVerification } from './components/verification/OCRVerification';
import { LivenessCheck } from './components/verification/LivenessCheck';
import { CompareFacesVerification } from './components/verification/CompareFacesVerification';
import { DataVerification } from './components/verification/DataVerification';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const circuitId = urlParams.get('circuit');

  const [config, setConfig] = useState<CircuitConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!circuitId) {
      setError('Circuito no válido. Por favor verifica el enlace.');
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
        setError('No se pudo cargar la verificación. El enlace puede haber expirado.');
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

  if (loading) {
    return (
      <View minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
        <p>Cargando...</p>
      </View>
    );
  }

  if (error || !config || !circuitId) {
    return (
      <View minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
        <p>{error || 'Enlace no válido'}</p>
      </View>
    );
  }

  const theme = {
    name: 'tenant-theme',
    tokens: {
      colors: {
        brand: {
          primary: {
            10: { value: config.ui.colors.primary },
            20: { value: config.ui.colors.primary },
            40: { value: config.ui.colors.primary },
            60: { value: config.ui.colors.primary },
            80: { value: config.ui.colors.primary },
            90: { value: config.ui.colors.primary },
            100: { value: config.ui.colors.primary },
          },
        },
        components: {
          button: {
            primary: {
              backgroundColor: { value: config.ui.colors.primary },
              _hover: { backgroundColor: { value: config.ui.colors.primary } },
              _focus: { backgroundColor: { value: config.ui.colors.primary } },
              _active: { backgroundColor: { value: config.ui.colors.primary } },
            },
          },
          loader: {
            strokeFilled: { value: config.ui.colors.primary },
            linear: { strokeFilled: { value: config.ui.colors.primary } },
          },
        },
      },
    },
  };

  const currentStep = config.steps[currentStepIndex];

  const renderStep = () => {
    if (completed) {
      return (
        <View textAlign="center" padding="xl">
          <h2>✅ Verificación completada</h2>
          <p>Tu identidad ha sido verificada exitosamente.</p>
        </View>
      );
    }

    switch (currentStep) {
      case 'liveness':
        return (
          <LivenessCheck
            circuitId={circuitId}
            thresholds={config.thresholds}
            onComplete={handleStepComplete}
          />
        );
      case 'ocr':
        return (
          <OCRVerification
            circuitId={circuitId}
            thresholds={config.thresholds}
            onComplete={handleStepComplete}
          />
        );
      case 'compare-faces':
        return (
          <CompareFacesVerification
            circuitId={circuitId}
            thresholds={config.thresholds}
            onComplete={handleStepComplete}
          />
        );
      case 'data-verification':
        return (
          <DataVerification
            circuitId={circuitId}
            thresholds={config.thresholds}
            onComplete={handleStepComplete}
          />
        );
      default:
        return <p>Step no reconocido: {currentStep}</p>;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <View backgroundColor={config.ui.colors.background} minHeight="100vh">
        <Flex direction="column" minHeight="100vh">
          <Header
            title={config.ui.headerTitle}
            logoUrl={config.ui.headerLogoUrl}
            backgroundColor={config.ui.colors.headerBackground}
            fontColor={config.ui.colors.headerFontColor}
            align={config.ui.layout.headerAlign}
          />
          <Flex
            maxWidth="800px"
            margin="0 auto"
            width="100%"
            padding={{ base: 'm', large: 'xl' }}
            flex="1"
          >
            {renderStep()}
          </Flex>
          <Footer
            privacyPolicyUrl={config.ui.footerPrivacyPolicyUrl}
            websiteUrl={config.ui.footerWebsiteUrl}
            backgroundColor={config.ui.colors.footerBackground}
            fontColor={config.ui.colors.footerFontColor}
            align={config.ui.layout.footerAlign}
          />
        </Flex>
      </View>
    </ThemeProvider>
  );
}

export default App;
