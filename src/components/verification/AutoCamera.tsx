/**
 * AutoCamera Component - Self-managed camera for verification
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import {
  Button,
  Card,
  Flex,
  Text,
  View,
  Loader,
  Alert,
} from '@aws-amplify/ui-react';

interface AutoCameraProps {
  guideType?: 'rectangle' | 'circle';
  guideText?: string;
  maxSeconds?: number;
  onCapture?: (photo: string) => void;
}

export function AutoCamera({
  guideType = 'rectangle',
  guideText = '',
  maxSeconds = 3,
  onCapture,
}: AutoCameraProps) {
  const webcamRef = useRef<Webcam>(null);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  
  const streamRef = useRef<MediaStream | null>(null);
  
  const facingMode = guideType === 'rectangle' ? 'environment' : 'user';
  
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);
  
  const activate = useCallback(async () => {
    cleanup();
    setError(null);
    setErrorMessage(null);
    setSeconds(0);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err) {
      // Fallback sin facingMode
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        
        streamRef.current = stream;
        setIsCameraActive(true);
      } catch {
        const msg = err instanceof Error ? err.message : 'Camera error';
        
        if (msg.includes('Permission') || msg.includes('NotAllowed')) {
          setError('permission_denied');
          setErrorMessage('Camera access was denied. Please allow camera access.');
        } else if (msg.includes('NotFound') || msg.includes('not found')) {
          setError('no_camera');
          setErrorMessage('No camera detected.');
        } else {
          setError('error');
          setErrorMessage('Unable to activate camera.');
        }
        
        setIsCameraActive(false);
      }
    }
  }, [facingMode, cleanup]);
  
  useEffect(() => {
    activate();
    return cleanup;
  }, [facingMode]);
  
  // Timer for auto-capture
  useEffect(() => {
    if (!isCameraActive) return;
    
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    
    const timer = setTimeout(() => {
      if (webcamRef.current) {
        const photo = webcamRef.current.getScreenshot();
        if (photo && onCapture) {
          onCapture(photo);
        }
      }
    }, maxSeconds * 1000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [isCameraActive, maxSeconds, onCapture]);
  
  const handleRetry = useCallback(() => {
    activate();
  }, [activate]);
  
  if (error) {
    return (
      <Card variation="outlined" padding="l">
        <Flex direction="column" gap="m" alignItems="center">
          <Alert variation="error">
            <Text>{errorMessage || 'Camera error occurred'}</Text>
          </Alert>
          <Button 
            variation="primary" 
            onClick={handleRetry}
            minHeight="44px"
            minWidth="44px"
            aria-label="Retry camera activation"
          >
            Try Again
          </Button>
        </Flex>
      </Card>
    );
  }
  
  if (!isCameraActive) {
    return (
      <Card variation="outlined" padding="l">
        <Flex direction="column" gap="m" alignItems="center">
          <Loader size="large" />
          <Text>Activating camera...</Text>
          <Text fontSize="small">Please allow camera access if prompted</Text>
        </Flex>
      </Card>
    );
  }
  
  return (
    <Flex direction="column" gap="s" alignItems="center" width="100%">
      <View 
        width="100%" 
        maxWidth="480px"
        position="relative"
        borderRadius="medium"
        overflow="hidden"
        backgroundColor="neutral.20"
      >
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />
        
        {/* Live indicator */}
        <View
          position="absolute"
          top="12px"
          left="12px"
          backgroundColor="#10b981"
          padding="xs"
          borderRadius="small"
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Text color="white" fontWeight="bold" fontSize="small">
            ● Live
          </Text>
        </View>
        
        {/* Guide overlay */}
        <View
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          width={guideType === 'rectangle' ? '200px' : '150px'}
          height={guideType === 'rectangle' ? '125px' : '200px'}
          border="3px solid #10b981"
          borderRadius={guideType === 'rectangle' ? 'small' : '50%'}
          opacity="0.7"
          style={{ pointerEvents: 'none' }}
        />
      </View>
      
      <Loader
        variation="linear"
        percentage={Math.min((seconds / maxSeconds) * 100, 100)}
        isDeterminate
        width="100%"
        maxWidth="480px"
      />
      
      {guideText && (
        <Text fontWeight="bold" textAlign="center">
          {guideText}
        </Text>
      )}
      
      <Text fontSize="small" color="font.tertiary">
        Auto-capture in {maxSeconds - seconds} seconds...
      </Text>
    </Flex>
  );
}