# Route Planner - API Reference & Troubleshooting

## Google Maps Directions API Types

All types from `@react-google-maps/api`:

### DirectionsRequest

```typescript
interface DirectionsRequest {
  // Required
  origin: google.maps.LatLngLiteral | string | google.maps.Place;
  destination: google.maps.LatLngLiteral | string | google.maps.Place;
  travelMode: google.maps.TravelMode;

  // Optional but recommended
  waypoints?: google.maps.DirectionsWaypoint[];
  optimizeWaypoints?: boolean;

  // Optional
  alternatives?: boolean;
  language?: string;
  region?: string;
  unitSystem?: google.maps.UnitSystem;
  durationInTraffic?: boolean;
  avoidFerries?: boolean;
  avoidHighways?: boolean;
  avoidTolls?: boolean;
  restrictions?: {
    avoidFeature?: string[];
  };
  provideRouteAlternatives?: boolean;
}
```

### DirectionsWaypoint

```typescript
interface DirectionsWaypoint {
  location: google.maps.LatLngLiteral | string | google.maps.Place;
  stopover?: boolean;  // default: true
}
```

### DirectionsResult

```typescript
interface DirectionsResult {
  routes: DirectionsRoute[];
  geocoded_waypoints: DirectionsGeocodedWaypoint[];
  status: DirectionsStatus;
}

interface DirectionsRoute {
  bounds: google.maps.LatLngBounds;
  copyrights: string;
  legs: DirectionsLeg[];
  overview_polyline: OverviewPolyline;
  overview_path: google.maps.LatLng[];
  warnings: string[];
  waypoint_order?: number[];  // IMPORTANT: Reordered waypoint indices
}

interface DirectionsLeg {
  distance: TextValueObject;        // {text: "5.2 mi", value: 8371}
  duration: TextValueObject;        // {text: "10 mins", value: 600}
  duration_in_traffic?: TextValueObject;
  start_address: string;
  end_address: string;
  end_location: google.maps.LatLng;
  start_location: google.maps.LatLng;
  steps: DirectionsStep[];
}

interface DirectionsStep {
  distance: TextValueObject;
  duration: TextValueObject;
  end_location: google.maps.LatLng;
  start_location: google.maps.LatLng;
  maneuver?: string;
  polyline: OverviewPolyline;
  instructions: string;
  transit_details?: TransitDetails;
}

interface TextValueObject {
  text: string;
  value: number;
}

interface DirectionsGeocodedWaypoint {
  geocoder_status: GeocoderStatus;
  place_id?: string;
  types?: string[];
  partial_match?: boolean;
}
```

---

## TravelMode Options

```typescript
enum google.maps.TravelMode {
  DRIVING = "DRIVING",
  WALKING = "WALKING",
  BICYCLING = "BICYCLING",
  TRANSIT = "TRANSIT"
}
```

---

## Status Codes

```typescript
enum DirectionsStatus {
  OK = "OK",                          // Success
  NOT_FOUND = "NOT_FOUND",           // No route found
  ZERO_RESULTS = "ZERO_RESULTS",     // No results found
  MAX_WAYPOINTS_EXCEEDED = "MAX_WAYPOINTS_EXCEEDED",  // 25+ waypoints
  INVALID_REQUEST = "INVALID_REQUEST", // Invalid parameters
  OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",  // Too many requests
  REQUEST_DENIED = "REQUEST_DENIED",  // API key issues
  UNKNOWN_ERROR = "UNKNOWN_ERROR"    // Server error
}
```

---

## Troubleshooting Guide

### Problem: "MAX_WAYPOINTS_EXCEEDED"

**Cause**: Trying to use more than 25 waypoints in one request.

**Solution 1 - Use fewer stores**:
```typescript
const validStores = selectedStores.slice(0, 25);
```

**Solution 2 - Batch requests**:
```typescript
function batchStores(stores: Store[], batchSize: number = 24): Store[][] {
  const batches: Store[][] = [];
  for (let i = 0; i < stores.length; i += batchSize) {
    batches.push(stores.slice(i, i + batchSize + 1));
  }
  return batches;
}

// Then calculate route for each batch
for (const batch of batches) {
  await calculateRoute(batch);
}
```

---

### Problem: "INVALID_REQUEST"

**Cause**: Invalid coordinates or parameters.

