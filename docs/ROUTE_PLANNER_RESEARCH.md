# Route Planner Implementation Research

## Project Context

**Application**: Liquor Stores Tracker with React Route Planning
- **Framework**: React 18.3.1 + TypeScript 5.3
- **Maps Library**: @react-google-maps/api v2.20.8
- **Data Source**: `useStores` hook providing `Store[]` with lat/lng
- **API Key**: `VITE_GOOGLE_MAPS_API_KEY` environment variable
- **Current Location**: `/src/components/Map/Map.tsx`

---

## 1. Google Maps Directions API - Multiple Waypoints

### API Request Structure

The Google Maps Directions API accepts multiple stops through the waypoints parameter:

```typescript
interface DirectionsRequest {
  origin: google.maps.LatLngLiteral;          // First store
  destination: google.maps.LatLngLiteral;     // Last store
  waypoints: DirectionsWaypoint[];            // Intermediate stores (max 25)
  travelMode: google.maps.TravelMode;         // 'DRIVING', 'WALKING', etc.
  optimizeWaypoints?: boolean;                // Reorder for optimal route
  unitSystem?: number;                        // google.maps.UnitSystem.METRIC
}

interface DirectionsWaypoint {
  location: google.maps.LatLngLiteral;
  stopover?: boolean;                         // true = marker shown
}
```

### Concrete Example: 5-Store Route Request

```typescript
// Given stores from useStores hook
const stores: Store[] = [
  { id: '1', name: 'Store A', lat: 39.410, lng: -77.411, ... },
  { id: '2', name: 'Store B', lat: 39.415, lng: -77.415, ... },
  { id: '3', name: 'Store C', lat: 39.420, lng: -77.420, ... },
  { id: '4', name: 'Store D', lat: 39.425, lng: -77.425, ... },
  { id: '5', name: 'Store E', lat: 39.430, lng: -77.430, ... },
];

// Build request
const directionsRequest: google.maps.DirectionsRequest = {
  origin: stores[0],                          // Store A
  destination: stores[4],                     // Store E
  waypoints: [
    { location: stores[1], stopover: true },  // Store B
    { location: stores[2], stopover: true },  // Store C
    { location: stores[3], stopover: true },  // Store D
  ],
  travelMode: google.maps.TravelMode.DRIVING,
  optimizeWaypoints: true,                    // Google reorders B,C,D for best route
};
```

### Key Constraints

1. **Waypoint Limits**:
   - Max 25 waypoints per request
   - For 50+ stores, batch into multiple requests
   - Each waypoint counts as 1 toward quota

2. **API Quota**:
   - Free tier: 25,000 requests/day, 50/second
   - Each optimization request = 1 quota unit
   - Each route with 25 waypoints = 1 request

3. **Return Value** - `DirectionsResult`:
```typescript
interface DirectionsResult {
  routes: DirectionsRoute[];
  geocoded_waypoints: DirectionsGeocodedWaypoint[];
  status: DirectionsStatus;
}

interface DirectionsRoute {
  overview_polyline: OverviewPolyline;        // Encoded polyline for full route
  legs: DirectionsLeg[];                      // Each leg between waypoints
  bounds: LatLngBounds;                       // Bounding box for route
  copyrights: string;
  warnings: string[];
  waypoint_order?: number[];                  // Reordered indices if optimizeWaypoints=true
}

interface DirectionsLeg {
  distance: TextValueObject;                  // {text: "5.2 mi", value: 8371}
  duration: TextValueObject;                  // {text: "10 mins", value: 600}
  start_address: string;
  end_address: string;
  start_location: LatLng;
  end_location: LatLng;
  steps: DirectionsStep[];
}
```

---

## 2. Route Optimization - Reordering Waypoints

### Strategy 1: Google's Built-in Optimization (Recommended)

Use the `optimizeWaypoints: true` parameter:

