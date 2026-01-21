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
import { FREDERICK_COUNTY_CENTER } from '../../types/store';
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
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: getApiKey(),
    libraries,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ current: 0, total: 0 });
  const hasLoadedStores = useRef(false);

  const {
    stores,
    getFilteredStores,
    selectStore,
    mergeGoogleStores,
    settings,
    routeResult,
    selectedForRoute,
  } = useStores();

  const filteredStores = getFilteredStores();

  const loadStores = useCallback(
    async () => {
      try {
        setIsLoading(true);
        setLoadProgress({ current: 0, total: getPreloadedStoresCount() });
        console.log('Starting to load', getPreloadedStoresCount(), 'stores...');

        const preloadedStores = await loadPreloadedStores((current, total) => {
          setLoadProgress({ current, total });
          if (current % 10 === 0) {
            console.log(`Geocoding progress: ${current}/${total}`);
          }
        });

        console.log('Loaded', preloadedStores.length, 'stores with coordinates');
        mergeGoogleStores(preloadedStores);
      } catch (error) {
        console.error('Error loading stores:', error);
        onApiError('Failed to load store data. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    },
    [mergeGoogleStores, onApiError]
  );

  const onMapLoad = useCallback(
    async (map: google.maps.Map) => {
      mapRef.current = map;

      // Check if we have stores with valid coordinates
      const storesWithCoords = stores.filter(s => s.lat && s.lng && !isNaN(s.lat) && !isNaN(s.lng));
      console.log('Map loaded. Stores:', stores.length, 'With coords:', storesWithCoords.length);

      // Only load if we haven't already AND don't have valid store data
      if (hasLoadedStores.current || storesWithCoords.length > 0) {
        console.log('Skipping store load - already have data');
        return;
      }

      hasLoadedStores.current = true;
      await loadStores();
    },
    [stores, loadStores]
  );

  const handleMarkerClick = useCallback(
    (storeId: string) => {
      selectStore(storeId);
    },
    [selectStore]
  );

  useEffect(() => {
    if (loadError) {
      onApiError(
        'Failed to load Google Maps. Please check your API key configuration.'
      );
    }
  }, [loadError, onApiError]);

  // DEBUG: Show store count
  console.log('Map render - isLoaded:', isLoaded, 'stores:', stores.length, 'filtered:', filteredStores.length);

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
          const validStores = filteredStores.filter((store) => store.lat && store.lng && !isNaN(store.lat) && !isNaN(store.lng));
          console.log('Rendering markers for', validStores.length, 'stores. First store:', validStores[0]);
          return validStores;
        })()
          .map((store) => {
            // Safely check for good deal on Don Julio 1942
            let hasGoodDeal = false;
            if (store.visits && Array.isArray(store.visits) && store.visits.length > 0) {
              const lastVisit = store.visits[store.visits.length - 1];
              if (lastVisit && typeof lastVisit.donJulio1942Price === 'number') {
                hasGoodDeal = lastVisit.donJulio1942Price <= settings.priceAlertThreshold;
              }
            }

            return (
              <Marker
                key={store.id}
                position={{ lat: store.lat, lng: store.lng }}
                icon={createPinIcon(getPinColor(store), hasGoodDeal)}
                onClick={() => handleMarkerClick(store.id)}
                title={store.name}
              />
            );
          })}

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

      {!isLoading && filteredStores.filter(s => s.lat && s.lng).length === 0 && (
        <button
          onClick={() => {
            console.log('Manual load triggered');
            localStorage.removeItem('liquor-tracker-data');
            localStorage.removeItem('geocode-cache');
            hasLoadedStores.current = false;
            loadStores();
          }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '16px 32px',
            fontSize: '18px',
            background: '#5d4037',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            zIndex: 100,
          }}
        >
          Load 75 Liquor Stores
        </button>
      )}
    </div>
  );
}
