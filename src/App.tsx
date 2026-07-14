import {
  Button,
  Card,
  Flex,
  Heading,
  Text,
  Badge,
  View,
  Divider,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { getTenantConfig } from './config/tenantConfig';
import { useTranslation } from './i18n/i18n';
import { useGeolocation } from './hooks/useGeolocation';
import { OCRVerification } from './components/verification/OCRVerification';
import { LivenessCheck } from './components/verification/LivenessCheck';
import { CompareFacesVerification } from './components/verification/CompareFacesVerification';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

function App() {
  // Determinar el servicio desde los parámetros de URL
  const urlParams = new URLSearchParams(window.location.search);
  const service = urlParams.get('service') || 'default';
  const tenant = urlParams.get('tenant') || 'demo';
  const { t } = useTranslation();
  const tenantConfig = getTenantConfig(tenant);
  const geolocation = useGeolocation();

  // Renderizar servicio seleccionado
  const renderService = () => {
    switch (service) {
      case 'ocr':
        return <OCRVerification tenant={tenant} webhookUrl={tenantConfig.webhookUrl} geolocation={geolocation} />;

      case 'liveness':
        return <LivenessCheck tenant={tenant} webhookUrl={tenantConfig.webhookUrl} geolocation={geolocation} />;

      case 'compare-faces':
        return <CompareFacesVerification tenant={tenant} webhookUrl={tenantConfig.webhookUrl} geolocation={geolocation} />;

      default:
        return (
          <Card variation="elevated" padding="xl" width="100%">
            <Flex direction="column" gap="xl" alignItems="center">
              <Flex direction="column" gap="xs" alignItems="center">
                <Heading level={2}>🔐 {t('home.title')}</Heading>
                <Badge size="small" variation="info">
                  AWS Amplify + AI Services
                </Badge>
              </Flex>

              <Divider />

              <Text textAlign="center" variation="primary">
                {t('home.subtitle')}
              </Text>

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
              </Flex>
            </Flex>
          </Card>
        );
    }
  };

  return (
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
  );
}

export default App;