```typescript
const directionsRequest: google.maps.DirectionsRequest = {
  origin: startingStore,
  destination: endingStore,
  waypoints: stores.slice(1, -1).map(store => ({
    location: store,
    stopover: true
  })),
  travelMode: google.maps.TravelMode.DRIVING,
  optimizeWaypoints: true  // <-- Enables server-side TSP optimization
};

// After response, read waypoint_order to see reordering
const result: DirectionsResult = await directionsPromise;
const originalOrder = [0, 1, 2, 3, 4];
const optimizedOrder = result.routes[0].waypoint_order; // e.g., [2, 0, 3, 1, 4]

console.log('Visit in order:', optimizedOrder.map(idx => stores[idx].name));
```

**Pros**:
- Server-side optimization (sophisticated algorithm)
- Typically 10-30% distance reduction
- Handles traffic patterns, turn penalties

**Cons**:
- API request required
- Costs 1 quota unit per request
- Limited to 25 waypoints per request

### Strategy 2: Client-side Nearest Neighbor (Quick Local Optimization)

For instant feedback without API calls:

```typescript
function optimizeWaypointsNearestNeighbor(
  stores: Store[],
  startingStore: Store
): Store[] {
  const unvisited = stores.filter(s => s.id !== startingStore.id);
  const optimized: Store[] = [startingStore];
  let current = startingStore;

  while (unvisited.length > 0) {
    // Find nearest unvisited store
    const nearest = unvisited.reduce((prev, curr) => {
      const currDist = haversineDistance(current, curr);
      const prevDist = haversineDistance(current, prev);
      return currDist < prevDist ? curr : prev;
    });

    optimized.push(nearest);
    current = nearest;
    // Remove from unvisited
    unvisited.splice(unvisited.indexOf(nearest), 1);
  }

  return optimized;
}

// Haversine distance formula (km)
function haversineDistance(
  store1: Store,
  store2: Store
): number {
  const R = 6371; // Earth radius in km
  const dLat = (store2.lat - store1.lat) * Math.PI / 180;
  const dLng = (store2.lng - store1.lng) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(store1.lat * Math.PI / 180) *
    Math.cos(store2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

**Pros**:
- No API calls needed
- Fast (instant for <100 stores)
- Great for interactive preview

**Cons**:
- Greedy algorithm, suboptimal (typically 20-40% worse than optimal)
- Doesn't account for traffic/turn penalties

### Strategy 3: Combine Both (Recommended Production Approach)

```typescript
function useRouteOptimization(selectedStores: Store[]) {
  const [optimizedOrder, setOptimizedOrder] = useState<Store[]>(selectedStores);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [routeStats, setRouteStats] = useState<{
    distance: string;
    duration: string;
  } | null>(null);

  // Instant local optimization
  useEffect(() => {
    if (selectedStores.length > 1) {
      const quickOrder = optimizeWaypointsNearestNeighbor(
        selectedStores,
        selectedStores[0]
      );
      setOptimizedOrder(quickOrder);
    }
  }, [selectedStores]);

  // Server optimization for better route
  const calculateOptimalRoute = useCallback(async () => {
    if (selectedStores.length < 2) return;

    setIsOptimizing(true);
    try {
      const directionsService = new google.maps.DirectionsService();
      const result = await directionsService.route({
        origin: optimizedOrder[0],
        destination: optimizedOrder[optimizedOrder.length - 1],
        waypoints: optimizedOrder.slice(1, -1).map(store => ({
          location: store,
          stopover: true
        })),
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: true
      });

      // Reorder based on waypoint_order
      if (result.routes[0]?.waypoint_order) {
        const order = result.routes[0].waypoint_order;
        const reordered = [
          optimizedOrder[0],
          ...order.map(idx => optimizedOrder[idx + 1]),
          optimizedOrder[optimizedOrder.length - 1]
        ];
        setOptimizedOrder(reordered);
      }

      // Extract stats
      const leg = result.routes[0].legs[0];
      setRouteStats({
        distance: leg.distance?.text || 'N/A',
        duration: leg.duration?.text || 'N/A'
      });
    } catch (error) {
      console.error('Route optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [optimizedOrder]);

  return {
    optimizedOrder,
    routeStats,
    isOptimizing,
    calculateOptimalRoute
  };
}
```

---

## 3. @react-google-maps/api - DirectionsService & DirectionsRenderer

### Component Integration

```typescript
import {
  DirectionsService,
  DirectionsRenderer,
  GoogleMap,
  useJsApiLoader
} from '@react-google-maps/api';

interface RouteRendererProps {
  stores: Store[];
  isVisible: boolean;
}

export function RoutePlannerOverlay({ stores, isVisible }: RouteRendererProps) {
  const [directionsResult, setDirectionsResult] = useState<
    google.maps.DirectionsResult | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  if (!isVisible || stores.length < 2) {
    return null;
  }

  const onDirectionsLoad = (result: google.maps.DirectionsResult) => {
    setDirectionsResult(result);
    setError(null);
  };

  const onDirectionsError = (error: google.maps.DirectionsStatus) => {
    setError(`Directions error: ${error}`);
    setDirectionsResult(null);
  };

  return (
    <>
      <DirectionsService
        options={{
          origin: stores[0],
          destination: stores[stores.length - 1],
          waypoints: stores.slice(1, -1).map(store => ({
            location: store,
            stopover: true
          })),
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true
        }}
        onLoad={onDirectionsLoad}
        onError={onDirectionsError}
      />

      {directionsResult && (
        <DirectionsRenderer
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
        />
      )}

      {error && (
        <div style={{
          padding: '10px',
          background: '#ffebee',
          color: '#c62828',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
    </>
  );
}
```

### Integrating into Existing Map Component

The current `/src/components/Map/Map.tsx` structure:

```typescript
// Map.tsx - ADD THIS to existing component

import { DirectionsService, DirectionsRenderer } from '@react-google-maps/api';

interface MapProps {
  onApiError: (error: string) => void;
}

export function Map({ onApiError }: MapProps) {
  // Existing state...
  const [directionsResult, setDirectionsResult] = useState<
    google.maps.DirectionsResult | null
  >(null);
  const [selectedForRoute, setSelectedForRoute] = useState<string[]>([]);
  const [showRoute, setShowRoute] = useState(false);

  // Get selected stores for route
  const routeStores = selectedForRoute
    .map(id => stores.find(s => s.id === id))
    .filter((s): s is Store => !!s);

  return (
    <div className={styles.mapWrapper}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={FREDERICK_COUNTY_CENTER}
        zoom={11}
        options={mapOptions}
        onLoad={onMapLoad}
      >
        {/* Existing markers */}
        {filteredStores.map((store) => (
          <Marker key={store.id} {...markerProps} />
        ))}

        {/* NEW: Route rendering */}
        {showRoute && routeStores.length > 1 && (
          <>
            <DirectionsService
              options={{
                origin: routeStores[0],
                destination: routeStores[routeStores.length - 1],
                waypoints: routeStores.slice(1, -1).map(s => ({
                  location: s,
                  stopover: true
                })),
                travelMode: google.maps.TravelMode.DRIVING,
                optimizeWaypoints: true
              }}
              onLoad={(result) => setDirectionsResult(result)}
              onError={(err) => console.error('Directions error:', err)}
            />

            {directionsResult && (
              <DirectionsRenderer
                directions={directionsResult}
                options={{
                  polylineOptions: {
                    zIndex: 50,
                    strokeColor: '#4285F4',
                    strokeWeight: 5,
                    strokeOpacity: 0.8
                  }
                }}
              />
            )}
          </>
        )}
      </GoogleMap>
    </div>
  );
}
```

---

## 4. Route Polyline Rendering Details

### DirectionsRenderer Options

```typescript
interface DirectionsRendererOptions {
  // Polyline customization
  polylineOptions?: google.maps.PolylineOptions;

  // Marker control
  suppressMarkers?: boolean;           // Hide start/end markers
  suppressPolylines?: boolean;         // Hide route line

  // Info windows
  suppressInfoWindows?: boolean;       // Hide tooltips

  // Appearance
  draggablePolyline?: boolean;         // Allow user to drag route
}

interface PolylineOptions {
  strokeColor?: string;                // Hex color: '#4285F4'
  strokeOpacity?: number;              // 0-1, default 1.0
  strokeWeight?: number;               // Pixels, default 1
  fillColor?: string;                  // For polygons
  fillOpacity?: number;                // 0-1
  icons?: Array<{...}>;                // Animated icons on line
  zIndex?: number;                     // Rendering order
  clickable?: boolean;                 // Can click polyline
  geodesic?: boolean;                  // Follow Earth curvature
  visible?: boolean;                   // Show/hide
}
```

### Color Schemes for Routes

```typescript
// Professional (Blue - Default)
const professionalStyle: google.maps.PolylineOptions = {
  strokeColor: '#4285F4',
  strokeWeight: 5,
  strokeOpacity: 0.8
};

// High Visibility (Orange)
const highVisibilityStyle: google.maps.PolylineOptions = {
  strokeColor: '#FF9800',
  strokeWeight: 6,
  strokeOpacity: 0.9
};

// Subtle (Gray)
const subtleStyle: google.maps.PolylineOptions = {
  strokeColor: '#9E9E9E',
  strokeWeight: 3,
  strokeOpacity: 0.6
};

// Animated (with dashing effect)
const animatedStyle: google.maps.PolylineOptions = {
  strokeColor: '#4CAF50',
  strokeWeight: 4,
  strokeOpacity: 0.7,
  icons: [
    {
      icon: {path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3},
      offset: '0%',
      repeat: '20px'
    }
  ]
};
```

### Extracting Route Information

```typescript
function extractRouteInfo(result: google.maps.DirectionsResult): RouteInfo {
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
      location: leg.start_address,
      distance: leg.distance?.text || 'N/A',
      duration: leg.duration?.text || 'N/A'
    });
  });

  // Add final destination
  const lastLeg = legs[legs.length - 1];
  stops.push({
    order: legs.length,
    location: lastLeg.end_address,
    distance: '0 mi',
    duration: '0 mins'
  });

  return {
    totalDistance: (totalDistance / 1609.34).toFixed(1) + ' mi', // Convert meters to miles
    totalDuration: formatDuration(totalDuration),
    totalDurationSeconds: totalDuration,
    stops,
    waypoints: result.geocoded_waypoints,
    waypointOrder: route.waypoint_order || []
  };
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
```

---

## 5. Batching for Large Store Lists

When you have 50+ stores and need to visit them all:

```typescript
// Split stores into segments (max 25 waypoints per request)
function createRouteBatches(stores: Store[]): Store[][] {
  const batchSize = 24; // 24 waypoints + origin + destination = 26 total
  const batches: Store[][] = [];

  for (let i = 0; i < stores.length; i += batchSize) {
    batches.push(stores.slice(i, i + batchSize + 1));
  }

  return batches;
}

// Calculate routes for each batch
async function calculateBatchRoutes(
  batches: Store[][]
): Promise<google.maps.DirectionsResult[]> {
  const directionsService = new google.maps.DirectionsService();
  const results: google.maps.DirectionsResult[] = [];

  for (const batch of batches) {
    if (batch.length < 2) continue;

    const result = await directionsService.route({
      origin: batch[0],
      destination: batch[batch.length - 1],
      waypoints: batch.slice(1, -1).map(s => ({
        location: s,
        stopover: true
      })),
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: true
    });

    results.push(result);
  }

  return results;
}
```

---

## 6. Current App Integration Points

### useStores Hook Integration

The `useStores()` hook provides:
```typescript
interface StoreContextValue extends StoreState {
  stores: Store[];                    // All stores
  getFilteredStores: () => Store[];   // Filtered stores
  selectedStoreId: string | null;     // Currently selected
  selectedStore: Store | null;        // Full store object
}
```

**Usage in route planner**:
```typescript
function RouteSelector() {
  const { stores, getFilteredStores } = useStores();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Get selected store objects for route
  const selectedStores = stores.filter(s => selectedIds.includes(s.id));

  // Validate stores have coordinates
  const validStores = selectedStores.filter(s => s.lat && s.lng);

  return (
    <div>
      {validStores.length > 1 && (
        <button onClick={() => calculateRoute(validStores)}>
          Plan Route
        </button>
      )}
    </div>
  );
}
```

### Environment Setup

The app already has Google Maps API key configured:
```typescript
// From /src/services/googleMaps (existing)
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Add directions library
const libraries: ('places' | 'geometry' | 'drawing')[] = [
  'places',
  // 'geometry',  // For distance calculations
  // 'directions' // Not needed - included with basic API
];
```

---

## 7. Production Considerations

### Caching Strategy

```typescript
interface CachedRoute {
  storeIds: string[];                      // Hash key
  result: google.maps.DirectionsResult;
  timestamp: number;
  expiresIn: number;                       // Milliseconds
}

class RouteCache {
  private cache = new Map<string, CachedRoute>();
  private maxSize = 50;
  private ttl = 1000 * 60 * 5;            // 5 minutes

  getKey(storeIds: string[]): string {
    return storeIds.sort().join(',');
  }

  get(storeIds: string[]): google.maps.DirectionsResult | null {
    const key = this.getKey(storeIds);
    const cached = this.cache.get(key);

    if (!cached) return null;
    if (Date.now() - cached.timestamp > cached.expiresIn) {
      this.cache.delete(key);
      return null;
    }

    return cached.result;
  }

  set(
    storeIds: string[],
    result: google.maps.DirectionsResult
  ): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const oldest = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0];
      if (oldest) this.cache.delete(oldest[0]);
    }

    const key = this.getKey(storeIds);
    this.cache.set(key, {
      storeIds,
      result,
      timestamp: Date.now(),
      expiresIn: this.ttl
    });
  }
}
```

### Error Handling

```typescript
function handleDirectionsError(status: google.maps.DirectionsStatus) {
  const errorMessages: Record<google.maps.DirectionsStatus, string> = {
    [google.maps.DirectionsStatus.INVALID_REQUEST]:
      'Invalid route request. Check store coordinates.',
    [google.maps.DirectionsStatus.MAX_WAYPOINTS_EXCEEDED]:
      'Too many stops. Maximum 25 waypoints allowed.',
    [google.maps.DirectionsStatus.NOT_FOUND]:
      'Could not find route. Stores may be unreachable.',
    [google.maps.DirectionsStatus.OVER_QUERY_LIMIT]:
      'Too many requests. Please wait and try again.',
    [google.maps.DirectionsStatus.REQUEST_DENIED]:
      'Request denied. Check API key and permissions.',
    [google.maps.DirectionsStatus.UNKNOWN_ERROR]:
      'Unknown error occurred. Please try again.',
    [google.maps.DirectionsStatus.ZERO_RESULTS]:
      'No route found between these locations.'
  };

  return errorMessages[status] || 'Unknown directions error';
}
```

---

## Summary: Implementation Roadmap

| Step | Component | Key Code |
|------|-----------|----------|
| 1 | Route Selection UI | Checkbox list of stores, "Plan Route" button |
| 2 | Optimization | Nearest neighbor + Google optimization |
| 3 | DirectionsService | Request with optimizeWaypoints=true |
| 4 | DirectionsRenderer | Display polyline on existing map |
| 5 | Route Stats | Show distance, duration, stop order |
| 6 | Caching | Cache routes by store ID array |
| 7 | Error Handling | Graceful fallbacks for API errors |
| 8 | Batching | Handle 50+ stores with multiple requests |

---

## References

- [Google Maps Directions API Docs](https://developers.google.com/maps/documentation/directions)
- [@react-google-maps/api GitHub](https://github.com/JustFlyingShy/react-google-maps-api)
- [DirectionsRenderer Reference](https://developers.google.com/maps/documentation/javascript/reference/directions)
- Store type: `/src/types/store.ts`
- Map component: `/src/components/Map/Map.tsx`
- useStores hook: `/src/hooks/useStores.tsx`