**Debug**:
```typescript
// Check coordinates
const validStores = stores.filter(s => {
  const valid = s.lat && s.lng && !isNaN(s.lat) && !isNaN(s.lng);
  if (!valid) {
    console.warn(`Invalid coords for ${s.name}: lat=${s.lat}, lng=${s.lng}`);
  }
  return valid;
});

console.log(`Valid stores: ${validStores.length}/${stores.length}`);
```

---

### Problem: "NOT_FOUND" or "ZERO_RESULTS"

**Cause**: No route exists between the selected stores.

**Why**:
- Stores might be on islands with no road access
- Invalid address data in database

**Solution**:
```typescript
// Try different travel mode
const modes = [
  google.maps.TravelMode.DRIVING,
  google.maps.TravelMode.WALKING,
  google.maps.TravelMode.BICYCLING
];

for (const mode of modes) {
  try {
    const result = await directionsService.route({
      ...request,
      travelMode: mode
    });
    if (result.routes[0]) {
      return result;
    }
  } catch (e) {
    // Try next mode
  }
}
```

---

### Problem: "OVER_QUERY_LIMIT"

**Cause**: Hit API quota limit.

**Limits**:
- Free tier: 25,000 requests/day
- Premium: No daily limit but 100 QPS

**Solution**:
```typescript
// 1. Cache aggressively
const cacheKey = selectedIds.sort().join(',');
if (routeCache.has(cacheKey)) {
  return routeCache.get(cacheKey);
}

// 2. Debounce route calculations
const debouncedCalculateRoute = useMemo(
  () => debounce(calculateRoute, 1000),
  []
);

// 3. Request traffic data only during peak hours
const isDuringPeakHours = new Date().getHours() >= 9 &&
                          new Date().getHours() <= 17;

const result = await directionsService.route({
  ...request,
  durationInTraffic: isDuringPeakHours  // Saves quota
});
```

---

### Problem: "REQUEST_DENIED"

**Cause**: API key invalid, expired, or not enabled.

**Solution**:
```typescript
// 1. Verify .env file
console.log('API Key:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

// 2. Check API is enabled in Google Cloud Console:
// - Go to console.cloud.google.com
// - Enable "Directions API"
// - Enable "Maps JavaScript API"

// 3. Verify API key restrictions
// - Should allow Maps, Directions, Places APIs
// - IP whitelist should not block your IP
```

---

### Problem: Route Wrong or Inefficient

**Cause**:
- optimizeWaypoints not working as expected
- Waypoint order not optimized

**Debug**:
```typescript
const result = await directionsService.route({
  ...request,
  optimizeWaypoints: true
});

// Check if optimization occurred
console.log('Original order:', stores.map(s => s.id));
console.log('Optimized order:', result.routes[0].waypoint_order);
console.log('Was optimized?',
  JSON.stringify(result.routes[0].waypoint_order) !==
  JSON.stringify([0, 1, 2, 3, 4])
);

// Check total distance
const totalDistance = result.routes[0].legs.reduce(
  (sum, leg) => sum + (leg.distance?.value || 0),
  0
);
console.log(`Total distance: ${(totalDistance / 1609).toFixed(2)} miles`);
```

---

### Problem: Polyline Not Showing on Map

**Cause**:
- DirectionsRenderer not mounted
- Wrong z-index
- Map zoom too low

**Solution**:
```typescript
{/* Make sure DirectionsRenderer is inside GoogleMap */}
<GoogleMap>
  {/* Other components */}

  {/* This must be inside GoogleMap */}
  <DirectionsRenderer
    directions={directionsResult}
    options={{
      polylineOptions: {
        zIndex: 50,  // Higher than markers
        strokeColor: '#4285F4',
        strokeWeight: 5,
        strokeOpacity: 0.8
      }
    }}
  />
</GoogleMap>

// Ensure result exists
console.log('Directions result:', directionsResult);
console.log('Routes available:', directionsResult?.routes.length);
console.log('Legs in first route:', directionsResult?.routes[0]?.legs.length);
```

---

### Problem: Slow Performance

**Cause**:
- Too many stores selected
- API latency
- Rendering many polylines

**Optimization**:
```typescript
// 1. Limit selection
const MAX_STORES = 25;
if (selectedStores.length > MAX_STORES) {
  showWarning(`Maximum ${MAX_STORES} stores. Please select fewer.`);
  return;
}

// 2. Use smaller request intervals
const debouncedCalcRoute = useMemo(
  () => debounce(calculateRoute, 2000),  // 2 second delay
  []
);

// 3. Show loading state
{isOptimizing && <Spinner />}

// 4. Consider backend optimization for 50+ stores
// Instead of calling Directions API,
// use your backend to calculate optimal TSP solution
```

