import { useState, useCallback } from 'react';
import { useStores } from '../../hooks/useStores';
import { calculateRoute } from '../../services/googleMaps';
import { HOME_ADDRESS } from '../../types/store';
import type { Store } from '../../types/store';
import styles from './RoutePanel.module.css';

// Create a "home" store object for route planning
const homeStore: Store = {
  id: 'home',
  name: 'Home',
  address: HOME_ADDRESS.address,
  lat: HOME_ADDRESS.lat,
  lng: HOME_ADDRESS.lng,
  isManualEntry: false,
  visited: false,
  ownerName: '',
  comments: '',
  hasFortalezaBlanco: false,
  hasFortalezaReposado: false,
  hasFortalezaAnejo: false,
  visits: [],
};

interface RoutePanelProps {
  onClose: () => void;
  onClear: () => void;
}

export function RoutePanel({ onClose, onClear }: RoutePanelProps) {
  const {
    selectedForRoute,
    removeFromRoute,
    getRouteStores,
    setRouteResult,
    routeResult,
  } = useStores();

  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routeStores = getRouteStores();

  const handleCalculateRoute = useCallback(async () => {
    if (routeStores.length < 1) {
      setError('Add at least 1 store to plan a route');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      // Always start from home
      const routeWithHome = [homeStore, ...routeStores];
      const result = await calculateRoute(routeWithHome);
      setRouteResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate route');
      setRouteResult(null);
    } finally {
      setIsCalculating(false);
    }
  }, [routeStores, setRouteResult]);

  const getTotalDistance = (): string => {
    if (!routeResult || !routeResult.routes[0]) return '';
    const meters = routeResult.routes[0].legs.reduce(
      (total, leg) => total + (leg.distance?.value || 0),
      0
    );
    const miles = (meters * 0.000621371).toFixed(1);
    return `${miles} mi`;
  };

  const getTotalTime = (): string => {
    if (!routeResult || !routeResult.routes[0]) return '';
    const seconds = routeResult.routes[0].legs.reduce(
      (total, leg) => total + (leg.duration?.value || 0),
      0
    );
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>Route Planner</h3>
        <button className={styles.closeBtn} onClick={onClose}>
          &times;
        </button>
      </div>

      <div className={styles.content}>
        {routeStores.length === 0 ? (
          <div className={styles.empty}>
            <p>No stores selected for route.</p>
            <p className={styles.hint}>
              Click "Add to Route" when viewing a store to build your route.
              Routes always start from Home.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.storeList}>
              {routeStores.map((store, index) => (
                <div key={store.id} className={styles.storeItem}>
                  <div className={styles.storeNumber}>{index + 1}</div>
                  <div className={styles.storeInfo}>
                    <div className={styles.storeName}>{store.name}</div>
                    <div className={styles.storeAddress}>{store.address}</div>
                  </div>
                  <button
                    className={styles.removeBtn}
                    onClick={() => removeFromRoute(store.id)}
                    title="Remove from route"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {routeResult && (
              <div className={styles.routeInfo}>
                <div className={styles.routeStat}>
                  <span className={styles.statLabel}>Total Distance:</span>
                  <span className={styles.statValue}>{getTotalDistance()}</span>
                </div>
                <div className={styles.routeStat}>
                  <span className={styles.statLabel}>Estimated Time:</span>
                  <span className={styles.statValue}>{getTotalTime()}</span>
                </div>
              </div>
            )}

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.actions}>
              <button
                className={styles.planBtn}
                onClick={handleCalculateRoute}
                disabled={isCalculating || routeStores.length < 1}
              >
                {isCalculating ? 'Calculating...' : 'Plan Route'}
              </button>

              <button className={styles.clearBtn} onClick={onClear}>
                Clear Route
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
