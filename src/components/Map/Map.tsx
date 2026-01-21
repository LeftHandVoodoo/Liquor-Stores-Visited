import { useCallback, useState, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { useStores } from '../../hooks/useStores';
import { getApiKey, searchLiquorStores } from '../../services/googleMaps';
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
  const [isSearching, setIsSearching] = useState(false);

  const {
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

      // Load stores from Google Places on first load
      try {
        setIsSearching(true);
        const googleStores = await searchLiquorStores(map);
        mergeGoogleStores(googleStores);
      } catch (error) {
        console.error('Error fetching stores:', error);
        onApiError('Failed to load stores from Google Places. Using cached data.');
      } finally {
        setIsSearching(false);
      }
    },
    [mergeGoogleStores, onApiError]
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

      {isSearching && (
        <div className={styles.searchingOverlay}>
          <div className={styles.spinner} />
          <p>Searching for liquor stores...</p>
        </div>
      )}
    </div>
  );
}
