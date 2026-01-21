import type { Visit } from '../../types/store';
import styles from './PriceHistory.module.css';

interface PriceHistoryProps {
  visits: Visit[];
}

function formatPrice(price: number | null): string {
  if (price === null) return '—';
  return `$${price.toFixed(2)}`;
}

function getPriceChange(
  current: number | null,
  previous: number | null
): { direction: 'up' | 'down' | 'same' | 'na'; diff: number } {
  if (current === null || previous === null) {
    return { direction: 'na', diff: 0 };
  }
  const diff = current - previous;
  if (diff > 0) return { direction: 'up', diff };
  if (diff < 0) return { direction: 'down', diff: Math.abs(diff) };
  return { direction: 'same', diff: 0 };
}

export function PriceHistory({ visits }: PriceHistoryProps) {
  const sortedVisits = [...visits].reverse(); // Most recent first

  return (
    <div className={styles.history}>
      {sortedVisits.map((visit, index) => {
        const prevVisit = sortedVisits[index + 1];
        const dj1942Change = getPriceChange(
          visit.donJulio1942Price,
          prevVisit?.donJulio1942Price
        );

        return (
          <div key={visit.id} className={styles.visitCard}>
            <div className={styles.visitHeader}>
              <span className={styles.visitDate}>
                {new Date(visit.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              {index === 0 && <span className={styles.latestBadge}>Latest</span>}
            </div>

            <div className={styles.priceList}>
              <div className={styles.priceRow}>
                <span className={styles.productName}>Don Julio 1942</span>
                <span className={`${styles.price} ${styles[dj1942Change.direction]}`}>
                  {formatPrice(visit.donJulio1942Price)}
                  {dj1942Change.direction === 'up' && (
                    <span className={styles.changeIndicator}>↑</span>
                  )}
                  {dj1942Change.direction === 'down' && (
                    <span className={styles.changeIndicator}>↓</span>
                  )}
                </span>
              </div>

              <div className={styles.priceRow}>
                <span className={styles.productName}>Fortaleza Blanco</span>
                <span className={styles.price}>
                  {formatPrice(visit.fortalezaBlancoPrice)}
                </span>
              </div>

              <div className={styles.priceRow}>
                <span className={styles.productName}>Fortaleza Reposado</span>
                <span className={styles.price}>
                  {formatPrice(visit.fortalezaReposadoPrice)}
                </span>
              </div>

              <div className={styles.priceRow}>
                <span className={styles.productName}>Fortaleza Añejo</span>
                <span className={styles.price}>
                  {formatPrice(visit.fortalezaAnejoPrice)}
                </span>
              </div>
            </div>

            {visit.notes && (
              <p className={styles.visitNotes}>{visit.notes}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
