import { useState, useCallback } from 'react';
import {
  Button,
  Card,
  Flex,
  Heading,
  Text,
  Badge,
  Divider,
  Loader,
  Image,
} from '@aws-amplify/ui-react';
import { AutoCamera } from './AutoCamera';
import { callOCRAPI, OCRResponse } from '../../services/api';
import { useTranslation } from '../../i18n/i18n';

interface OCRVerificationProps {
  tenant: string;
  webhookUrl?: string;
  geolocation?: string | null;
}

export function OCRVerification({ tenant, webhookUrl, geolocation }: OCRVerificationProps) {
  const { t } = useTranslation();

  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [ocrStep, setOcrStep] = useState<'front' | 'frontFreezed' | 'back' | 'backFreezed' | 'done'>('front');
  const [ocrResult, setOcrResult] = useState<OCRResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleOCRCapture = useCallback((photo: string) => {
    if (ocrStep === 'front') {
      setFrontImage(photo);
      setOcrStep('frontFreezed');
    } else if (ocrStep === 'back') {
      setBackImage(photo);
      setOcrStep('backFreezed');
    }
  }, [ocrStep]);

  const handleContinueOCR = () => {
    if (ocrStep === 'frontFreezed') {
      setOcrStep('back');
    } else if (ocrStep === 'backFreezed') {
      setOcrStep('done');
    }
  };

  const handleRetakeOCR = () => {
    if (ocrStep === 'frontFreezed') {
      setFrontImage(null);
      setOcrStep('front');
    } else if (ocrStep === 'backFreezed') {
      setBackImage(null);
      setOcrStep('back');
    }
  };

  const handleOCROnSubmit = async () => {
    if (!frontImage || !backImage) return;

    setIsProcessing(true);
    try {
      const result = await callOCRAPI(frontImage, backImage, tenant, webhookUrl, geolocation);
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

  const stepMessages = {
    front: t('ocr.steps.front'),
    frontFreezed: t('ocr.steps.frontFreezed'),
    back: t('ocr.steps.back'),
    backFreezed: t('ocr.steps.backFreezed'),
    done: t('ocr.steps.done'),
  };

  const currentMessage = stepMessages[ocrStep];
  const showCamera = ocrStep === 'front' || ocrStep === 'back';
  const showImage = ocrStep === 'frontFreezed' || ocrStep === 'backFreezed' || ocrStep === 'done';

  return (
    <Card variation="elevated" padding="xl" width="100%">
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
}
