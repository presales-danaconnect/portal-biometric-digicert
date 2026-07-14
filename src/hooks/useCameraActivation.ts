/**
 * Camera activation hook for OCR
 */
import { useState, useCallback, useRef, useEffect } from 'react';

export function useCameraActivation(facingMode: 'environment' | 'user' = 'environment') {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);
  
  const activate = useCallback(async (mode: 'environment' | 'user') => {
    cleanup();
    setError(null);
    setErrorMessage(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
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
  }, [cleanup]);
  
  // Activate on mount and when facingMode changes
  useEffect(() => {
    activate(facingMode);
    return cleanup;
  }, [facingMode]);
  
  return { isCameraActive, error, errorMessage, retry: () => activate(facingMode), cleanup };
}