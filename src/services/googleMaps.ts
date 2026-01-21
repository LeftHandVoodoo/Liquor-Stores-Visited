import type { Store } from '../types/store';
import { FREDERICK_COUNTY_CENTER } from '../types/store';
import { preloadedStores, type PreloadedStore } from '../data/stores';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Cache for geocoded coordinates
const GEOCODE_CACHE_KEY = 'liquor-tracker-geocode-cache';

export function getApiKey(): string {
  return API_KEY;
}

export function isApiKeyConfigured(): boolean {
  return API_KEY.length > 0 && API_KEY !== 'your_api_key_here';
}

export async function searchLiquorStores(
  map: google.maps.Map
): Promise<Store[]> {
  return new Promise((resolve, reject) => {
    const service = new google.maps.places.PlacesService(map);

    const request: google.maps.places.PlaceSearchRequest = {
      location: FREDERICK_COUNTY_CENTER,
      radius: 40000, // ~25 miles
      type: 'liquor_store',
    };

    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        const stores: Store[] = results.map((place) => ({
          id: place.place_id || crypto.randomUUID(),
          name: place.name || 'Unknown Store',
          address: place.vicinity || '',
          lat: place.geometry?.location?.lat() || 0,
          lng: place.geometry?.location?.lng() || 0,
          phone: undefined,
          isManualEntry: false,
          visited: false,
          ownerName: '',
          comments: '',
          hasFortalezaBlanco: false,
          hasFortalezaReposado: false,
          hasFortalezaAnejo: false,
          visits: [],
        }));
        resolve(stores);
      } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        resolve([]);
      } else {
        reject(new Error(`Places API error: ${status}`));
      }
    });
  });
}

export async function getPlaceDetails(
  map: google.maps.Map,
  placeId: string
): Promise<Partial<Store>> {
  return new Promise((resolve, reject) => {
    const service = new google.maps.places.PlacesService(map);

    const request: google.maps.places.PlaceDetailsRequest = {
      placeId,
      fields: ['name', 'formatted_address', 'formatted_phone_number', 'geometry'],
    };

    service.getDetails(request, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && place) {
        resolve({
          name: place.name,
          address: place.formatted_address,
          phone: place.formatted_phone_number,
          lat: place.geometry?.location?.lat(),
          lng: place.geometry?.location?.lng(),
        });
      } else {
        reject(new Error(`Place details error: ${status}`));
      }
    });
  });
}

export function getDirectionsUrl(store: Store): string {
  const destination = encodeURIComponent(store.address || `${store.lat},${store.lng}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

export function calculateRoute(
  stores: Store[]
): Promise<google.maps.DirectionsResult | null> {
  return new Promise((resolve, reject) => {
    if (stores.length < 2) {
      resolve(null);
      return;
    }

    const directionsService = new google.maps.DirectionsService();

    const origin = { lat: stores[0].lat, lng: stores[0].lng };
    const destination = {
      lat: stores[stores.length - 1].lat,
      lng: stores[stores.length - 1].lng,
    };

    const waypoints = stores.slice(1, -1).map((store) => ({
      location: { lat: store.lat, lng: store.lng },
      stopover: true,
    }));

    directionsService.route(
      {
        origin,
        destination,
        waypoints,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          resolve(result);
        } else {
          reject(new Error(`Directions error: ${status}`));
        }
      }
    );
  });
}

export function getGoogleMapsRouteUrl(stores: Store[]): string {
  if (stores.length === 0) return '';

  const baseUrl = 'https://www.google.com/maps/dir/';
  const locations = stores
    .map((s) => encodeURIComponent(s.address || `${s.lat},${s.lng}`))
    .join('/');

  return baseUrl + locations;
}

// Load geocode cache from localStorage
function loadGeocodeCache(): Record<string, { lat: number; lng: number }> {
  try {
    const cached = localStorage.getItem(GEOCODE_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

// Save geocode cache to localStorage
function saveGeocodeCache(cache: Record<string, { lat: number; lng: number }>): void {
  try {
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Failed to save geocode cache:', error);
  }
}

// Geocode a single address
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ address }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
        const location = results[0].geometry.location;
        resolve({ lat: location.lat(), lng: location.lng() });
      } else {
        console.warn(`Geocoding failed for "${address}": ${status}`);
        resolve(null);
      }
    });
  });
}

// Load preloaded stores with geocoding
export async function loadPreloadedStores(
  onProgress?: (current: number, total: number) => void
): Promise<Store[]> {
  const cache = loadGeocodeCache();
  const stores: Store[] = [];
  const newCache = { ...cache };

  for (let i = 0; i < preloadedStores.length; i++) {
    const preloaded = preloadedStores[i];

    // Check cache first
    let coords = cache[preloaded.address];

    if (!coords) {
      // Geocode the address
      coords = await geocodeAddress(preloaded.address) || undefined;

      if (coords) {
        newCache[preloaded.address] = coords;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (coords) {
      stores.push({
        id: `preloaded-${i}`,
        name: preloaded.name,
        address: preloaded.address,
        lat: coords.lat,
        lng: coords.lng,
        phone: preloaded.phone || undefined,
        isManualEntry: false,
        visited: false,
        ownerName: '',
        comments: preloaded.comments,
        hasFortalezaBlanco: false,
        hasFortalezaReposado: false,
        hasFortalezaAnejo: false,
        visits: [],
      });
    }

    if (onProgress) {
      onProgress(i + 1, preloadedStores.length);
    }
  }

  // Save updated cache
  saveGeocodeCache(newCache);

  return stores;
}

// Check if preloaded stores have been geocoded
export function hasGeocodedStores(): boolean {
  const cache = loadGeocodeCache();
  return Object.keys(cache).length >= preloadedStores.length * 0.9; // 90% threshold
}

// Get count of cached geocodes
export function getGeocodeCacheCount(): number {
  const cache = loadGeocodeCache();
  return Object.keys(cache).length;
}

// Get total preloaded stores count
export function getPreloadedStoresCount(): number {
  return preloadedStores.length;
}
