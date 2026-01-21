# Route Planner - Ready-to-Use Code Examples

## Quick Reference: Copy-Paste Solutions

This file contains production-ready code snippets you can use immediately.

---

## 1. useRouteOptimizer Hook

**File to create**: `src/hooks/useRouteOptimizer.ts`

```typescript
import { useState, useCallback, useRef } from 'react';
import type { Store } from '../types/store';

export interface RouteStats {
  totalDistance: string;
  totalDuration: string;
  totalDurationSeconds: number;
  stops: StopInfo[];
  waypointOrder: number[];
}

export interface StopInfo {
  order: number;
  storeName: string;
  address: string;
  distance: string;
  duration: string;
}

interface CachedRoute {
  storeIds: string[];
  result: google.maps.DirectionsResult;
  timestamp: number;
}

export function useRouteOptimizer() {
  const [directionsResult, setDirectionsResult] = useState<
    google.maps.DirectionsResult | null
  >(null);
  const [routeStats, setRouteStats] = useState<RouteStats | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, CachedRoute>>(new Map());

  const haversineDistance = useCallback(
    (store1: Store, store2: Store): number => {
      const R = 6371; // Earth radius in km
      const dLat = ((store2.lat - store1.lat) * Math.PI) / 180;
      const dLng = ((store2.lng - store1.lng) * Math.PI) / 180;

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((store1.lat * Math.PI) / 180) *
          Math.cos((store2.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    []
  );

  // Nearest neighbor optimization
  const optimizeNearestNeighbor = useCallback(
    (stores: Store[]): Store[] => {
      if (stores.length <= 1) return stores;

      const unvisited = [...stores];
      const optimized: Store[] = [];
      let current = unvisited.shift()!;
      optimized.push(current);

      while (unvisited.length > 0) {
        const nearest = unvisited.reduce((prev, curr) => {
          const currDist = haversineDistance(current, curr);
          const prevDist = haversineDistance(current, prev);
          return currDist < prevDist ? curr : prev;
        });

        optimized.push(nearest);
        current = nearest;
        unvisited.splice(unvisited.indexOf(nearest), 1);
      }

      return optimized;
    },
    [haversineDistance]
  );

  // Get cached route or null
  const getCachedRoute = useCallback((storeIds: string[]) => {
    const key = storeIds.sort().join(',');
    const cached = cacheRef.current.get(key);

    if (cached) {
      // Check if expired (5 minutes)
      if (Date.now() - cached.timestamp > 5 * 60 * 1000) {
        cacheRef.current.delete(key);
        return null;
      }
      return cached.result;
    }

    return null;
  }, []);

  // Cache a route
  const setCachedRoute = useCallback(
    (storeIds: string[], result: google.maps.DirectionsResult) => {
      const key = storeIds.sort().join(',');

      // Limit cache size to 50 entries
      if (cacheRef.current.size >= 50) {
        const oldest = Array.from(cacheRef.current.entries()).sort(
          ([, a], [, b]) => a.timestamp - b.timestamp
        )[0];
        if (oldest) cacheRef.current.delete(oldest[0]);
      }

      cacheRef.current.set(key, {
        storeIds,
        result,
        timestamp: Date.now()
      });
    },
    []
  );

  // Extract route statistics
  const extractRouteStats = useCallback(
    (result: google.maps.DirectionsResult, stores: Store[]): RouteStats => {
      const route = result.routes[0];
      const legs = route.legs;

      let totalDistance = 0;
      let totalDuration = 0;
      const stops: StopInfo[] = [];

      legs.forEach((leg, index) => {
        totalDistance += leg.distance?.value || 0;
        totalDuration += leg.duration?.value || 0;

        stops.push({
          order: index,
          storeName: stores[index]?.name || 'Start',
          address: leg.start_address,
          distance: leg.distance?.text || 'N/A',
          duration: leg.duration?.text || 'N/A'
        });
      });

      // Add final destination
      const lastLeg = legs[legs.length - 1];
      stops.push({
        order: legs.length,
        storeName: stores[stores.length - 1]?.name || 'End',
        address: lastLeg.end_address,
        distance: '0 mi',
        duration: '0 mins'
      });

      return {
        totalDistance: ((totalDistance / 1000) * 0.621371).toFixed(1) + ' mi',
        totalDuration: formatDuration(totalDuration),
        totalDurationSeconds: totalDuration,
        stops,
        waypointOrder: route.waypoint_order || []
      };
    },
    []
  );

  // Main calculation function
  const calculateRoute = useCallback(
    async (stores: Store[]): Promise<boolean> => {
      if (stores.length < 2) {
        setError('Please select at least 2 stores');
        return false;
      }

      // Validate coordinates
      const validStores = stores.filter(
        s => s.lat && s.lng && !isNaN(s.lat) && !isNaN(s.lng)
      );
      if (validStores.length < 2) {
        setError('Some stores have invalid coordinates');
        return false;
      }

      const storeIds = validStores.map(s => s.id);
      const cached = getCachedRoute(storeIds);
      if (cached) {
        setDirectionsResult(cached);
        const stats = extractRouteStats(cached, validStores);
        setRouteStats(stats);
        setError(null);
        return true;
      }

      setIsOptimizing(true);
      setError(null);

      try {
        const directionsService = new google.maps.DirectionsService();

        // Quick nearest neighbor for instant feedback
        const optimized = optimizeNearestNeighbor(validStores);

        // Request route with Google's optimization
        const result = await directionsService.route({
          origin: optimized[0],
          destination: optimized[optimized.length - 1],
          waypoints: optimized.slice(1, -1).map(store => ({
            location: { lat: store.lat, lng: store.lng },
            stopover: true
          })),
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true
        });

        // Reorder stores based on waypoint_order if optimization occurred
        let finalOrder = optimized;
        if (result.routes[0]?.waypoint_order) {
          const order = result.routes[0].waypoint_order;
          finalOrder = [
            optimized[0],
            ...order.map(idx => optimized[idx + 1]),
            optimized[optimized.length - 1]
          ];
        }

        setDirectionsResult(result);
        const stats = extractRouteStats(result, finalOrder);
        setRouteStats(stats);
        setCachedRoute(storeIds, result);

        return true;
      } catch (err) {
        const errorMsg = handleDirectionsError(err);
        setError(errorMsg);
        setDirectionsResult(null);
        setRouteStats(null);
        return false;
      } finally {
        setIsOptimizing(false);
      }
    },
    [getCachedRoute, extractRouteStats, optimizeNearestNeighbor, setCachedRoute]
  );

  const reset = useCallback(() => {
    setDirectionsResult(null);
    setRouteStats(null);
    setError(null);
  }, []);

  return {
    directionsResult,
    routeStats,
    isOptimizing,
    error,
    calculateRoute,
    reset
  };
}

// Helper function
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function handleDirectionsError(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.includes('INVALID_REQUEST')) {
      return 'Invalid route request. Check store coordinates.';
    }
    if (err.message.includes('MAX_WAYPOINTS_EXCEEDED')) {
      return 'Too many stops (max 25). Try selecting fewer stores.';
    }
    if (err.message.includes('NOT_FOUND')) {
      return 'Could not find a route between these locations.';
    }
    if (err.message.includes('OVER_QUERY_LIMIT')) {
      return 'Too many requests. Please wait and try again.';
    }
    return err.message;
  }
  return 'Failed to calculate route. Please try again.';
}
```

