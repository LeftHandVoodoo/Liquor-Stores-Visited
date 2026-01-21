import { useState, useCallback } from 'react';
import { useStores } from '../../hooks/useStores';
import styles from './AddStoreModal.module.css';

interface AddStoreModalProps {
  onClose: () => void;
}

export function AddStoreModal({ onClose }: AddStoreModalProps) {
  const { addStore, selectStore } = useStores();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!name.trim() || !address.trim()) {
        alert('Name and address are required');
        return;
      }

      const newStore = {
        name: name.trim(),
        address: address.trim(),
        lat: lat ? parseFloat(lat) : 39.4143, // Default to Frederick County center
        lng: lng ? parseFloat(lng) : -77.4105,
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
            Tip: Get coordinates from Google Maps by right-clicking on a location
          </p>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn}>
              Add Store
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
