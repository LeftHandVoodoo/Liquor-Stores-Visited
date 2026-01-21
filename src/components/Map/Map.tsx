import { useCallback, useState, useRef, useEffect } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  DirectionsRenderer,
} from '@react-google-maps/api';
import { useStores } from '../../hooks/useStores';
import {
  getApiKey,
  loadPreloadedStores,
  getPreloadedStoresCount,
} from '../../services/googleMaps';
import { FREDERICK_COUNTY_CENTER, HOME_ADDRESS } from '../../types/store';
import type { Store } from '../../types/store';
import styles from './Map.module.css';

const libraries: ('places' | 'geometry' | 'drawing')[] = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Map options must be created after API loads (google.maps not available at module level)
function getMapOptions(): google.maps.MapOptions {
  return {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: true,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      position: google.maps.ControlPosition.TOP_RIGHT,
      mapTypeIds: [
        google.maps.MapTypeId.ROADMAP,
        google.maps.MapTypeId.SATELLITE,
        google.maps.MapTypeId.HYBRID,
      ],
    },
    streetViewControl: false,
    fullscreenControl: true,
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
    ],
  };
}

function getPinColor(store: Store): string {
  if (!store.visited) {
    return '#1976d2'; // Blue - not visited
  }
  if (store.hasFortalezaBlanco || store.hasFortalezaReposado || store.hasFortalezaAnejo) {
    return '#4caf50'; // Green - has Fortaleza
  }
  return '#90caf9'; // Light blue - visited, no Fortaleza
}

function createPinIcon(color: string, hasSpecialDeal: boolean): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: hasSpecialDeal ? '#ffd700' : '#0d47a1',
    strokeWeight: hasSpecialDeal ? 3 : 2,
    scale: hasSpecialDeal ? 12 : 10,
  };
}

interface MapProps {
  onApiError: (error: string) => void;
}

