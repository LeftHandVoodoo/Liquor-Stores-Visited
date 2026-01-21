import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  Store,
  Visit,
  StorageData,
  FilterOptions,
  SortOption,
  AppSettings,
} from '../types/store';

const STORAGE_KEY = 'liquor-tracker-data';
const STORAGE_VERSION = 1;

interface StoreState {
  stores: Store[];
  settings: AppSettings;
  selectedStoreId: string | null;
  filters: FilterOptions;
  sortBy: SortOption;
  isLoading: boolean;
  error: string | null;
}

type StoreAction =
  | { type: 'SET_STORES'; payload: Store[] }
  | { type: 'ADD_STORE'; payload: Store }
  | { type: 'UPDATE_STORE'; payload: { id: string; updates: Partial<Store> } }
  | { type: 'DELETE_STORE'; payload: string }
  | { type: 'ADD_VISIT'; payload: { storeId: string; visit: Visit } }
  | { type: 'SELECT_STORE'; payload: string | null }
  | { type: 'SET_FILTERS'; payload: Partial<FilterOptions> }
  | { type: 'SET_SORT'; payload: SortOption }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'MERGE_GOOGLE_STORES'; payload: Store[] };

const defaultFilters: FilterOptions = {
  showVisited: true,
  showUnvisited: true,
  hasFortalezaBlanco: false,
  hasFortalezaReposado: false,
  hasFortalezaAnejo: false,
  hasDonJulio1942: false,
  maxDonJulio1942Price: null,
};

const defaultSettings: AppSettings = {
  priceAlertThreshold: 150,
  lastExportReminder: new Date().toISOString(),
  lastPlacesRefresh: '',
};

const initialState: StoreState = {
  stores: [],
  settings: defaultSettings,
  selectedStoreId: null,
  filters: defaultFilters,
  sortBy: 'name',
  isLoading: true,
  error: null,
};

function storeReducer(state: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
    case 'SET_STORES':
      return { ...state, stores: action.payload, isLoading: false };

    case 'ADD_STORE':
      return { ...state, stores: [...state.stores, action.payload] };

    case 'UPDATE_STORE':
      return {
        ...state,
        stores: state.stores.map((store) =>
          store.id === action.payload.id
            ? { ...store, ...action.payload.updates }
            : store
        ),
      };

    case 'DELETE_STORE':
      return {
        ...state,
        stores: state.stores.filter((store) => store.id !== action.payload),
        selectedStoreId:
          state.selectedStoreId === action.payload
            ? null
            : state.selectedStoreId,
      };

    case 'ADD_VISIT':
      return {
        ...state,
        stores: state.stores.map((store) =>
          store.id === action.payload.storeId
            ? {
                ...store,
                visits: [...store.visits, action.payload.visit],
                visited: true,
              }
            : store
        ),
      };

    case 'SELECT_STORE':
      return { ...state, selectedStoreId: action.payload };

    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };

    case 'SET_SORT':
      return { ...state, sortBy: action.payload };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    case 'MERGE_GOOGLE_STORES':
      const existingIds = new Set(state.stores.map((s) => s.id));
      const newStores = action.payload.filter((s) => !existingIds.has(s.id));
      return { ...state, stores: [...state.stores, ...newStores] };

    default:
      return state;
  }
}

interface StoreContextValue extends StoreState {
  selectStore: (id: string | null) => void;
  addStore: (store: Omit<Store, 'id' | 'visits'>) => void;
  updateStore: (id: string, updates: Partial<Store>) => void;
  deleteStore: (id: string) => void;
  addVisit: (storeId: string, visit: Omit<Visit, 'id'>) => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  setSortBy: (sort: SortOption) => void;
  mergeGoogleStores: (stores: Store[]) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  getFilteredStores: () => Store[];
  selectedStore: Store | null;
  exportData: () => string;
  exportCSV: () => string;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function loadFromStorage(): { stores: Store[]; settings: AppSettings } {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed: StorageData = JSON.parse(data);
      if (parsed.version === STORAGE_VERSION) {
        return { stores: parsed.stores, settings: parsed.settings };
      }
    }
  } catch (error) {
    console.error('Error loading from storage:', error);
  }
  return { stores: [], settings: defaultSettings };
}

