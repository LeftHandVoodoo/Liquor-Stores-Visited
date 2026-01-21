import { useState, useCallback } from 'react';
import { useStores } from '../../hooks/useStores';
import { geocodeAddress } from '../../services/googleMaps';
import styles from './AddStoreModal.module.css';

interface AddStoreModalProps {
  onClose: () => void;
}

export function AddStoreModal({ onClose }: AddStoreModalProps) {
  const { addStore } = useStores();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!name.trim() || !address.trim()) {
        setError('Name and address are required');
        return;
      }

      setIsLoading(true);

      try {
        let storeLat = lat ? parseFloat(lat) : 0;
        let storeLng = lng ? parseFloat(lng) : 0;

        // If coordinates not provided, geocode the address
        if (!lat || !lng) {
          const coords = await geocodeAddress(address.trim());
          if (coords) {
            storeLat = coords.lat;
            storeLng = coords.lng;
          } else {
            setError('Could not find coordinates for this address. Please enter them manually.');
            setIsLoading(false);
            return;
          }
        }

        const newStore = {
          name: name.trim(),
          address: address.trim(),
          lat: storeLat,
          lng: storeLng,
          phone: phone.trim() || undefined,
          isManualEntry: true,
          visited: false,
          ownerName: '',
          comments: '',
          hasFortalezaBlanco: false,
          hasFortalezaReposado: false,
          hasFortalezaAnejo: false,
        };

        addStore(newStore);
        onClose();
      } catch (err) {
        setError('Failed to add store. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [name, address, lat, lng, phone, addStore, onClose]
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Add Store Manually</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="storeName">Store Name *</label>
            <input
              id="storeName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Frederick Wine & Spirits"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="storeAddress">Address *</label>
            <input
              id="storeAddress"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 123 Main St, Frederick, MD"
              required
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="storeLat">Latitude</label>
              <input
                id="storeLat"
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="39.4143"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="storeLng">Longitude</label>
              <input
                id="storeLng"
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="-77.4105"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="storePhone">Phone</label>
            <input
              id="storePhone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(301) 555-0123"
            />
          </div>

          <p className={styles.hint}>
            Tip: Leave coordinates blank to auto-detect from address, or get them from Google Maps by right-clicking on a location
          </p>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