---

## 2. RoutePanel Component

**File to create**: `src/components/RoutePanel/RoutePanel.tsx`

```typescript
import { useCallback, useState, useMemo } from 'react';
import { useStores } from '../../hooks/useStores';
import { useRouteOptimizer } from '../../hooks/useRouteOptimizer';
import { DirectionsRenderer } from '@react-google-maps/api';
import type { Store } from '../../types/store';
import styles from './RoutePanel.module.css';

export function RoutePanel() {
  const { stores } = useStores();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showRoute, setShowRoute] = useState(false);
  const {
    directionsResult,
    routeStats,
    isOptimizing,
    error,
    calculateRoute,
    reset
  } = useRouteOptimizer();

  // Get selected stores in order
  const selectedStores = useMemo(() => {
    return Array.from(selectedIds)
      .map(id => stores.find(s => s.id === id))
      .filter((s): s is Store => !!s);
  }, [selectedIds, stores]);

  // Validate stores have coordinates
  const validStores = useMemo(() => {
    return selectedStores.filter(
      s => s.lat && s.lng && !isNaN(s.lat) && !isNaN(s.lng)
    );
  }, [selectedStores]);

  const handleToggleStore = useCallback((storeId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(storeId)) {
        next.delete(storeId);
      } else {
        next.add(storeId);
      }
      return next;
    });
  }, []);

  const handlePlanRoute = useCallback(async () => {
    const success = await calculateRoute(validStores);
    if (success) {
      setShowRoute(true);
    }
  }, [calculateRoute, validStores]);

  const handleReset = useCallback(() => {
    setSelectedIds(new Set());
    setShowRoute(false);
    reset();
  }, [reset]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(stores.map(s => s.id)));
  }, [stores]);

  const handleClearAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return (
    <div className={styles.routePanel}>
      <div className={styles.header}>
        <h2>Route Planner</h2>
        <button
          className={styles.closeBtn}
          onClick={handleReset}
          aria-label="Close route planner"
        >
          ✕
        </button>
      </div>

      {/* Store Selection */}
      <div className={styles.storeSelection}>
        <div className={styles.selectionHeader}>
          <h3>Select Stores ({selectedIds.size})</h3>
          <div className={styles.buttonGroup}>
            <button
              className={styles.smallBtn}
              onClick={handleSelectAll}
              title="Select all stores"
            >
              All
            </button>
            <button
              className={styles.smallBtn}
              onClick={handleClearAll}
              title="Deselect all stores"
            >
              Clear
            </button>
          </div>
        </div>

        <div className={styles.storeList}>
          {stores.length === 0 ? (
            <p className={styles.emptyMsg}>No stores available</p>
          ) : (
            stores.map(store => (
              <label key={store.id} className={styles.storeItem}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(store.id)}
                  onChange={() => handleToggleStore(store.id)}
                  aria-label={`Select ${store.name}`}
                />
                <span className={styles.storeName}>{store.name}</span>
                <span className={styles.storeAddress}>{store.address}</span>
              </label>
            ))
          )}
        </div>
      </div>

      {/* Validation Messages */}
      {selectedIds.size > 0 && validStores.length !== selectedIds.size && (
        <div className={styles.warning}>
          ⚠️ {selectedIds.size - validStores.length} store(s) have missing
          coordinates
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.actions}>
        <button
          className={styles.planBtn}
          onClick={handlePlanRoute}
          disabled={validStores.length < 2 || isOptimizing}
          title={
            validStores.length < 2
              ? 'Select at least 2 stores to plan route'
              : isOptimizing
                ? 'Calculating route...'
                : 'Plan optimal route'
          }
        >
          {isOptimizing ? 'Calculating...' : 'Plan Route'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.error}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Route Statistics */}
      {showRoute && routeStats && (
        <div className={styles.routeStats}>
          <h3>Route Summary</h3>

          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total Distance</span>
              <span className={styles.statValue}>{routeStats.totalDistance}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total Duration</span>
              <span className={styles.statValue}>
                {routeStats.totalDuration}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Stops</span>
              <span className={styles.statValue}>{routeStats.stops.length}</span>
            </div>
          </div>

          {/* Stop-by-Stop Breakdown */}
          <div className={styles.stopsList}>
            <h4>Visit Order</h4>
            {routeStats.stops.map((stop, index) => (
              <div key={index} className={styles.stopItem}>
                <span className={styles.stopNumber}>{index + 1}</span>
                <div className={styles.stopDetails}>
                  <span className={styles.stopName}>{stop.storeName}</span>
                  <span className={styles.stopAddress}>{stop.address}</span>
                </div>
                <span className={styles.stopDuration}>{stop.duration}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DirectionsRenderer to show on map */}
      {showRoute && directionsResult && <DirectionsRenderer
        directions={directionsResult}
        options={{
          polylineOptions: {
            zIndex: 50,
            strokeColor: '#4285F4',
            strokeWeight: 5,
            strokeOpacity: 0.8,
            geodesic: true
          },
          suppressMarkers: false,
          suppressPolylines: false,
          suppressInfoWindows: false
        }}
      />}
    </div>
  );
}
```