function saveToStorage(stores: Store[], settings: AppSettings): void {
  try {
    const data: StorageData = {
      version: STORAGE_VERSION,
      lastUpdated: new Date().toISOString(),
      stores,
      settings,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to storage:', error);
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(storeReducer, initialState);

  // Load data on mount
  useEffect(() => {
    const { stores, settings } = loadFromStorage();
    dispatch({ type: 'SET_STORES', payload: stores });
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, []);

  // Save data on changes (debounced by reducer batching)
  useEffect(() => {
    if (!state.isLoading) {
      const timer = setTimeout(() => {
        saveToStorage(state.stores, state.settings);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state.stores, state.settings, state.isLoading]);

  const selectStore = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_STORE', payload: id });
  }, []);

  const addStore = useCallback((store: Omit<Store, 'id' | 'visits'>) => {
    const newStore: Store = {
      ...store,
      id: uuidv4(),
      visits: [],
    };
    dispatch({ type: 'ADD_STORE', payload: newStore });
  }, []);

  const updateStore = useCallback((id: string, updates: Partial<Store>) => {
    dispatch({ type: 'UPDATE_STORE', payload: { id, updates } });
  }, []);

  const deleteStore = useCallback((id: string) => {
    dispatch({ type: 'DELETE_STORE', payload: id });
  }, []);

  const addVisit = useCallback((storeId: string, visit: Omit<Visit, 'id'>) => {
    const newVisit: Visit = {
      ...visit,
      id: uuidv4(),
    };
    dispatch({ type: 'ADD_VISIT', payload: { storeId, visit: newVisit } });
  }, []);

  const setFilters = useCallback((filters: Partial<FilterOptions>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const setSortBy = useCallback((sort: SortOption) => {
    dispatch({ type: 'SET_SORT', payload: sort });
  }, []);

  const mergeGoogleStores = useCallback((stores: Store[]) => {
    dispatch({ type: 'MERGE_GOOGLE_STORES', payload: stores });
  }, []);

  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, []);

  const getFilteredStores = useCallback(() => {
    let filtered = [...state.stores];

    // Apply visibility filters
    if (!state.filters.showVisited) {
      filtered = filtered.filter((s) => !s.visited);
    }
    if (!state.filters.showUnvisited) {
      filtered = filtered.filter((s) => s.visited);
    }

    // Apply Fortaleza filters
    if (state.filters.hasFortalezaBlanco) {
      filtered = filtered.filter((s) => s.hasFortalezaBlanco);
    }
    if (state.filters.hasFortalezaReposado) {
      filtered = filtered.filter((s) => s.hasFortalezaReposado);
    }
    if (state.filters.hasFortalezaAnejo) {
      filtered = filtered.filter((s) => s.hasFortalezaAnejo);
    }

    // Apply Don Julio filter
    if (state.filters.hasDonJulio1942) {
      filtered = filtered.filter((s) => {
        const lastVisit = s.visits[s.visits.length - 1];
        return lastVisit?.donJulio1942Price !== null;
      });
    }

    // Apply price filter
    if (state.filters.maxDonJulio1942Price !== null) {
      filtered = filtered.filter((s) => {
        const lastVisit = s.visits[s.visits.length - 1];
        return (
          lastVisit?.donJulio1942Price !== null &&
          lastVisit.donJulio1942Price <= state.filters.maxDonJulio1942Price!
        );
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (state.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'neverVisited':
          return (a.visited ? 1 : 0) - (b.visited ? 1 : 0);
        case 'recentlyVisited': {
          const aLast = a.visits[a.visits.length - 1]?.date || '';
          const bLast = b.visits[b.visits.length - 1]?.date || '';
          return bLast.localeCompare(aLast);
        }
        case 'cheapest1942': {
          const aPrice =
            a.visits[a.visits.length - 1]?.donJulio1942Price ?? Infinity;
          const bPrice =
            b.visits[b.visits.length - 1]?.donJulio1942Price ?? Infinity;
          return aPrice - bPrice;
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [state.stores, state.filters, state.sortBy]);

  const selectedStore =
    state.stores.find((s) => s.id === state.selectedStoreId) || null;

  const exportData = useCallback(() => {
    const data: StorageData = {
      version: STORAGE_VERSION,
      lastUpdated: new Date().toISOString(),
      stores: state.stores,
      settings: state.settings,
    };
    return JSON.stringify(data, null, 2);
  }, [state.stores, state.settings]);

  const exportCSV = useCallback(() => {
    const headers = [
      'Name',
      'Address',
      'Visited',
      'Owner',
      'Fortaleza Blanco',
      'Fortaleza Reposado',
      'Fortaleza Anejo',
      'Last Blanco Price',
      'Last Reposado Price',
      'Last Anejo Price',
      'Last 1942 Price',
      'Last Visit',
      'Total Visits',
      'Comments',
    ];

    const rows = state.stores.map((store) => {
      const lastVisit = store.visits[store.visits.length - 1];
      return [
        store.name,
        store.address,
        store.visited ? 'Yes' : 'No',
        store.ownerName,
        store.hasFortalezaBlanco ? 'Yes' : 'No',
        store.hasFortalezaReposado ? 'Yes' : 'No',
        store.hasFortalezaAnejo ? 'Yes' : 'No',
        lastVisit?.fortalezaBlancoPrice ?? '',
        lastVisit?.fortalezaReposadoPrice ?? '',
        lastVisit?.fortalezaAnejoPrice ?? '',
        lastVisit?.donJulio1942Price ?? '',
        lastVisit?.date ?? '',
        store.visits.length,
        store.comments.replace(/"/g, '""'),
      ]
        .map((v) => `"${v}"`)
        .join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }, [state.stores]);

  const value: StoreContextValue = {
    ...state,
    selectStore,
    addStore,
    updateStore,
    deleteStore,
    addVisit,
    setFilters,
    setSortBy,
    mergeGoogleStores,
    updateSettings,
    getFilteredStores,
    selectedStore,
    exportData,
    exportCSV,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStores(): StoreContextValue {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStores must be used within a StoreProvider');
  }
  return context;
}
