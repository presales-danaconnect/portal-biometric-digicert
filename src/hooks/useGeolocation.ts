import { useState, useEffect, useRef } from 'react';
import { getLocation } from '../services/geolocation';

export function useGeolocation() {
  const [geolocation, setGeolocation] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    getLocation().then(setGeolocation);
  }, []);

  return geolocation;
}