export function Map({ onApiError }: MapProps) {
  console.log('[MAP] === Map component render ===');

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: getApiKey(),
    libraries,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ current: 0, total: 0 });
  const loadingStarted = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [markerKey, setMarkerKey] = useState(0);

  const {
    stores,
    getFilteredStores,
    selectStore,
    updateStore,
    mergeGoogleStores,
    settings,
    routeResult,
    selectedForRoute,
  } = useStores();

  console.log('[MAP] stores from context:', stores.length);

  const filteredStores = getFilteredStores();
  console.log('[MAP] filteredStores.length:', filteredStores.length);

  // Count stores with valid coordinates
  const storesWithCoords = stores.filter(s => s.lat && s.lng && !isNaN(s.lat) && !isNaN(s.lng));
  console.log('[MAP] storesWithCoords.length:', storesWithCoords.length);
  if (storesWithCoords.length > 0) {
    console.log('[MAP] First store with coords:', storesWithCoords[0].name, storesWithCoords[0].lat, storesWithCoords[0].lng);
  }

  // Auto-load stores when map is ready and we have no valid store data
  useEffect(() => {
    console.log('[MAP] Loading useEffect - conditions check:');
    console.log('[MAP]   isLoaded:', isLoaded);
    console.log('[MAP]   isLoading:', isLoading);
    console.log('[MAP]   loadingStarted.current:', loadingStarted.current);
    console.log('[MAP]   storesWithCoords.length:', storesWithCoords.length);

    if (!isLoaded || isLoading || loadingStarted.current) {
      console.log('[MAP] Early return - isLoaded/isLoading/loadingStarted check failed');
      return;
    }
    if (storesWithCoords.length > 0) {
      console.log('[MAP] Early return - already have', storesWithCoords.length, 'stores with coords');
      return; // Already have data
    }

    console.log('[MAP] *** WILL LOAD STORES - no valid coords found ***');
    loadingStarted.current = true;

    const loadStoresAsync = async () => {
      try {
        setIsLoading(true);
        setLoadProgress({ current: 0, total: getPreloadedStoresCount() });
        console.log('[MAP] Starting to load', getPreloadedStoresCount(), 'preloaded stores');

        const preloadedStores = await loadPreloadedStores((current, total) => {
          setLoadProgress({ current, total });
        });

        console.log('[MAP] Loaded', preloadedStores.length, 'stores, calling mergeGoogleStores');
        mergeGoogleStores(preloadedStores);
      } catch (error) {
        console.error('[MAP] Error loading stores:', error);
        onApiError('Failed to load store data. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadStoresAsync();
  }, [isLoaded, isLoading, storesWithCoords.length, mergeGoogleStores, onApiError]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    console.log('[MAP] onMapLoad called - map is ready');
    mapRef.current = map;
    setMapReady(true);
    // Force marker re-render by updating key
    setMarkerKey(k => k + 1);
  }, []);

  const handleMarkerClick = useCallback(
    (storeId: string) => {
      selectStore(storeId);
    },
    [selectStore]
  );

  const handleMarkerDrag = useCallback(
    (storeId: string, e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const newLat = e.latLng.lat();
        const newLng = e.latLng.lng();
        console.log('[MAP] Marker dragged:', storeId, 'to', newLat, newLng);
        updateStore(storeId, { lat: newLat, lng: newLng });
      }
    },
    [updateStore]
  );

  useEffect(() => {
    if (loadError) {
      onApiError(
        'Failed to load Google Maps. Please check your API key configuration.'
      );
    }
  }, [loadError, onApiError]);

  if (!isLoaded) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading map...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.error}>
        <h2>Map Loading Error</h2>
        <p>Failed to load Google Maps. Please check your API key.</p>
        <p className={styles.errorDetail}>{loadError.message}</p>
      </div>
    );
  }

  return (
    <div className={styles.mapWrapper}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={FREDERICK_COUNTY_CENTER}
        zoom={11}
        options={getMapOptions()}
        onLoad={onMapLoad}
      >
        {(() => {
          console.log('[MAP] Rendering markers - mapReady:', mapReady, 'filteredStores:', filteredStores.length);
          if (!mapReady) {
            console.log('[MAP] Map not ready, skipping markers');
            return null;
          }
          const validStores = filteredStores.filter((store) => store.lat && store.lng && !isNaN(store.lat) && !isNaN(store.lng));
          console.log('[MAP] Valid stores to render:', validStores.length);
          return validStores.map((store) => {
            let hasGoodDeal = false;
            if (store.visits && Array.isArray(store.visits) && store.visits.length > 0) {
              const lastVisit = store.visits[store.visits.length - 1];
              if (lastVisit && typeof lastVisit.donJulio1942Price === 'number') {
                hasGoodDeal = lastVisit.donJulio1942Price <= settings.priceAlertThreshold;
              }
            }
            const pinColor = getPinColor(store);
            const icon: google.maps.Symbol = {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: pinColor,
              fillOpacity: 1,
              strokeColor: hasGoodDeal ? '#ffd700' : '#0d47a1',
              strokeWeight: hasGoodDeal ? 3 : 2,
              scale: hasGoodDeal ? 12 : 10,
            };
            return (
              <Marker
                key={`${markerKey}-${store.id}`}
                position={{ lat: store.lat, lng: store.lng }}
                onClick={() => handleMarkerClick(store.id)}
                onDragEnd={(e) => handleMarkerDrag(store.id, e)}
                title={store.name}
                icon={icon}
                draggable={true}
              />
            );
          });
        })()}

        {/* Home marker - always visible */}
        {mapReady && (
          <Marker
            key="home-marker"
            position={{ lat: HOME_ADDRESS.lat, lng: HOME_ADDRESS.lng }}
            title="Home - Route Start"
            icon={{
              path: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
              fillColor: '#4caf50',
              fillOpacity: 1,
              strokeColor: '#2e7d32',
              strokeWeight: 2,
              scale: 1.5,
              anchor: new google.maps.Point(12, 22),
            }}
          />
        )}

        {routeResult && selectedForRoute.length > 0 && (
          <DirectionsRenderer
            directions={routeResult}
            options={{
              suppressMarkers: false,
              polylineOptions: {
                strokeColor: '#5d4037',
                strokeWeight: 4,
                strokeOpacity: 0.8,
              },
              markerOptions: {
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: '#ffd700',
                  fillOpacity: 1,
                  strokeColor: '#3e2723',
                  strokeWeight: 2,
                  scale: 8,
                },
              },
            }}
          />
        )}
      </GoogleMap>

      {isLoading && (
        <div className={styles.searchingOverlay}>
          <div className={styles.spinner} />
          <p>Loading {loadProgress.total} Frederick County liquor stores...</p>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${(loadProgress.current / loadProgress.total) * 100}%`,
              }}
            />
          </div>
          <p className={styles.progressText}>
            Geocoding addresses: {loadProgress.current} / {loadProgress.total}
          </p>
        </div>
      )}

    </div>
  );
}
