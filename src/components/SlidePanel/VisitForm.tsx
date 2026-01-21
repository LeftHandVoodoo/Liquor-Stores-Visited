import { useState, useCallback } from 'react';
import { useStores } from '../../hooks/useStores';
import styles from './VisitForm.module.css';

interface VisitFormProps {
  storeId: string;
  onClose: () => void;
}

export function VisitForm({ storeId, onClose }: VisitFormProps) {
  const { addVisit } = useStores();

  const [fortalezaBlancoPrice, setFortalezaBlancoPrice] = useState('');
  const [fortalezaReposadoPrice, setFortalezaReposadoPrice] = useState('');
  const [fortalezaAnejoPrice, setFortalezaAnejoPrice] = useState('');
  const [donJulio1942Price, setDonJulio1942Price] = useState('');
  const [notes, setNotes] = useState('');

  const parsePrice = (value: string): number | null => {
    if (!value.trim()) return null;
    const num = parseFloat(value.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? null : num;
  };

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      addVisit(storeId, {
        date: new Date().toISOString(),
        fortalezaBlancoPrice: parsePrice(fortalezaBlancoPrice),
        fortalezaReposadoPrice: parsePrice(fortalezaReposadoPrice),
        fortalezaAnejoPrice: parsePrice(fortalezaAnejoPrice),
        donJulio1942Price: parsePrice(donJulio1942Price),
        notes,
      });

      onClose();
    },
    [
      storeId,
      fortalezaBlancoPrice,
      fortalezaReposadoPrice,
      fortalezaAnejoPrice,
      donJulio1942Price,
      notes,
      addVisit,
      onClose,
    ]
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Log Visit</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <p className={styles.date}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>

          <div className={styles.priceSection}>
            <h3>Fortaleza Prices</h3>
            <p className={styles.hint}>Leave blank if not in stock</p>

            <div className={styles.priceGrid}>
              <div className={styles.priceField}>
                <label htmlFor="blancoPrice">Blanco</label>
                <div className={styles.priceInput}>
                  <span>$</span>
                  <input
                    id="blancoPrice"
                    type="text"
                    inputMode="decimal"
                    value={fortalezaBlancoPrice}
                    onChange={(e) => setFortalezaBlancoPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className={styles.priceField}>
                <label htmlFor="reposadoPrice">Reposado</label>
                <div className={styles.priceInput}>
                  <span>$</span>
                  <input
                    id="reposadoPrice"
                    type="text"
                    inputMode="decimal"
                    value={fortalezaReposadoPrice}
                    onChange={(e) => setFortalezaReposadoPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className={styles.priceField}>
                <label htmlFor="anejoPrice">Añejo</label>
                <div className={styles.priceInput}>
                  <span>$</span>
                  <input
                    id="anejoPrice"
                    type="text"
                    inputMode="decimal"
                    value={fortalezaAnejoPrice}
                    onChange={(e) => setFortalezaAnejoPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.priceSection}>
            <h3>Don Julio 1942 Price</h3>
            <div className={styles.priceField}>
              <div className={styles.priceInput + ' ' + styles.large}>
                <span>$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={donJulio1942Price}
                  onChange={(e) => setDonJulio1942Price(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className={styles.notesSection}>
            <label htmlFor="visitNotes">Visit Notes</label>
            <textarea
              id="visitNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this visit..."
              rows={3}
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn}>
              Save Visit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
