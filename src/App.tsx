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
  ToggleButtonGroup,
  ToggleButton,
  Image,
} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { AutoCamera } from './components/verification/AutoCamera';
import { callOCRAPI, OCRResponse } from './services/api';

function App() {
  // Determinar el servicio desde los parámetros de URL
  const urlParams = new URLSearchParams(window.location.search);
  const service = urlParams.get('service') || 'default';
  const tenant = urlParams.get('tenant') || 'demo';

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
        alert('Error: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error processing document: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
      front: 'Position DNI front side',
      frontFreezed: 'Front side captured',
      back: 'Position DNI back side', 
      backFreezed: 'Back side captured',
      done: 'Ready for OCR processing'
    };

    const currentMessage = stepMessages[ocrStep];
    const showCamera = ocrStep === 'front' || ocrStep === 'back';
    const showImage = ocrStep === 'frontFreezed' || ocrStep === 'backFreezed' || ocrStep === 'done';

    return (
      <Card variation="elevated" padding="xl">
        <Flex direction="column" gap="xl">
          <Flex direction="column" gap="xs">
            <Heading level={2}>📄 Document OCR Verification</Heading>
            <Badge size="small" variation="info">
              Tenant: {tenant} | Auto Camera
            </Badge>
          </Flex>
          
          <Divider />
          
          <Card variation="outlined">
            <Flex direction="column" gap="l" alignItems="center" padding="l">
              {showCamera ? (
                <AutoCamera
                  guideType="rectangle"
                  guideText={currentMessage}
                  maxSeconds={3}
                  onCapture={handleOCRCapture}
                />
              ) : showImage ? (
                <Flex direction="column" gap="l" width="100%">
                  <Heading level={4}>✅ Photo Captured</Heading>
                  
                  <Flex direction="row" gap="l" wrap="wrap" justifyContent="center">
                    {frontImage && (ocrStep === 'frontFreezed' || ocrStep === 'backFreezed' || ocrStep === 'done') && (
                      <Flex direction="column" gap="xs" alignItems="center">
                        <Badge>Front Side</Badge>
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
                        <Badge>Back Side</Badge>
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
                        Continue
                      </Button>
                      <Button onClick={handleRetakeOCR}>
                        Retake
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
                      <Text>Processing...</Text>
                    </Flex>
                  ) : (
                    '🚀 Submit to AWS Bedrock'
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
                  Start Over
                </Button>
              </Flex>
              
              {ocrResult && ocrResult.data && (
                <Card variation="outlined" width="100%" padding="m">
                  <Heading level={4}>📋 OCR Results</Heading>
                  <Divider />
                  <Flex direction="column" gap="xs" marginTop="m">
                    <Text><strong>Document Type:</strong> {ocrResult.data.documentInfo.documentType}</Text>
                    <Text><strong>Country:</strong> {ocrResult.data.documentInfo.country}</Text>
                    <Text><strong>Document #:</strong> {ocrResult.data.documentInfo.documentNumber}</Text>
                    <Text><strong>Names:</strong> {ocrResult.data.documentInfo.firstName}</Text>
                    <Text><strong>Last Names:</strong> {ocrResult.data.documentInfo.lastName}</Text>
                    <Text><strong>Birth Date:</strong> {ocrResult.data.documentInfo.birthDate}</Text>
                    <Text><strong>Expiration:</strong> {ocrResult.data.documentInfo.expirationDate}</Text>
                    {ocrResult.data.documentInfo.gender && <Text><strong>Gender:</strong> {ocrResult.data.documentInfo.gender}</Text>}
                    {ocrResult.data.documentInfo.nationality && <Text><strong>Nationality:</strong> {ocrResult.data.documentInfo.nationality}</Text>}
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
            <Heading level={2}>👤 Face Liveness Detection</Heading>
            <Badge size="small" variation="success">
              Tenant: {tenant} | AWS Rekognition
            </Badge>
          </Flex>
          
          <Divider />
          
          <Card variation="outlined">
            <Flex direction="column" gap="l" alignItems="center" padding="l">
              <AutoCamera
                guideType="circle"
                guideText="Position your face in the oval"
                maxSeconds={3}
              />
              
              <Button variation="primary" size="large">
                Start Liveness Check
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
      dni: 'Position DNI in rectangle',
      dniFreezed: 'DNI captured',
      face: 'Position your face in oval',
      faceFreezed: 'Face captured',
      done: 'Ready to compare'
    };

    const currentMessage = stepMessages[compareStep];
    const showCamera = compareStep === 'dni' || compareStep === 'face';
    const showImage = compareStep === 'dniFreezed' || compareStep === 'faceFreezed' || compareStep === 'done';

    return (
      <Card variation="elevated" padding="xl">
        <Flex direction="column" gap="xl">
          <Flex direction="column" gap="xs">
            <Heading level={2}>🔄 Face Comparison</Heading>
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
                  <Heading level={4}>✅ Photo Captured</Heading>
                  
                  <Flex direction="row" gap="l" wrap="wrap" justifyContent="center">
                    {dniImage && (compareStep === 'dniFreezed' || compareStep === 'faceFreezed' || compareStep === 'done') && (
                      <Flex direction="column" gap="xs" alignItems="center">
                        <Badge variation="info">DNI Photo</Badge>
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
                        <Badge variation="success">Face Photo</Badge>
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
                        Continue
                      </Button>
                      <Button onClick={handleRetakeCompare}>
                        Retake
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
                onClick={() => alert('Comparing faces with AWS Rekognition...')}
                isDisabled={!dniImage || !faceImage}
              >
                🚀 Compare with AWS Rekognition
              </Button>
              <Button 
                variation="warning"
                onClick={() => {
                  setDniImage(null);
                  setFaceImage(null);
                  setCompareStep('dni');
                }}
              >
                Start Over
              </Button>
            </Flex>
          )}
        </Flex>
      </Card>
    );
  };

  // Renderizar servicio seleccionado
  const renderService = () => {
    switch(service) {
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
                <Heading level={2}>🔐 Identity Verification SDK</Heading>
                <Badge size="small" variation="info">
                  AWS Amplify + AI Services
                </Badge>
              </Flex>
              
              <Divider />
              
              <Text textAlign="center" variation="primary">
                Auto-camera verification services
              </Text>
              
              <Flex direction="column" gap="m" width="100%" maxWidth="400px">
                <Button variation="primary" size="large" as="a" href="/verify?service=ocr&tenant=demo">
                  <Flex direction="column" alignItems="flex-start" gap="xs">
                    <Text fontWeight="bold">📄 OCR Document</Text>
                    <Text fontSize="small">Auto-camera for DNI photos</Text>
                  </Flex>
                </Button>
                
                <Button variation="primary" size="large" as="a" href="/verify?service=liveness&tenant=demo">
                  <Flex direction="column" alignItems="flex-start" gap="xs">
                    <Text fontWeight="bold">👤 Liveness Check</Text>
                    <Text fontSize="small">Face detection</Text>
                  </Flex>
                </Button>
                
                <Button variation="primary" size="large" as="a" href="/verify?service=compare-faces&tenant=demo">
                  <Flex direction="column" alignItems="flex-start" gap="xs">
                    <Text fontWeight="bold">🔄 Face Comparison</Text>
                    <Text fontSize="small">DNI + Face matching</Text>
                  </Flex>
                </Button>
              </Flex>
            </Flex>
          </Card>
        );
    }
  };

  return (
    <View backgroundColor="background.primary" minHeight="100vh" padding={{ base: 'm', large: 'xl' }}>
      <Flex direction="column" gap="xl" maxWidth="800px" margin="0 auto">
        <Card variation="outlined">
          <Flex direction={{ base: 'column', medium: 'row' }} justifyContent="space-between" alignItems="center" gap="m" padding="l">
            <Flex direction="column" gap="xs">
              <Heading level={1}>🔐 ID Verify SDK</Heading>
              <Flex gap="s" alignItems="center">
                <Badge size="small">{service.toUpperCase()}</Badge>
                <Text fontSize="small" color="font.tertiary">| Tenant: {tenant}</Text>
              </Flex>
            </Flex>
            
            <ToggleButtonGroup value={service} isExclusive onChange={(value) => {
              if (value) window.location.href = `/verify?service=${value}&tenant=${tenant}`;
            }}>
              <ToggleButton value="ocr">📄 OCR</ToggleButton>
              <ToggleButton value="liveness">👤 Liveness</ToggleButton>
              <ToggleButton value="compare-faces">🔄 Compare</ToggleButton>
            </ToggleButtonGroup>
          </Flex>
        </Card>
        
        {renderService()}
        
        <Card variation="outlined">
          <Flex direction="column" alignItems="center" gap="xs" padding="l">
            <Text fontSize="small" color="font.tertiary">
              🚀 Auto Camera • AWS AI Services • Multi-tenant SaaS
            </Text>
          </Flex>
        </Card>
      </Flex>
    </View>
  );
}

export default App;