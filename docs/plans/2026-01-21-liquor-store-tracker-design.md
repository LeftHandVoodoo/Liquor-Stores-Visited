# Frederick County Liquor Store Tracker - Design Document

**Date**: 2026-01-21
**Status**: Approved
**Author**: LeftHandVoodoo + Claude

## Overview

A desktop browser application for tracking visits to liquor stores in Frederick County, Maryland. Primary focus: hunting Fortaleza tequila availability and monitoring Don Julio 1942 prices.

## Goals

- Display all liquor stores in Frederick County on an interactive map
- Track which stores have been visited
- Record Fortaleza availability (Blanco, Reposado, Añejo) with prices
- Track Don Julio 1942 pricing over time
- Plan optimized driving routes for store visits
- Export data for backup and analysis

## Non-Goals

- Mobile app (desktop browser only)
- Multi-user collaboration
- Cloud sync or accounts
- Real-time inventory from stores

---

## Technical Architecture

### Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript |
| Maps | Google Maps JavaScript API via `@react-google-maps/api` |
| Store Discovery | Google Places API |
| Route Planning | Google Directions API |
| State Management | React Context + useReducer |
| Storage | localStorage (JSON) |
| Styling | CSS Modules with custom theme variables |

### Project Structure

```
src/
  components/
    Map/                 # Google Map wrapper
    SlidePanel/          # Store details panel
    StorePin/            # Custom map markers
    Toolbar/             # Search, filter, add store
    RouteModal/          # Route planning UI
    PriceChart/          # Sparkline price history
    VisitForm/           # Log a visit form
  hooks/
    useGooglePlaces.ts   # Places API integration
    useLocalStorage.ts   # Persistent storage hook
    useRouteOptimizer.ts # Directions API wrapper
    useStores.ts         # Store state management
  services/
    googleMaps.ts        # API initialization
    places.ts            # Store search
    directions.ts        # Route calculation
    storage.ts           # localStorage wrapper
  types/
    store.ts             # Store and Visit interfaces
    filters.ts           # Filter state types
  utils/
    export.ts            # CSV/JSON export
    dateFormat.ts        # Date helpers
  styles/
    theme.css            # Brown/gold theme variables
    global.css           # Base styles
  App.tsx
  index.ts
```

### Data Flow

1. App loads → Initialize Google Maps API
2. Fetch liquor stores from Places API (Frederick County bounds)
3. Load saved data from localStorage
4. Merge Google data with saved tracking data
5. Render map with color-coded pins
6. User clicks pin → Slide panel opens with store details
7. User edits data → Auto-save to localStorage (debounced 500ms)

---

## Data Model

### Store

```typescript
interface Store {
  id: string;                    // Google Place ID or UUID for manual entries
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  isManualEntry: boolean;

  // Tracking data
  visited: boolean;
  ownerName: string;
  comments: string;

  // Fortaleza availability
  hasFortalezaBlanco: boolean;
  hasFortalezaReposado: boolean;
  hasFortalezaAnejo: boolean;

  // Visit history
  visits: Visit[];
}
```

### Visit

```typescript
interface Visit {
  id: string;
  date: string;                  // ISO 8601 timestamp
  fortalezaBlancoPrice: number | null;
  fortalezaReposadoPrice: number | null;
  fortalezaAnejoPrice: number | null;
  donJulio1942Price: number | null;
  notes: string;
}
```

### Price Semantics

- `null` = Not in stock or not checked
- `0` = Free (unlikely but valid)
- Positive number = Price in USD

---

## UI/UX Design

### Layout

- **Full-screen map** as primary view
- **Floating toolbar** (top-left): Search, filters, "Add Store" button
- **Floating legend** (bottom-left): Pin color meanings
- **Slide-out panel** (right, 400px): Store details on pin click

### Color Theme

| Element | Color | Hex |
|---------|-------|-----|
| Background (dark) | Rich Brown | `#3E2723` |
| Background (cards) | Cream | `#F5F0E6` |
| Primary Accent | Gold | `#FFD700` |
| Secondary Accent | Antique Gold | `#DAA520` |
| Text (on dark) | White/Gold | `#FFFFFF` / `#FFD700` |
| Text (on light) | Dark Brown | `#3E2723` |

