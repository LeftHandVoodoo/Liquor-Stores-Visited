# Route Planner Architecture Design

**Feature:** Route planning for liquor store visits
**Date:** 2026-01-21
**Status:** Design Phase

## Overview

This document outlines the architecture for adding route planning capabilities to the liquor store tracker app. Users will be able to select multiple stores, optimize the route, and view turn-by-turn directions.

---

## 1. New Components

### `src/components/RoutePlanner/RoutePlanner.tsx`

**Purpose:** Main container component for route planning UI

**Location:** Fixed panel on left side of map (opposite SlidePanel)

**State:**
- `isExpanded: boolean` - Panel visibility
- `isOptimizing: boolean` - Loading state during optimization

**Features:**
- List of selected stores (scrollable)
- Route summary (distance, duration, stops)
- Action buttons (Optimize, Clear, Open in Maps)
- Toggle button to show/hide panel

**Props:**
```typescript
interface RoutePlannerProps {
  className?: string;
}
```

---

### `src/components/RoutePlanner/RouteStoreItem.tsx`

**Purpose:** Individual store item in the route list

**Features:**
- Display store name and position in route (e.g., "1. Store Name")
- Remove button (X icon)
- Up/Down arrows for manual reordering
- Click to highlight store on map

**Props:**
```typescript
interface RouteStoreItemProps {
  store: Store;
  position: number; // 1-based position in route
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSelect: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}
```

---

### `src/components/RoutePlanner/RouteControls.tsx`

**Purpose:** Action buttons and route summary

**Features:**
- "Optimize Route" button (disabled if < 2 stores)
- "Clear Route" button
- "Open in Google Maps" button
- Summary display: "X stops • Y miles • Z minutes"

**Props:**
```typescript
interface RouteControlsProps {
  storeCount: number;
  totalDistance: string | null;
  totalDuration: string | null;
  isOptimized: boolean;
  onOptimize: () => void;
  onClear: () => void;
  onOpenInMaps: () => void;
}
```

---

## 2. State Management Changes

### New State Fields in `useStores` hook:

```typescript
interface StoreState {
  // ... existing fields
  routeStoreIds: string[];           // Ordered list of store IDs in route
  routeDirections: google.maps.DirectionsResult | null;
  routeOptimized: boolean;           // Track if route has been optimized
}
```

### New Reducer Actions:

```typescript
type StoreAction =
  // ... existing actions
  | { type: 'ADD_TO_ROUTE'; payload: string }
  | { type: 'REMOVE_FROM_ROUTE'; payload: string }
  | { type: 'REORDER_ROUTE'; payload: string[] }
  | { type: 'OPTIMIZE_ROUTE'; payload: string[] } // Payload is optimized order
  | { type: 'CLEAR_ROUTE' }
  | { type: 'SET_ROUTE_DIRECTIONS'; payload: google.maps.DirectionsResult | null };
```

### Reducer Implementation:

```typescript
case 'ADD_TO_ROUTE':
  // Don't add duplicates
  if (state.routeStoreIds.includes(action.payload)) {
    return state;
  }
  return {
    ...state,
    routeStoreIds: [...state.routeStoreIds, action.payload],
    routeDirections: null, // Clear directions when route changes
    routeOptimized: false,
  };

case 'REMOVE_FROM_ROUTE':
  return {
    ...state,
    routeStoreIds: state.routeStoreIds.filter(id => id !== action.payload),
    routeDirections: null,
    routeOptimized: false,
  };

case 'REORDER_ROUTE':
  return {
    ...state,
    routeStoreIds: action.payload,
    routeDirections: null,
    routeOptimized: false,
  };

case 'OPTIMIZE_ROUTE':
  return {
    ...state,
    routeStoreIds: action.payload,
    routeOptimized: true,
    // routeDirections set separately via SET_ROUTE_DIRECTIONS
  };

case 'CLEAR_ROUTE':
  return {
    ...state,
    routeStoreIds: [],
    routeDirections: null,
    routeOptimized: false,
  };

case 'SET_ROUTE_DIRECTIONS':
  return {
    ...state,
    routeDirections: action.payload,
  };
```

### New Context Methods:

```typescript
interface StoreContextValue {
  // ... existing methods

  // Route management
  routeStoreIds: string[];
  routeDirections: google.maps.DirectionsResult | null;
  routeOptimized: boolean;

  addToRoute: (storeId: string) => void;
  removeFromRoute: (storeId: string) => void;
  reorderRoute: (orderedIds: string[]) => void;
  optimizeRoute: () => Promise<void>;
  clearRoute: () => void;
  isStoreInRoute: (storeId: string) => boolean;
  getRouteStores: () => Store[];
}
```

