import { useState, useCallback } from 'react';
import {
  Button,
  Card,
  Flex,
  Heading,
  Badge,
  Divider,
  Image,
} from '@aws-amplify/ui-react';
import { AutoCamera } from './AutoCamera';
import { useTranslation } from '../../i18n/i18n';

interface CompareFacesVerificationProps {
  tenant: string;
  webhookUrl?: string;
  geolocation?: string | null;
}

export function CompareFacesVerification({ tenant }: CompareFacesVerificationProps) {
  const { t } = useTranslation();

  const [dniImage, setDniImage] = useState<string | null>(null);
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [compareStep, setCompareStep] = useState<'dni' | 'dniFreezed' | 'face' | 'faceFreezed' | 'done'>('dni');

  const handleCompareCapture = useCallback((photo: string) => {
    if (compareStep === 'dni') {
      setDniImage(photo);
      setCompareStep('dniFreezed');
    } else if (compareStep === 'face') {
      setFaceImage(photo);
      setCompareStep('faceFreezed');
    }
  }, [compareStep]);

  const handleContinueCompare = () => {
    if (compareStep === 'dniFreezed') {
      setCompareStep('face');
    } else if (compareStep === 'faceFreezed') {
      setCompareStep('done');
    }
  };

  const handleRetakeCompare = () => {
    if (compareStep === 'dniFreezed') {
      setDniImage(null);
      setCompareStep('dni');
    } else if (compareStep === 'faceFreezed') {
      setFaceImage(null);
      setCompareStep('face');
    }
  };

  const stepMessages = {
    dni: t('compareFaces.steps.dni'),
    dniFreezed: t('compareFaces.steps.dniFreezed'),
    face: t('compareFaces.steps.face'),
    faceFreezed: t('compareFaces.steps.faceFreezed'),
    done: t('compareFaces.steps.done'),
  };

  const currentMessage = stepMessages[compareStep];
  const showCamera = compareStep === 'dni' || compareStep === 'face';
  const showImage = compareStep === 'dniFreezed' || compareStep === 'faceFreezed' || compareStep === 'done';

  return (
    <Card variation="elevated" padding="xl" width="100%">
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
              onClick={() => {
                alert(t('compareFaces.comparingAlert'));
                // TODO: cuando el backend real de compare-faces esté listo,
                // reemplazar este alert por la llamada real y notificar
                // el webhook desde esa Lambda, igual que hace ocr-handler.
              }}
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
}