**File to create**: `src/components/RoutePanel/RoutePanel.module.css`

```css
.routePanel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-left: 1px solid #ddd;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
  background: #f5f5f5;
}

.header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.closeBtn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  color: #666;
  border-radius: 4px;
}

.closeBtn:hover {
  background: #eee;
  color: #000;
}

.storeSelection {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.selectionHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.selectionHeader h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.buttonGroup {
  display: flex;
  gap: 8px;
}

.smallBtn {
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.smallBtn:hover {
  border-color: #4285F4;
  color: #4285F4;
}

.storeList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.emptyMsg {
  text-align: center;
  color: #999;
  padding: 20px 0;
  margin: 0;
}

.storeItem {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.storeItem:hover {
  background: #f9f9f9;
  border-color: #ddd;
}

.storeItem input[type='checkbox'] {
  margin-top: 2px;
  cursor: pointer;
  accent-color: #4285F4;
}

.storeName {
  font-weight: 500;
  color: #333;
  flex: 1;
  word-break: break-word;
}

.storeAddress {
  font-size: 12px;
  color: #999;
  flex: 1;
  word-break: break-word;
}

.warning {
  margin: 0 16px;
  padding: 12px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  font-size: 13px;
  color: #856404;
}

.actions {
  padding: 16px;
  border-bottom: 1px solid #eee;
  display: flex;
  gap: 8px;
}

.planBtn {
  flex: 1;
  padding: 12px;
  background: #4285F4;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.planBtn:hover:not(:disabled) {
  background: #2d6ae6;
  box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
}

.planBtn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error {
  margin: 0 16px;
  padding: 12px;
  background: #ffebee;
  border: 1px solid #ef5350;
  border-radius: 4px;
  font-size: 13px;
  color: #c62828;
}

.routeStats {
  padding: 16px;
  background: #f9f9f9;
}

.routeStats h3 {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
}

.statsGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.statItem {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: white;
  border: 1px solid #eee;
  border-radius: 4px;
  text-align: center;
}

.statLabel {
  font-size: 11px;
  color: #999;
  font-weight: 600;
  text-transform: uppercase;
}

.statValue {
  font-size: 16px;
  font-weight: 700;
  color: #4285F4;
}

.stopsList {
  margin-top: 16px;
}

.stopsList h4 {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.stopItem {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: white;
  border: 1px solid #eee;
  border-radius: 4px;
  margin-bottom: 8px;
}

.stopNumber {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  background: #4285F4;
  color: white;
  border-radius: 50%;
  font-weight: 700;
  font-size: 12px;
}

.stopDetails {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.stopName {
  font-weight: 500;
  color: #333;
  font-size: 13px;
  word-break: break-word;
}

.stopAddress {
  font-size: 11px;
  color: #999;
  word-break: break-word;
}

.stopDuration {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}
```