---

## Performance Benchmarks

### Request Times (Typical)

| Stores | Waypoints | Time | Cached |
|--------|-----------|------|--------|
| 2      | 0         | 200ms | <5ms |
| 5      | 3         | 250ms | <5ms |
| 10     | 8         | 300ms | <5ms |
| 25     | 23        | 400ms | <5ms |

### Data Sizes

| Stores | Response Size | Polyline Length |
|--------|---------------|-----------------|
| 5      | 15 KB         | 200 points      |
| 10     | 25 KB         | 350 points      |
| 25     | 60 KB         | 800 points      |

---

## Common Integration Patterns

### Pattern 1: Simple Route with Waypoints

```typescript
const directionsService = new google.maps.DirectionsService();

const result = await directionsService.route({
  origin: stores[0],
  destination: stores[stores.length - 1],
  waypoints: stores.slice(1, -1).map(s => ({ location: s })),
  travelMode: google.maps.TravelMode.DRIVING
});

// Display
return <DirectionsRenderer directions={result} />;
```

### Pattern 2: Optimized Waypoints with Caching

```typescript
const getCachedRoute = (ids: string[]) => {
  const key = ids.join(',');
  return routeCache.get(key);
};

const calculateRoute = async (stores: Store[]) => {
  const key = stores.map(s => s.id).join(',');
  const cached = getCachedRoute(key);
  if (cached) return cached;

  const result = await directionsService.route({
    origin: stores[0],
    destination: stores[stores.length - 1],
    waypoints: stores.slice(1, -1).map(s => ({ location: s })),
    travelMode: google.maps.TravelMode.DRIVING,
    optimizeWaypoints: true  // Key for optimization
  });

  routeCache.set(key, result);
  return result;
};
```

### Pattern 3: Batch Processing for 50+ Stores

```typescript
const calculateBatchRoutes = async (stores: Store[]) => {
  const batchSize = 24;
  const results: google.maps.DirectionsResult[] = [];

  for (let i = 0; i < stores.length; i += batchSize) {
    const batch = stores.slice(i, i + batchSize + 1);
    const result = await directionsService.route({
      origin: batch[0],
      destination: batch[batch.length - 1],
      waypoints: batch.slice(1, -1).map(s => ({ location: s })),
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: true
    });
    results.push(result);
  }

  return results;
};
```

---

## Environment Configuration

### Required Environment Variables

```bash
# .env or .env.local
VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
```

### Loading in Vite

```typescript
// src/services/googleMaps.ts
export function getApiKey(): string {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error('VITE_GOOGLE_MAPS_API_KEY environment variable is not set');
  }
  return key;
}
```

---

## TypeScript Definitions Extension

To extend types for custom properties:

```typescript
// types/google-maps.d.ts
declare namespace google.maps {
  interface LatLngLiteral {
    // Already defined, no changes needed
  }
}

// Extend Store type to include route properties
export interface StoreWithRoute extends Store {
  routeIndex?: number;        // Position in route
  distanceToNext?: number;    // Meters
  durationToNext?: number;    // Seconds
}
```

---

## Debugging Checklist

When something isn't working:

1. **Check API Key**
   ```typescript
   console.log('API Key loaded:', !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
   ```

2. **Verify Stores Data**
   ```typescript
   console.table(stores.map(s => ({ name: s.name, lat: s.lat, lng: s.lng })));
   ```

3. **Check Request Parameters**
   ```typescript
   console.log('Request:', {
     origin: stores[0],
     destination: stores[stores.length - 1],
     waypoints: stores.slice(1, -1).length,
     travelMode: 'DRIVING',
     optimizeWaypoints: true
   });
   ```

4. **Monitor Response Status**
   ```typescript
   const result = await directionsService.route(request);
   console.log('Status:', result.status);
   if (result.status !== 'OK') {
     console.error('Routes:', result.routes.length);
   }
   ```

5. **Trace Rendering**
   ```typescript
   console.log('DirectionsRenderer props:', {
     hasDirections: !!directionsResult,
     routeCount: directionsResult?.routes.length,
     legCount: directionsResult?.routes[0]?.legs.length
   });
   ```