### Context Method Implementations:

```typescript
const addToRoute = useCallback((storeId: string) => {
  dispatch({ type: 'ADD_TO_ROUTE', payload: storeId });
}, []);

const removeFromRoute = useCallback((storeId: string) => {
  dispatch({ type: 'REMOVE_FROM_ROUTE', payload: storeId });
}, []);

const reorderRoute = useCallback((orderedIds: string[]) => {
  dispatch({ type: 'REORDER_ROUTE', payload: orderedIds });
}, []);

const optimizeRoute = useCallback(async () => {
  const routeStores = state.stores.filter(s =>
    state.routeStoreIds.includes(s.id)
  );

  if (routeStores.length < 2) return;

  try {
    const result = await calculateOptimizedRoute(routeStores);

    // Reorder based on optimized waypoint order
    dispatch({
      type: 'OPTIMIZE_ROUTE',
      payload: result.optimizedOrder
    });

    dispatch({
      type: 'SET_ROUTE_DIRECTIONS',
      payload: result.directionsResult
    });
  } catch (error) {
    console.error('Route optimization failed:', error);
    // Handle error (show toast/alert)
  }
}, [state.stores, state.routeStoreIds]);

const clearRoute = useCallback(() => {
  dispatch({ type: 'CLEAR_ROUTE' });
}, []);

const isStoreInRoute = useCallback((storeId: string) => {
  return state.routeStoreIds.includes(storeId);
}, [state.routeStoreIds]);

const getRouteStores = useCallback(() => {
  return state.routeStoreIds
    .map(id => state.stores.find(s => s.id === id))
    .filter((s): s is Store => s !== undefined);
}, [state.stores, state.routeStoreIds]);
```

---

## 3. Service Functions (`googleMaps.ts`)

### Enhancement: `calculateOptimizedRoute()`

**Replace existing `calculateRoute()` function with:**

```typescript
export interface RouteResult {
  directionsResult: google.maps.DirectionsResult;
  optimizedOrder: string[]; // Store IDs in optimized order
  totalDistance: string;
  totalDuration: string;
}

export async function calculateOptimizedRoute(
  stores: Store[]
): Promise<RouteResult> {
  if (stores.length < 2) {
    throw new Error('At least 2 stores required for route');
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

  return new Promise((resolve, reject) => {
    directionsService.route(
      {
        origin,
        destination,
        waypoints,
        optimizeWaypoints: true, // KEY: Let Google optimize
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          // Extract optimized waypoint order
          const waypointOrder = result.routes[0].waypoint_order || [];

          // Reconstruct optimized store ID order
          const optimizedOrder = [
            stores[0].id, // Origin stays first
            ...waypointOrder.map(i => stores[i + 1].id), // Waypoints reordered
            stores[stores.length - 1].id, // Destination stays last
          ];

          // Calculate totals
          let totalDistanceMeters = 0;
          let totalDurationSeconds = 0;

          result.routes[0].legs.forEach(leg => {
            totalDistanceMeters += leg.distance?.value || 0;
            totalDurationSeconds += leg.duration?.value || 0;
          });

          const totalDistance = `${(totalDistanceMeters / 1609.34).toFixed(1)} mi`;
          const totalDuration = `${Math.round(totalDurationSeconds / 60)} min`;

          resolve({
            directionsResult: result,
            optimizedOrder,
            totalDistance,
            totalDuration,
          });
        } else {
          reject(new Error(`Directions error: ${status}`));
        }
      }
    );
  });
}
```

---

### New: `renderRouteOnMap()`

```typescript
export function renderRouteOnMap(
  map: google.maps.Map,
  directionsResult: google.maps.DirectionsResult
): google.maps.DirectionsRenderer {
  const renderer = new google.maps.DirectionsRenderer({
    map,
    directions: directionsResult,
    suppressMarkers: false, // Show default A, B, C markers
    polylineOptions: {
      strokeColor: '#4285F4', // Google blue
      strokeWeight: 5,
      strokeOpacity: 0.7,
    },
  });

  return renderer; // Return for cleanup
}
```

---

### New: `clearRouteFromMap()`

```typescript
export function clearRouteFromMap(
  renderer: google.maps.DirectionsRenderer | null
): void {
  if (renderer) {
    renderer.setMap(null);
  }
}
```

