/**
 * Google Geocoding Service
 * Validates and enriches addresses using Google Maps Geocoding API
 */

interface GeocodeResult {
  formattedAddress: string;
  location: {
    lat: number;
    lng: number;
  };
  neighborhood?: string;
  city?: string;
  country?: string;
}

/**
 * Geocode an address and return structured location data
 */
export async function geocodeAddress(
  address: string,
  defaultCity: string = "Montevideo, Uruguay"
): Promise<GeocodeResult | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ Google Maps API key not configured, skipping geocoding');
    return null;
  }

  try {
    // Add default city if not included in address
    const fullAddress = address.includes(defaultCity.split(',')[0])
      ? address
      : `${address}, ${defaultCity}`;

    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', fullAddress);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.log(`⚠️ Geocoding failed for "${address}": ${data.status}`);
      return null;
    }

    const result = data.results[0];
    const location = result.geometry.location;

    // Extract neighborhood and city from address components
    let neighborhood: string | undefined;
    let city: string | undefined;
    let country: string | undefined;

    for (const component of result.address_components) {
      if (component.types.includes('neighborhood') || component.types.includes('sublocality')) {
        neighborhood = component.long_name;
      }
      if (component.types.includes('locality')) {
        city = component.long_name;
      }
      if (component.types.includes('country')) {
        country = component.long_name;
      }
    }

    return {
      formattedAddress: result.formatted_address,
      location: {
        lat: location.lat,
        lng: location.lng,
      },
      neighborhood,
      city,
      country,
    };
  } catch (error) {
    console.error('❌ Geocoding error:', error);
    return null;
  }
}