### Map Pins

| Color | Meaning |
|-------|---------|
| Brown | Not visited |
| Gold | Visited, has Fortaleza |
| Tan/Beige | Visited, no Fortaleza |
| Gold + Star | Has Don Julio 1942 under threshold |

### Slide-Out Panel Sections

1. **Header**: Store name, address, phone, directions link
2. **Quick Status**: Visited checkbox, owner name input
3. **Fortaleza Inventory**: Three toggle switches with labels
4. **Log Visit**: Button to open visit form modal
5. **Price History**: Sparkline charts per product
6. **Comments**: Textarea for general notes
7. **Visit History**: Collapsible list of past visits

---

## Features

### Filtering & Sorting

**Filter Options:**
- Visited / Unvisited
- Has Fortaleza (Blanco / Reposado / Añejo)
- Has Don Julio 1942
- Price range slider

**Sort Options:**
- Name A-Z
- Distance from current location
- Cheapest Don Julio 1942
- Recently visited
- Never visited first

Active filters display as dismissible chips.

### Route Planner

1. Click "Plan Route" in toolbar
2. Modal opens with store checklist
3. Select stores to visit
4. Drag to reorder or click "Optimize" for shortest route
5. Preview route on map
6. "Open in Google Maps" exports to phone/car GPS

### Data Export

- **JSON**: Full backup, can be re-imported
- **CSV**: Spreadsheet-friendly format with columns:
  - Store name, address, visited, owner
  - Latest prices for all 4 products
  - Last visit date, total visit count

### Price History

- Mini sparkline in slide panel per product
- Hover for exact price + date
- "View Full History" expands chart
- Visual indicators: ↑ red (price up), ↓ green (price down)

---

## Google API Configuration

### Required APIs

1. Maps JavaScript API
2. Places API
3. Directions API

### Setup

1. Create project in Google Cloud Console
2. Enable the three APIs above
3. Create API key with HTTP referrer restrictions
4. Store in `.env` as `VITE_GOOGLE_MAPS_API_KEY`

### Places Search Parameters

```typescript
{
  location: { lat: 39.4143, lng: -77.4105 }, // Frederick County center
  radius: 40000, // ~25 miles covers the county
  type: 'liquor_store'
}
```

### Rate Limiting

- Cache Places results in localStorage
- Only refresh on user request (button click)
- Show "Last updated: X" timestamp

---

## Storage

### localStorage Key

`liquor-tracker-data`

### Structure

```typescript
interface StorageData {
  version: 1;
  lastUpdated: string;
  stores: Store[];
  settings: {
    priceAlertThreshold: number;  // Don Julio 1942 alert price
    lastExportReminder: string;
  };
}
```

### Limits & Handling

- localStorage limit: ~5MB (sufficient for hundreds of stores)
- Debounced save: 500ms after any change
- Export reminder: Prompt every 30 days

---

## Error Handling

| Error | Response |
|-------|----------|
| API quota exceeded | Show cached data, disable search, warning banner |
| Invalid API key | Modal with setup instructions |
| localStorage full | Prompt to export and clear old history |
| Geolocation denied | Fall back to Frederick County center |
| Network offline | Work with cached data, disable search |

---

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Edge (latest 2 versions)
- Safari (latest 2 versions)

No IE11 support required.

---

## Implementation Phases

### Phase 1: Foundation
- React app setup with Google Maps
- Basic store display from Places API
- Click to view store details

### Phase 2: Core Tracking
- Visit logging with price entry
- Fortaleza availability toggles
- localStorage persistence

### Phase 3: Visual Polish
- Brown/gold theme implementation
- Pin color coding
- Slide-out panel animations

### Phase 4: Features
- Filtering and sorting
- Route planner
- Data export

### Phase 5: Refinement
- Price history charts
- Backup reminders
- Error handling polish

---

## Open Questions

None - design approved.

---

## Appendix: Frederick County Bounds

```typescript
const FREDERICK_COUNTY_BOUNDS = {
  north: 39.7200,
  south: 39.2100,
  east: -77.1500,
  west: -77.6800
};
```
