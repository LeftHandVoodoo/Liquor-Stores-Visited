import { useState, useCallback } from 'react';
import { useStores } from '../../hooks/useStores';
import type { SortOption } from '../../types/store';
import { AddStoreModal } from './AddStoreModal';
import { FilterDropdown } from './FilterDropdown';
import { ExportModal } from './ExportModal';
import styles from './Toolbar.module.css';

export function Toolbar() {
  const { sortBy, setSortBy, stores, getFilteredStores } = useStores();
  const [showAddStore, setShowAddStore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSortBy(e.target.value as SortOption);
    },
    [setSortBy]
  );

  const filteredCount = getFilteredStores().length;
  const totalCount = stores.length;

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

        <button
          className={styles.exportBtn}
          onClick={() => setShowExport(true)}
          title="Export Data"
        >
          Export
        </button>
      </div>

      {showFilters && (
        <FilterDropdown onClose={() => setShowFilters(false)} />
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
