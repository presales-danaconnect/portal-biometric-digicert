export interface NominatimResponse {
  display_name: string;
}

/**
 * Gets the current browser location and reverse-geocodes it into
 * a human-readable address string using OpenStreetMap Nominatim.
 * Returns null if geolocation is unavailable, denied, or fails.
 */
export async function getLocation(): Promise<string | null> {
  try {
    if (!navigator.geolocation) return null;

    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject)
    );

    const { latitude, longitude } = position.coords;

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
    );
    if (!response.ok) return null;

    const data = (await response.json()) as NominatimResponse;
    return data.display_name;
  } catch {
    return null;
  }
}
