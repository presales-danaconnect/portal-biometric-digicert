import { useState, useEffect } from 'react';

export function useGeolocation() {
  const [geolocation, setGeolocation] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const { road, suburb, city, town, village, state, country } = data.address || {};
          const address = [
            road,
            suburb || town || village,
            city || state,
            country,
          ]
            .filter(Boolean)
            .join(', ');
          setGeolocation(address || `${latitude}, ${longitude}`);
        } catch {
          setGeolocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      },
      () => {
        setGeolocation(null);
      }
    );
  }, []);

  return geolocation;
}