---

## 4. UI Placement

### Recommended: Left Sidebar

**Specs:**
- **Width:** 280px
- **Position:** Fixed left, full height
- **Behavior:** Slides in/out with toggle button
- **Toggle Position:** Left edge of map (tab-style button)

**Layout:**
```
┌─────────────────────────┐
│  Route Planner          │ ← Header
├─────────────────────────┤
│  1. Store Name      ↑ X │ ← Scrollable
│  2. Store Name    ↓ ↑ X │    store list
│  3. Store Name    ↓   X │
│         ...             │
├─────────────────────────┤
│  3 stops • 12.5 mi      │ ← Summary
│  • 25 min               │
├─────────────────────────┤
│  [ Optimize Route ]     │ ← Controls
│  [ Clear Route    ]     │
│  [ Open in Maps   ]     │
└─────────────────────────┘
```

**Why Left Side?**
- Doesn't conflict with SlidePanel (right side)
- Vertical layout works well for store list
- Natural reading order (left to right)

---

## 5. Map Integration (`Map.tsx`)

### State Additions:

```typescript
const [directionsRenderer, setDirectionsRenderer] =
  useState<google.maps.DirectionsRenderer | null>(null);
```

### Effect for Route Rendering:

```typescript
useEffect(() => {
  if (!mapRef.current || !routeDirections) {
    // Clear existing route
    if (directionsRenderer) {
      clearRouteFromMap(directionsRenderer);
      setDirectionsRenderer(null);
    }
    return;
  }

  // Render new route
  const renderer = renderRouteOnMap(mapRef.current, routeDirections);
  setDirectionsRenderer(renderer);

  // Cleanup
  return () => {
    clearRouteFromMap(renderer);
  };
}, [routeDirections]);
```

### Marker Enhancement:

Update marker rendering to show route position:

```typescript
{filteredStores.map((store, index) => {
  const routePosition = routeStoreIds.indexOf(store.id);
  const isInRoute = routePosition !== -1;

  return (
    <Marker
      key={store.id}
      position={{ lat: store.lat, lng: store.lng }}
      icon={isInRoute
        ? createRouteMarkerIcon(routePosition + 1) // Numbered 1, 2, 3...
        : createPinIcon(getPinColor(store), hasGoodDeal)
      }
      onClick={() => handleMarkerClick(store.id)}
      title={store.name}
      zIndex={isInRoute ? 1000 : 1} // Route markers on top
    />
  );
})}
```

### New Helper: `createRouteMarkerIcon()`

```typescript
function createRouteMarkerIcon(position: number): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: '#4285F4', // Google blue
    fillOpacity: 1,
    strokeColor: '#FFFFFF',
    strokeWeight: 2,
    scale: 12,
    labelOrigin: new google.maps.Point(0, 0),
  };
}
```

**Note:** Use numbered markers via DirectionsRenderer's default behavior instead.

---

## 6. Type Additions (`store.ts`)

```typescript
export interface RouteState {
  storeIds: string[];
  directions: google.maps.DirectionsResult | null;
  optimized: boolean;
  totalDistance?: string;
  totalDuration?: string;
}
```

---

## 7. User Flow

1. **User clicks marker** → `SlidePanel` opens with store details
2. **SlidePanel shows "Add to Route" button** (new button in panel)
3. **User clicks "Add to Route"** → Store added to `RoutePlanner` list (left sidebar)
4. **User repeats** to add 2+ stores
5. **User clicks "Optimize Route"** → Google API calculates optimal order
6. **Route appears** → Blue polyline on map with numbered markers (A, B, C...)
7. **User can reorder manually** → Use up/down arrows in list
8. **User clicks "Open in Google Maps"** → Opens external navigation
9. **User clicks "Clear Route"** → Removes all stores from route and clears map

---

## 8. Implementation Phases

### Phase 1: MVP (Core Functionality)

**Goal:** Basic route planning without optimization

**Tasks:**
1. Add route state to `useStores` hook
2. Create `RoutePlanner` component (basic list UI)
3. Add "Add to Route" button to `SlidePanel`
4. Implement add/remove/clear actions
5. Render simple polyline connecting stores in order

**Deliverable:** Users can build a route and see it on the map

---

### Phase 2: Optimization

**Goal:** Google-optimized routes with distance/duration

