import { useCallback, useState, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
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

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
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

function getPinColor(store: Store): string {
  if (!store.visited) {
    return '#5d4037'; // Brown - not visited
  }
  if (store.hasFortalezaBlanco || store.hasFortalezaReposado || store.hasFortalezaAnejo) {
    return '#ffd700'; // Gold - has Fortaleza
  }
  return '#d7ccc8'; // Tan - visited, no Fortaleza
}

function createPinIcon(color: string, hasSpecialDeal: boolean): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: hasSpecialDeal ? '#ffd700' : '#3e2723',
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
    selectedStoreId,
    mergeGoogleStores,
    settings,
  } = useStores();

  const filteredStores = getFilteredStores();

  const onMapLoad = useCallback(
    async (map: google.maps.Map) => {
      mapRef.current = map;

      // Only load preloaded stores if we haven't already and don't have stored data
      if (hasLoadedStores.current || stores.length > 0) {
        return;
      }

      hasLoadedStores.current = true;

      try {
        setIsLoading(true);
        setLoadProgress({ current: 0, total: getPreloadedStoresCount() });

        const preloadedStores = await loadPreloadedStores((current, total) => {
          setLoadProgress({ current, total });
        });

        mergeGoogleStores(preloadedStores);
      } catch (error) {
        console.error('Error loading stores:', error);
        onApiError('Failed to load store data. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    },
    [stores.length, mergeGoogleStores, onApiError]
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
        options={mapOptions}
        onLoad={onMapLoad}
      >
        {filteredStores.map((store) => {
          const lastVisit = store.visits[store.visits.length - 1];
          const hasGoodDeal =
            lastVisit?.donJulio1942Price !== null &&
            lastVisit.donJulio1942Price <= settings.priceAlertThreshold;

          return (
            <Marker
              key={store.id}
              position={{ lat: store.lat, lng: store.lng }}
              icon={createPinIcon(getPinColor(store), hasGoodDeal)}
              onClick={() => handleMarkerClick(store.id)}
              animation={
                store.id === selectedStoreId
                  ? google.maps.Animation.BOUNCE
                  : undefined
              }
              title={store.name}
            />
          );
        })}
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
