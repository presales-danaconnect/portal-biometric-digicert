import { useState, useCallback } from 'react';
import {
  Button,
  Card,
  Flex,
  Heading,
  Text,
  Badge,
  View,
  Divider,
  Loader,
  Image,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { getTenantConfig } from './config/tenantConfig';
import { useTranslation } from './i18n/i18n';
import { AutoCamera } from './components/verification/AutoCamera';
import { callOCRAPI, OCRResponse } from './services/api';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

function App() {
  // Determinar el servicio desde los parámetros de URL
  const urlParams = new URLSearchParams(window.location.search);
  const service = urlParams.get('service') || 'default';
  const tenant = urlParams.get('tenant') || 'demo';
  const { t } = useTranslation();

  // Estados para OCR
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [ocrStep, setOcrStep] = useState<'front' | 'frontFreezed' | 'back' | 'backFreezed' | 'done'>('front');
  const [ocrResult, setOcrResult] = useState<OCRResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados para Compare Faces
  const [dniImage, setDniImage] = useState<string | null>(null);
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [compareStep, setCompareStep] = useState<'dni' | 'dniFreezed' | 'face' | 'faceFreezed' | 'done'>('dni');

  // Callback para OCR
  const handleOCRCapture = useCallback((photo: string) => {
    if (ocrStep === 'front') {
      setFrontImage(photo);
      setOcrStep('frontFreezed');
    } else if (ocrStep === 'back') {
      setBackImage(photo);
      setOcrStep('backFreezed');
    }
  }, [ocrStep]);

  // Callback para Compare Faces
  const handleCompareCapture = useCallback((photo: string) => {
    if (compareStep === 'dni') {
      setDniImage(photo);
      setCompareStep('dniFreezed');
    } else if (compareStep === 'face') {
      setFaceImage(photo);
      setCompareStep('faceFreezed');
    }
  }, [compareStep]);

  // Función para continuar OCR
  const handleContinueOCR = () => {
    if (ocrStep === 'frontFreezed') {
      setOcrStep('back');
    } else if (ocrStep === 'backFreezed') {
      setOcrStep('done');
    }
  };

  // Función para hacer submit a Bedrock (OCR)
  const handleOCROnSubmit = async () => {
    if (!frontImage || !backImage) return;

    setIsProcessing(true);
    try {
      const result = await callOCRAPI(frontImage, backImage);
      if (result.success && result.data) {
        setOcrResult(result);
      } else {
        alert(`${t('common.error')}: ` + (result.error || t('common.unknownError')));
      }
    } catch (error) {
      alert(`${t('ocr.processingError')}: ` + (error instanceof Error ? error.message : t('common.unknownError')));
    } finally {
      setIsProcessing(false);
    }
  };

  // Función para retomar OCR
  const handleRetakeOCR = () => {
    if (ocrStep === 'frontFreezed') {
      setFrontImage(null);
      setOcrStep('front');
    } else if (ocrStep === 'backFreezed') {
      setBackImage(null);
      setOcrStep('back');
    }
  };

  // Función para continuar Compare Faces
  const handleContinueCompare = () => {
    if (compareStep === 'dniFreezed') {
      setCompareStep('face');
    } else if (compareStep === 'faceFreezed') {
      setCompareStep('done');
    }
  };

  // Función para retomar Compare Faces
  const handleRetakeCompare = () => {
    if (compareStep === 'dniFreezed') {
      setDniImage(null);
      setCompareStep('dni');
    } else if (compareStep === 'faceFreezed') {
      setFaceImage(null);
      setCompareStep('face');
    }
  };

  // Renderizar flujo OCR
  const renderOCRFlow = () => {
    const stepMessages = {
      front: t('ocr.steps.front'),
      frontFreezed: t('ocr.steps.frontFreezed'),
      back: t('ocr.steps.back'),
      backFreezed: t('ocr.steps.backFreezed'),
      done: t('ocr.steps.done')
    };

    const currentMessage = stepMessages[ocrStep];
    const showCamera = ocrStep === 'front' || ocrStep === 'back';
    const showImage = ocrStep === 'frontFreezed' || ocrStep === 'backFreezed' || ocrStep === 'done';

    return (
      <Card variation="elevated" padding="xl">
        <Flex direction="column" gap="xl">
          <Flex direction="column" gap="xs">
            <Heading level={2}>📄 {t('ocr.title')}</Heading>
            <Badge size="small" variation="info">
              Tenant: {tenant}
            </Badge>
          </Flex>

          <Divider />

          <Card variation="outlined">
            <Flex direction="column" gap="l" alignItems="center" padding="l">
              {showCamera ? (
                <AutoCamera
                  guideType="rectangle"
                  guideText={currentMessage}
                  maxSeconds={5}
                  onCapture={handleOCRCapture}
                />
              ) : showImage ? (
                <Flex direction="column" gap="l" width="100%">
                  <Heading level={4}>✅ {t('ocr.photoCaptured')}</Heading>

                  <Flex direction="row" gap="l" wrap="wrap" justifyContent="center">
                    {frontImage && (ocrStep === 'frontFreezed' || ocrStep === 'backFreezed' || ocrStep === 'done') && (
                      <Flex direction="column" gap="xs" alignItems="center">
                        <Badge>{t('ocr.frontSide')}</Badge>
                        <Image
                          src={frontImage}
                          alt="Front"
                          width="150px"
                          height="100px"
                          borderRadius="small"
                          objectFit="cover"
                        />
                      </Flex>
                    )}

                    {backImage && (ocrStep === 'backFreezed' || ocrStep === 'done') && (
                      <Flex direction="column" gap="xs" alignItems="center">
                        <Badge>{t('ocr.backSide')}</Badge>
                        <Image
                          src={backImage}
                          alt="Back"
                          width="150px"
                          height="100px"
                          borderRadius="small"
                          objectFit="cover"
                        />
                      </Flex>
                    )}
                  </Flex>

                  {(ocrStep === 'frontFreezed' || ocrStep === 'backFreezed') && (
                    <Flex gap="m" wrap="wrap" justifyContent="center">
                      <Button variation="primary" onClick={handleContinueOCR}>
                        {t('ocr.continue')}
                      </Button>
                      <Button onClick={handleRetakeOCR}>
                        {t('ocr.retake')}
                      </Button>
                    </Flex>
                  )}
                </Flex>
              ) : null}
            </Flex>
          </Card>

          {ocrStep === 'done' && (
            <Flex direction="column" gap="m" alignItems="center" width="100%">
              <Flex gap="m" wrap="wrap" justifyContent="center">
                <Button
                  variation="primary"
                  onClick={handleOCROnSubmit}
                  isDisabled={isProcessing || !frontImage || !backImage}
                >
                  {isProcessing ? (
                    <Flex gap="xs" alignItems="center">
                      <Loader size="small" />
                      <Text>{t('ocr.processing')}</Text>
                    </Flex>
                  ) : (
                    `${t('ocr.submit')}`
                  )}
                </Button>
                <Button
                  variation="warning"
                  onClick={() => {
                    setFrontImage(null);
                    setBackImage(null);
                    setOcrStep('front');
                    setOcrResult(null);
                  }}
                >
                  {t('ocr.startOver')}
                </Button>
              </Flex>

              {ocrResult && ocrResult.data && (
                <Card variation="outlined" width="100%" padding="m">
                  <Heading level={4}>📋 {t('ocr.results')}</Heading>
                  <Divider />
                  <Flex direction="column" gap="xs" marginTop="m">
                    <Text><strong>{t('ocr.documentType')}:</strong> {ocrResult.data.documentInfo.documentType}</Text>
                    <Text><strong>{t('ocr.country')}:</strong> {ocrResult.data.documentInfo.country}</Text>
                    <Text><strong>{t('ocr.documentNumber')}:</strong> {ocrResult.data.documentInfo.documentNumber}</Text>
                    <Text><strong>{t('ocr.names')}:</strong> {ocrResult.data.documentInfo.firstName}</Text>
                    <Text><strong>{t('ocr.lastNames')}:</strong> {ocrResult.data.documentInfo.lastName}</Text>
                    <Text><strong>{t('ocr.birthDate')}:</strong> {ocrResult.data.documentInfo.birthDate}</Text>
                    <Text><strong>{t('ocr.expiration')}:</strong> {ocrResult.data.documentInfo.expirationDate}</Text>
                    {ocrResult.data.documentInfo.gender && <Text><strong>{t('ocr.gender')}:</strong> {ocrResult.data.documentInfo.gender}</Text>}
                    {ocrResult.data.documentInfo.nationality && <Text><strong>{t('ocr.nationality')}:</strong> {ocrResult.data.documentInfo.nationality}</Text>}
                  </Flex>
                </Card>
              )}
            </Flex>
          )}
        </Flex>
      </Card>
    );
  };

  // Renderizar Liveness Check (versión simple)
  const renderLivenessFlow = () => {
    return (
      <Card variation="elevated" padding="xl">
        <Flex direction="column" gap="xl">
          <Flex direction="column" gap="xs">
            <Heading level={2}>👤 {t('liveness.title')}</Heading>
            <Badge size="small" variation="success">
              Tenant: {tenant} | AWS Rekognition
            </Badge>
          </Flex>

          <Divider />

          <Card variation="outlined">
            <Flex direction="column" gap="l" alignItems="center" padding="l">
              <AutoCamera
                guideType="circle"
                guideText={t('liveness.guideText')}
                maxSeconds={3}
              />

              <Button variation="primary" size="large">
                {t('liveness.start')}
              </Button>
            </Flex>
          </Card>
        </Flex>
      </Card>
    );
  };

  // Renderizar Compare Faces
  const renderCompareFacesFlow = () => {
    const stepMessages = {
      dni: t('compareFaces.steps.dni'),
      dniFreezed: t('compareFaces.steps.dniFreezed'),
      face: t('compareFaces.steps.face'),
      faceFreezed: t('compareFaces.steps.faceFreezed'),
      done: t('compareFaces.steps.done')
    };

    const currentMessage = stepMessages[compareStep];
    const showCamera = compareStep === 'dni' || compareStep === 'face';
    const showImage = compareStep === 'dniFreezed' || compareStep === 'faceFreezed' || compareStep === 'done';

    return (
      <Card variation="elevated" padding="xl">
        <Flex direction="column" gap="xl">
          <Flex direction="column" gap="xs">
            <Heading level={2}>🔄 {t('compareFaces.title')}</Heading>
            <Badge size="small" variation="warning">
              Tenant: {tenant} | AWS Rekognition
            </Badge>
          </Flex>

          <Divider />

          <Card variation="outlined">
            <Flex direction="column" gap="l" alignItems="center" padding="l">
              {showCamera ? (
                <AutoCamera
                  guideType={compareStep === 'dni' ? 'rectangle' : 'circle'}
                  guideText={currentMessage}
                  maxSeconds={3}
                  onCapture={handleCompareCapture}
                />
              ) : showImage ? (
                <Flex direction="column" gap="l" width="100%">
                  <Heading level={4}>✅ {t('ocr.photoCaptured')}</Heading>

                  <Flex direction="row" gap="l" wrap="wrap" justifyContent="center">
                    {dniImage && (compareStep === 'dniFreezed' || compareStep === 'faceFreezed' || compareStep === 'done') && (
                      <Flex direction="column" gap="xs" alignItems="center">
                        <Badge variation="info">{t('compareFaces.dniPhoto')}</Badge>
                        <Image
                          src={dniImage}
                          alt="DNI"
                          width="150px"
                          height="100px"
                          borderRadius="small"
                          objectFit="cover"
                        />
                      </Flex>
                    )}

                    {faceImage && (compareStep === 'faceFreezed' || compareStep === 'done') && (
                      <Flex direction="column" gap="xs" alignItems="center">
                        <Badge variation="success">{t('compareFaces.facePhoto')}</Badge>
                        <Image
                          src={faceImage}
                          alt="Face"
                          width="150px"
                          height="150px"
                          borderRadius="small"
                          objectFit="cover"
                        />
                      </Flex>
                    )}
                  </Flex>

                  {(compareStep === 'dniFreezed' || compareStep === 'faceFreezed') && (
                    <Flex gap="m" wrap="wrap" justifyContent="center">
                      <Button variation="primary" onClick={handleContinueCompare}>
                        {t('ocr.continue')}
                      </Button>
                      <Button onClick={handleRetakeCompare}>
                        {t('ocr.retake')}
                      </Button>
                    </Flex>
                  )}
                </Flex>
              ) : null}
            </Flex>
          </Card>

          {compareStep === 'done' && (
            <Flex gap="m" wrap="wrap" justifyContent="center">
              <Button
                variation="primary"
                size="large"
                onClick={() => alert(t('compareFaces.comparingAlert'))}
                isDisabled={!dniImage || !faceImage}
              >
                {t('compareFaces.compare')}
              </Button>
              <Button
                variation="warning"
                onClick={() => {
                  setDniImage(null);
                  setFaceImage(null);
                  setCompareStep('dni');
                }}
              >
                {t('ocr.startOver')}
              </Button>
            </Flex>
          )}
        </Flex>
      </Card>
    );
  };

  // Renderizar servicio seleccionado
  const renderService = () => {
    switch (service) {
      case 'ocr':
        return renderOCRFlow();

      case 'liveness':
        return renderLivenessFlow();

      case 'compare-faces':
        return renderCompareFacesFlow();

      default:
        return (
          <Card variation="elevated" padding="xl">
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
  const tenantConfig = getTenantConfig(tenant);
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
};

export default App;