**Tasks:**
1. Implement `calculateOptimizedRoute()` in `googleMaps.ts`
2. Add "Optimize Route" button
3. Display route summary (distance, duration, stops)
4. Use `DirectionsRenderer` for proper route visualization
5. Add up/down arrows for manual reordering

**Deliverable:** Optimized routes with full directions data

---

### Phase 3: Polish (Optional Enhancements)

**Goal:** Enhanced UX and additional features

**Tasks:**
1. Turn-by-turn directions panel (expandable list)
2. Save/load route presets to localStorage
3. Print route feature
4. Share route via URL
5. Drag-and-drop reordering (if simple arrows aren't sufficient)

**Deliverable:** Production-ready route planner

---

## 9. Simplicity Notes

### Keep It Simple

1. **No drag-and-drop library needed** → Use up/down arrows for reordering
2. **Google handles optimization** → Just use `optimizeWaypoints: true`
3. **DirectionsRenderer handles polyline** → Don't manually draw routes
4. **Don't persist routes** → Keep in memory only (session-based)
5. **Reuse existing functions** → `getGoogleMapsRouteUrl()` already exists

### Existing Code to Leverage

- `calculateRoute()` in `googleMaps.ts` (enhance for optimization)
- `getGoogleMapsRouteUrl()` for external navigation
- `SlidePanel` for "Add to Route" button placement
- Existing marker click handling

---

## 10. Architecture Decision Records

### ADR-001: Left Sidebar Placement

**Decision:** Place RoutePlanner as a left sidebar panel

**Rationale:**
- Doesn't conflict with existing SlidePanel (right side)
- Vertical layout natural for list of stores
- Easy to toggle on/off without covering map completely

**Alternatives Considered:**
- Bottom drawer: Would conflict with mobile view
- Overlay modal: Blocks entire map, poor UX for route planning

---

### ADR-002: Don't Persist Routes

**Decision:** Keep route state in memory only, don't save to localStorage

**Rationale:**
- Routes are typically session-based planning activities
- Reduces complexity (no migration, no cleanup)
- Users can easily recreate routes (stores are persistent)

**Alternatives Considered:**
- Save to localStorage: Adds complexity for minimal benefit
- Save as named presets: Feature creep for personal use app

---

### ADR-003: Use DirectionsRenderer

**Decision:** Use Google's DirectionsRenderer instead of custom polylines

**Rationale:**
- Automatically handles polyline styling
- Includes turn-by-turn markers
- Provides default A, B, C labels
- Less code to maintain

**Alternatives Considered:**
- Custom polylines: More control but more complexity
- Third-party routing library: Unnecessary dependency

---

## 11. Testing Checklist

- [ ] Add store to route from SlidePanel
- [ ] Remove store from route
- [ ] Reorder stores with up/down arrows
- [ ] Optimize route (2+ stores)
- [ ] Clear route
- [ ] Route persists across filter changes
- [ ] Route clears when stores are deleted
- [ ] Open in Google Maps with correct URL
- [ ] Route polyline renders correctly
- [ ] Route markers show correct positions
- [ ] Route summary calculates correctly
- [ ] Handle API errors gracefully

---

## 12. Dependencies

**Existing:**
- Google Maps JavaScript API (already in use)
- `@react-google-maps/api` (already installed)

**New:**
- None required

---

## 13. File Structure

```
src/
├── components/
│   ├── RoutePlanner/
│   │   ├── RoutePlanner.tsx          # Main component
│   │   ├── RoutePlanner.module.css   # Styles
│   │   ├── RouteStoreItem.tsx        # List item
│   │   ├── RouteStoreItem.module.css
│   │   ├── RouteControls.tsx         # Action buttons
│   │   └── RouteControls.module.css
│   ├── SlidePanel/
│   │   └── SlidePanel.tsx            # Add "Add to Route" button here
│   └── Map/
│       └── Map.tsx                   # Add route rendering here
├── hooks/
│   └── useStores.tsx                 # Add route state management
├── services/
│   └── googleMaps.ts                 # Add route calculation functions
└── types/
    └── store.ts                      # Add RouteState type
```

---

## Summary

This architecture provides a simple, maintainable route planning feature that:

1. **Integrates cleanly** with existing state management
2. **Leverages Google APIs** for optimization and rendering
3. **Keeps UI simple** with up/down arrows instead of complex drag-and-drop
4. **Phases implementation** to deliver value incrementally
5. **Avoids feature creep** by keeping routes session-based

Next steps: Implement Phase 1 (MVP) to validate the design with working code.
