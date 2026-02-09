import { useState, useCallback } from 'react';
import { useStores } from '../../hooks/useStores';
import type { SortOption } from '../../types/store';
import { AddStoreModal } from './AddStoreModal';
import { FilterDropdown } from './FilterDropdown';
import { ExportModal } from './ExportModal';
import { RoutePanel } from './RoutePanel';
import styles from './Toolbar.module.css';

type MapType = 'roadmap' | 'satellite' | 'hybrid';

interface ToolbarProps {
  mapType: MapType;
  onMapTypeChange: (mapType: MapType) => void;
}

export function Toolbar({ mapType, onMapTypeChange }: ToolbarProps) {
  const {
    sortBy,
    setSortBy,
    stores,
    getFilteredStores,
    selectedForRoute,
    clearRoute,
  } = useStores();
  const [showAddStore, setShowAddStore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showRoute, setShowRoute] = useState(false);

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSortBy(e.target.value as SortOption);
    },
    [setSortBy]
  );

  const filteredCount = getFilteredStores().length;
  const totalCount = stores.length;

  const handleClearRoute = useCallback(() => {
    clearRoute();
    setShowRoute(false);
  }, [clearRoute]);

  const handleMapTypeToggle = useCallback(() => {
    const newMapType: MapType = mapType === 'roadmap' ? 'satellite' : 'roadmap';
    onMapTypeChange(newMapType);
  }, [mapType, onMapTypeChange]);

  return (
    <>
      <div className={styles.toolbar}>
        <button
          className={styles.addBtn}
          onClick={() => setShowAddStore(true)}
          title="Add Store Manually"
        >
          + Add Store
        </button>

        <button
          className={`${styles.filterBtn} ${showFilters ? styles.active : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          Filters
          {filteredCount !== totalCount && (
            <span className={styles.filterBadge}>
              {filteredCount}/{totalCount}
            </span>
          )}
        </button>

        <select
          className={styles.sortSelect}
          value={sortBy}
          onChange={handleSortChange}
        >
          <option value="name">Sort: Name A-Z</option>
          <option value="neverVisited">Sort: Never Visited</option>
          <option value="recentlyVisited">Sort: Recently Visited</option>
          <option value="cheapest1942">Sort: Cheapest 1942</option>
        </select>

        {selectedForRoute.length > 0 && (
          <button
            className={`${styles.routeBtn} ${showRoute ? styles.active : ''}`}
            onClick={() => setShowRoute(!showRoute)}
          >
            Route ({selectedForRoute.length})
          </button>
        )}

        <button
          className={styles.exportBtn}
          onClick={() => setShowExport(true)}
          title="Export Data"
        >
          Export
        </button>

        <button
          className={`${styles.mapTypeBtn} ${mapType === 'satellite' ? styles.active : ''}`}
          onClick={handleMapTypeToggle}
          title={mapType === 'roadmap' ? 'Switch to Satellite View' : 'Switch to Roadmap View'}
        >
          {mapType === 'roadmap' ? '🗺️ Map' : '🛰️ Satellite'}
        </button>
      </div>

      {showFilters && (
        <FilterDropdown onClose={() => setShowFilters(false)} />
      )}

      {showRoute && (
        <RoutePanel
          onClose={() => setShowRoute(false)}
          onClear={handleClearRoute}
        />
      )}

      {showAddStore && (
        <AddStoreModal onClose={() => setShowAddStore(false)} />
      )}

      {showExport && (
        <ExportModal onClose={() => setShowExport(false)} />
      )}
    </>
  );
}