---

## 3. Integration into Map Component

**Add to existing** `/src/components/Map/Map.tsx`:

```typescript
// Add imports at top
import { DirectionsService, DirectionsRenderer } from '@react-google-maps/api';
import { RoutePanel } from '../RoutePanel/RoutePanel';

// Add to Map component state
const [showRoutePlanner, setShowRoutePlanner] = useState(false);

// Add RoutePanel toggle button to the map UI
<div className={styles.mapWrapper}>
  {/* Existing GoogleMap code... */}

  {/* ADD: Toggle button */}
  <button
    onClick={() => setShowRoutePlanner(!showRoutePlanner)}
    className={styles.routePlannerToggle}
    title="Open route planner"
  >
    📍 Route Planner
  </button>

  {/* ADD: Route Panel */}
  {showRoutePlanner && (
    <div className={styles.routePanelContainer}>
      <RoutePanel />
    </div>
  )}
</div>

// Add styles to Map.module.css
.routePlannerToggle {
  position: absolute;
  bottom: 20px;
  right: 20px;
  padding: 12px 16px;
  background: white;
  border: 2px solid #4285F4;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  color: #4285F4;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  z-index: 10;
}

.routePlannerToggle:hover {
  background: #4285F4;
  color: white;
}

.routePanelContainer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 320px;
  background: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 20;
  display: flex;
  flex-direction: column;
}
```

