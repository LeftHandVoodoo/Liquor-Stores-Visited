import { useStores } from '../../hooks/useStores';
import styles from './FilterDropdown.module.css';

interface FilterDropdownProps {
  onClose: () => void;
}

export function FilterDropdown({ onClose }: FilterDropdownProps) {
  const { filters, setFilters } = useStores();

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.dropdown}>
        <h3 className={styles.title}>Filters</h3>

        <div className={styles.section}>
          <h4>Visit Status</h4>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={filters.showVisited}
              onChange={(e) => setFilters({ showVisited: e.target.checked })}
            />
            <span>Show Visited</span>
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={filters.showUnvisited}
              onChange={(e) => setFilters({ showUnvisited: e.target.checked })}
            />
            <span>Show Unvisited</span>
          </label>
        </div>

        <div className={styles.section}>
          <h4>Fortaleza Availability</h4>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={filters.hasFortalezaBlanco}
              onChange={(e) => setFilters({ hasFortalezaBlanco: e.target.checked })}
            />
            <span>Has Blanco</span>
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={filters.hasFortalezaReposado}
              onChange={(e) => setFilters({ hasFortalezaReposado: e.target.checked })}
            />
            <span>Has Reposado</span>
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={filters.hasFortalezaAnejo}
              onChange={(e) => setFilters({ hasFortalezaAnejo: e.target.checked })}
            />
            <span>Has Añejo</span>
          </label>
        </div>

        <div className={styles.section}>
          <h4>Don Julio 1942</h4>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={filters.hasDonJulio1942}
              onChange={(e) => setFilters({ hasDonJulio1942: e.target.checked })}
            />
            <span>Has 1942 in Stock</span>
          </label>

          <div className={styles.priceFilter}>
            <label>Max Price:</label>
            <input
              type="number"
              value={filters.maxDonJulio1942Price ?? ''}
              onChange={(e) =>
                setFilters({
                  maxDonJulio1942Price: e.target.value
                    ? parseFloat(e.target.value)
                    : null,
                })
              }
              placeholder="No limit"
              min="0"
              step="10"
            />
          </div>
        </div>

        <button
          className={styles.resetBtn}
          onClick={() =>
            setFilters({
              showVisited: true,
              showUnvisited: true,
              hasFortalezaBlanco: false,
              hasFortalezaReposado: false,
              hasFortalezaAnejo: false,
              hasDonJulio1942: false,
              maxDonJulio1942Price: null,
            })
          }
        >
          Reset Filters
        </button>
      </div>
    </>
  );
}
