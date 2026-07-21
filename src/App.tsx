import {
  Button,
  Card,
  Flex,
  Heading,
  Text,
  Badge,
  View,
  Divider,
  ThemeProvider,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { getTenantConfig } from './config/tenantConfig';
import { useTranslation } from './i18n/i18n';
import { useGeolocation } from './hooks/useGeolocation';
import { OCRVerification } from './components/verification/OCRVerification';
import { LivenessCheck } from './components/verification/LivenessCheck';
import { CompareFacesVerification } from './components/verification/CompareFacesVerification';
import { DataVerification } from './components/verification/DataVerification';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const service = urlParams.get('service') || 'default';
  const tenant = urlParams.get('tenant') || 'demo';
  const docRef = urlParams.get('docRef');
  const reference = urlParams.get('reference');
  const { t } = useTranslation();
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
        return (
          <Card variation="elevated" padding="xl" width="100%">
            <Flex direction="column" gap="xl" alignItems="center">
              <Flex direction="column" gap="xs" alignItems="center">
                <Heading level={2}>🔐 {t('home.title')}</Heading>
                <Badge variation="info">
                  {t('home.subtitle')}
                </Badge>
              </Flex>

              <Divider />

              <Flex direction="column" gap="m" width="100%" maxWidth="400px">
                <Button variation="primary" size="large" as="a" href="/verify?service=ocr&tenant=demo">
                  <Flex direction="column" alignItems="flex-start" gap="xs">
                    <Text fontWeight="bold">📄 {t('home.ocrCard')}</Text>
                    <Text fontSize="small">{t('home.ocrDesc')}</Text>
                  </Flex>
                </Button>

                <Button variation="primary" size="large" as="a" href="/verify?service=liveness&tenant=demo">
                  <Flex direction="column" alignItems="flex-start" gap="xs">
                    <Text fontWeight="bold">👤 {t('home.livenessCard')}</Text>
                    <Text fontSize="small">{t('home.livenessDesc')}</Text>
                  </Flex>
                </Button>

                <Button variation="primary" size="large" as="a" href="/verify?service=compare-faces&tenant=demo">
                  <Flex direction="column" alignItems="flex-start" gap="xs">
                    <Text fontWeight="bold">🔄 {t('home.compareCard')}</Text>
                    <Text fontSize="small">{t('home.compareDesc')}</Text>
                  </Flex>
                </Button>

                <Button variation="primary" size="large" as="a" href="/verify?service=data-verification&tenant=demo&docRef=22641375">
                  <Flex direction="column" alignItems="flex-start" gap="xs">
                    <Text fontWeight="bold">🔎 {t('home.dataVerificationCard')}</Text>
                    <Text fontSize="small">{t('home.dataVerificationDesc')}</Text>
                  </Flex>
                </Button>
              </Flex>
            </Flex>
          </Card>
        );
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