---

## 4. Complete Example: Main Integration

This shows the complete integration in context:

```typescript
// src/components/Map/Map.tsx - Full example with route planner

import { useCallback, useState, useRef, useEffect } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  DirectionsRenderer
} from '@react-google-maps/api';
import { useStores } from '../../hooks/useStores';
import { RoutePanel } from '../RoutePanel/RoutePanel';
import {
  getApiKey,
  loadPreloadedStores,
  getPreloadedStoresCount
} from '../../services/googleMaps';
import { FREDERICK_COUNTY_CENTER } from '../../types/store';
import type { Store } from '../../types/store';
import styles from './Map.module.css';

const libraries: ('places' | 'geometry' | 'drawing')[] = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  mapTypeControlOptions: {
    style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
    position: google.maps.ControlPosition.TOP_RIGHT,
    mapTypeIds: [
      google.maps.MapTypeId.ROADMAP,
      google.maps.MapTypeId.SATELLITE,
      google.maps.MapTypeId.HYBRID
    ]
  },
  streetViewControl: false,
  fullscreenControl: true
};

interface MapProps {
  onApiError: (error: string) => void;
}

export function Map({ onApiError }: MapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: getApiKey(),
    libraries
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRoutePlanner, setShowRoutePlanner] = useState(false);
  const hasLoadedStores = useRef(false);

  const {
    stores,
    getFilteredStores,
    selectStore,
    selectedStoreId,
    mergeGoogleStores
  } = useStores();

  const filteredStores = getFilteredStores();

  const onMapLoad = useCallback(
    async (map: google.maps.Map) => {
      mapRef.current = map;

      if (hasLoadedStores.current || stores.length > 0) {
        return;
      }

      hasLoadedStores.current = true;

      try {
        setIsLoading(true);
        const preloadedStores = await loadPreloadedStores();
        mergeGoogleStores(preloadedStores);
      } catch (error) {
        console.error('Error loading stores:', error);
        onApiError('Failed to load store data.');
      } finally {
        setIsLoading(false);
      }
    },
    [stores.length, mergeGoogleStores, onApiError]
  );

  if (!isLoaded || loadError) {
    return (
      <div className={styles.error}>
        {loadError
          ? 'Failed to load Google Maps'
          : 'Loading map...'}
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
        {filteredStores.map(store => (
          store.lat && store.lng && (
            <Marker
              key={store.id}
              position={{ lat: store.lat, lng: store.lng }}
              onClick={() => selectStore(store.id)}
              title={store.name}
            />
          )
        ))}
      </GoogleMap>

      {/* Route Planner Toggle */}
      <button
        onClick={() => setShowRoutePlanner(!showRoutePlanner)}
        className={styles.routePlannerToggle}
        aria-label="Toggle route planner"
      >
        📍 {showRoutePlanner ? 'Close' : 'Plan Route'}
      </button>

      {/* Route Panel Sidebar */}
      {showRoutePlanner && (
        <div className={styles.routePanelContainer}>
          <RoutePanel />
        </div>
      )}
    </div>
  );
}
```

---

## Testing Checklist

Before deploying, test these scenarios:

- [ ] Select 2 stores and plan route
- [ ] Verify polyline appears on map
- [ ] Check route statistics display correctly
- [ ] Select 50+ stores, verify batching works
- [ ] Clear selection and plan new route
- [ ] Test with missing coordinates
- [ ] Verify caching (plan same route twice)
- [ ] Test on slow connection

