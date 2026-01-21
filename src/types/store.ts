export interface Visit {
  id: string;
  date: string;
  fortalezaBlancoPrice: number | null;
  fortalezaReposadoPrice: number | null;
  fortalezaAnejoPrice: number | null;
  donJulio1942Price: number | null;
  notes: string;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  isManualEntry: boolean;
  visited: boolean;
  ownerName: string;
  comments: string;
  hasFortalezaBlanco: boolean;
  hasFortalezaReposado: boolean;
  hasFortalezaAnejo: boolean;
  visits: Visit[];
}

export interface StorageData {
  version: number;
  lastUpdated: string;
  stores: Store[];
  settings: AppSettings;
}

export interface AppSettings {
  priceAlertThreshold: number;
  lastExportReminder: string;
  lastPlacesRefresh: string;
}

export type FilterOptions = {
  showVisited: boolean;
  showUnvisited: boolean;
  hasFortalezaBlanco: boolean;
  hasFortalezaReposado: boolean;
  hasFortalezaAnejo: boolean;
  hasDonJulio1942: boolean;
  maxDonJulio1942Price: number | null;
};

export type SortOption =
  | 'name'
  | 'distance'
  | 'cheapest1942'
  | 'recentlyVisited'
  | 'neverVisited';

export const FREDERICK_COUNTY_CENTER = {
  lat: 39.4143,
  lng: -77.4105,
};

export const FREDERICK_COUNTY_BOUNDS = {
  north: 39.72,
  south: 39.21,
  east: -77.15,
  west: -77.68,
};
