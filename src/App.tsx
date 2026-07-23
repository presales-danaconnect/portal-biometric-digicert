import {
  Flex,
  View,
  ThemeProvider,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { getTenantConfig } from './config/tenantConfig';
import { useGeolocation } from './hooks/useGeolocation';
import { OCRVerification } from './components/verification/OCRVerification';
import { LivenessCheck } from './components/verification/LivenessCheck';
import { CompareFacesVerification } from './components/verification/CompareFacesVerification';
import { DataVerification } from './components/verification/DataVerification';
import { ProductLanding } from './components/marketing/ProductLanding';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const service = urlParams.get('service');

  // The root path (and any /verify request with no ?service=) is the
  // marketing landing page, with its own standalone design — decoupled
  // from the tenant-themed verification flows below. No router library
  // is used here; everything is driven by ?service= at /verify.
  if (!service) {
    return <ProductLanding />;
  }

  const tenant = urlParams.get('tenant') || 'demo';
  const docRef = urlParams.get('docRef');
  const reference = urlParams.get('reference');
  const tenantConfig = getTenantConfig(tenant);
  const geolocation = useGeolocation();

  const theme = {
    name: 'tenant-theme',
    tokens: {
      colors: {
        brand: {
          primary: {
            10: { value: tenantConfig.colors.primary },
            20: { value: tenantConfig.colors.primary },
            40: { value: tenantConfig.colors.primary },
            60: { value: tenantConfig.colors.primary },
            80: { value: tenantConfig.colors.primary },
            90: { value: tenantConfig.colors.primary },
            100: { value: tenantConfig.colors.primary },
          },
        },
      },
      components: {
        button: {
          primary: {
            backgroundColor: { value: tenantConfig.colors.primary },
            _hover: {
              backgroundColor: { value: tenantConfig.colors.primary },
            },
            _focus: {
              backgroundColor: { value: tenantConfig.colors.primary },
            },
            _active: {
              backgroundColor: { value: tenantConfig.colors.primary },
            },
          },
        },
        loader: {
          strokeFilled: { value: tenantConfig.colors.primary },
          linear: {
            strokeFilled: { value: tenantConfig.colors.primary },
          },
        },
      },
    },
  };

  const renderService = () => {
    switch (service) {
      case 'ocr':
        return <OCRVerification
          tenant={tenant}
          webhookUrl={tenantConfig.webhookUrl}
          geolocation={geolocation}
          requiresBack={tenantConfig.requiresBackDocument}
          reference={reference}
          confidenceThreshold={tenantConfig.ocrConfidenceThreshold}
          maxAttempts={tenantConfig.maxVerificationAttempts}
        />;

      case 'liveness':
        return (
          <LivenessCheck
            tenant={tenant}
            webhookUrl={tenantConfig.webhookUrl}
            geolocation={geolocation}
            confidenceThreshold={tenantConfig.livenessConfidenceThreshold}
            reference={reference}
            maxAttempts={tenantConfig.maxVerificationAttempts}
          />
        );
      case 'compare-faces':
        return (
          <CompareFacesVerification
            tenant={tenant}
            webhookUrl={tenantConfig.webhookUrl}
            geolocation={geolocation}
            similarityThreshold={tenantConfig.compareFacesSimilarityThreshold}
            reference={reference}
            maxAttempts={tenantConfig.maxVerificationAttempts}
          />
        );
      case 'data-verification':
        return (
          <DataVerification
            tenant={tenant}
            webhookUrl={tenantConfig.webhookUrl}
            geolocation={geolocation}
            dataVerificationApiUrl={tenantConfig.dataVerificationApiUrl}
            docRef={docRef}
            requiresBack={tenantConfig.requiresBackDocument}
            reference={reference}
            maxAttempts={tenantConfig.maxVerificationAttempts}
          />
        );
      default:
        // Unrecognized ?service= value — send them back to the landing
        // rather than showing a broken or empty page.
        return <ProductLanding />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <View backgroundColor="background.primary" minHeight="100vh">
        <Flex direction="column" minHeight="100vh">
          <Header
            title={tenantConfig.headerTitle}
            logoUrl={tenantConfig.headerLogoUrl}
            backgroundColor={tenantConfig.colors.headerBackground}
            fontColor={tenantConfig.colors.headerFontColor}
            align={tenantConfig.layout.headerAlign}
          />

          <Flex
            maxWidth="800px"
            margin="0 auto"
            width="100%"
            padding={{ base: 'm', large: 'xl' }}
            flex="1"
          >
            {renderService()}
          </Flex>

          <Footer
            privacyPolicyUrl={tenantConfig.footerPrivacyPolicyUrl}
            websiteUrl={tenantConfig.footerWebsiteUrl}
            backgroundColor={tenantConfig.colors.footerBackground}
            fontColor={tenantConfig.colors.footerFontColor}
            align={tenantConfig.layout.footerAlign}
          />
        </Flex>
      </View>
    </ThemeProvider>
  );
}

export default App;
