import { useState, useCallback } from 'react';
import { useStores } from '../../hooks/useStores';
import { getDirectionsUrl } from '../../services/googleMaps';
import { VisitForm } from './VisitForm';
import { PriceHistory } from './PriceHistory';
import styles from './SlidePanel.module.css';

export function SlidePanel() {
  const { selectedStore, selectStore, updateStore, deleteStore } = useStores();
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleClose = useCallback(() => {
    selectStore(null);
    setShowVisitForm(false);
    setShowHistory(false);
  }, [selectStore]);

  const handleToggleVisited = useCallback(() => {
    if (selectedStore) {
      updateStore(selectedStore.id, { visited: !selectedStore.visited });
    }
  }, [selectedStore, updateStore]);

  const handleOwnerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedStore) {
        updateStore(selectedStore.id, { ownerName: e.target.value });
      }
    },
    [selectedStore, updateStore]
  );

  const handleCommentsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (selectedStore) {
        updateStore(selectedStore.id, { comments: e.target.value });
      }
    },
    [selectedStore, updateStore]
  );

  const handleFortalezaToggle = useCallback(
    (type: 'Blanco' | 'Reposado' | 'Anejo') => {
      if (selectedStore) {
        const key = `hasFortaleza${type}` as keyof typeof selectedStore;
        updateStore(selectedStore.id, { [key]: !selectedStore[key] });
      }
    },
    [selectedStore, updateStore]
  );

  const handleDelete = useCallback(() => {
    if (selectedStore && confirm(`Remove "${selectedStore.name}" from your list? This will delete all visit history for this store.`)) {
      deleteStore(selectedStore.id);
    }
  }, [selectedStore, deleteStore]);

  if (!selectedStore) {
    return null;
  }

  const lastVisit = selectedStore.visits[selectedStore.visits.length - 1];

  return (
    <div className={`${styles.panel} ${selectedStore ? styles.open : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.closeBtn} onClick={handleClose}>
          &times;
        </button>
        <h2 className={styles.storeName}>{selectedStore.name}</h2>
        <p className={styles.address}>{selectedStore.address}</p>
        {selectedStore.phone && (
          <a href={`tel:${selectedStore.phone}`} className={styles.phone}>
            {selectedStore.phone}
          </a>
        )}
        <a
          href={getDirectionsUrl(selectedStore)}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.directionsBtn}
        >
          Get Directions
        </a>
      </div>

      {/* Quick Status */}
      <div className={styles.section}>
        <label className={styles.visitedToggle}>
          <input
            type="checkbox"
            checked={selectedStore.visited}
            onChange={handleToggleVisited}
          />
          <span className={styles.toggleSlider}></span>
          <span>Visited</span>
        </label>

        <div className={styles.field}>
          <label htmlFor="ownerName">Owner Name</label>
          <input
            id="ownerName"
            type="text"
            value={selectedStore.ownerName}
            onChange={handleOwnerChange}
            placeholder="Enter owner name..."
          />
        </div>
      </div>

      {/* Fortaleza Inventory */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Fortaleza Availability</h3>
        <div className={styles.fortalezaGrid}>
          {(['Blanco', 'Reposado', 'Anejo'] as const).map((type) => {
            const key = `hasFortaleza${type}` as keyof typeof selectedStore;
            const hasIt = selectedStore[key] as boolean;
            return (
              <button
                key={type}
                className={`${styles.fortalezaBtn} ${hasIt ? styles.active : ''}`}
                onClick={() => handleFortalezaToggle(type)}
              >
                <span className={styles.fortalezaIcon}>{hasIt ? '✓' : '○'}</span>
                <span>{type}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Log Visit Button */}
      <div className={styles.section}>
        <button
          className={styles.logVisitBtn}
          onClick={() => setShowVisitForm(true)}
        >
          Log Visit
        </button>

        {lastVisit && (
          <div className={styles.lastVisit}>
            <p>
              Last visited:{' '}
              {new Date(lastVisit.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <div className={styles.lastPrices}>
              {lastVisit.donJulio1942Price !== null && (
                <span className={styles.priceTag}>
                  1942: ${lastVisit.donJulio1942Price}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Price History */}
      {selectedStore.visits.length > 0 && (
        <div className={styles.section}>
          <button
            className={styles.historyToggle}
            onClick={() => setShowHistory(!showHistory)}
          >
            Price History ({selectedStore.visits.length} visits)
            <span className={styles.chevron}>{showHistory ? '▲' : '▼'}</span>
          </button>
          {showHistory && <PriceHistory visits={selectedStore.visits} />}
        </div>
      )}

      {/* Comments */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Notes</h3>
        <textarea
          className={styles.comments}
          value={selectedStore.comments}
          onChange={handleCommentsChange}
          placeholder="Add notes about this store..."
          rows={4}
        />
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.deleteBtn} onClick={handleDelete}>
          Remove Store
        </button>
      </div>

      {/* Visit Form Modal */}
      {showVisitForm && (
        <VisitForm
          storeId={selectedStore.id}
          onClose={() => setShowVisitForm(false)}
        />
      )}
    </div>
  );
}
