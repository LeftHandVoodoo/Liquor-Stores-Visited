import { useState, useCallback } from 'react';
import { StoreProvider } from './hooks/useStores';
import { Map } from './components/Map';
import { SlidePanel } from './components/SlidePanel';
import { Toolbar } from './components/Toolbar';
import { isApiKeyConfigured } from './services/googleMaps';
import styles from './styles/App.module.css';

function AppContent() {
  console.log('[APP] AppContent rendering');
  const [error, setError] = useState<string | null>(null);

  const handleApiError = useCallback((errorMessage: string) => {
    setError(errorMessage);
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  console.log('[APP] isApiKeyConfigured:', isApiKeyConfigured());
  if (!isApiKeyConfigured()) {
    console.log('[APP] No API key - showing config screen');
    return (
      <div className={styles.app}>
        <div className={styles.loadingOverlay}>
          <h2 style={{ color: 'var(--color-gold)', marginBottom: '16px' }}>
            API Key Required
          </h2>
          <p style={{ color: 'var(--color-cream)', maxWidth: '400px', textAlign: 'center', lineHeight: 1.6 }}>
            To use this app, you need a Google Maps API key.
          </p>
          <ol style={{ color: 'var(--color-cream)', marginTop: '24px', lineHeight: 2, textAlign: 'left' }}>
            <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener" style={{ color: 'var(--color-gold)' }}>Google Cloud Console</a></li>
            <li>Create a project and enable these APIs:
              <ul style={{ marginLeft: '20px' }}>
                <li>Maps JavaScript API</li>
                <li>Places API</li>
                <li>Directions API</li>
              </ul>
            </li>
            <li>Create an API key</li>
            <li>Copy <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>.env.example</code> to <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>.env</code></li>
            <li>Add your API key to <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>VITE_GOOGLE_MAPS_API_KEY</code></li>
            <li>Restart the dev server</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      {/* Error Banner */}
      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button className={styles.errorDismiss} onClick={dismissError}>
            Dismiss
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <Toolbar />
      </div>

      {/* Map */}
      <div className={styles.mapContainer}>
        {console.log('[APP] About to render Map component')}
        <Map onApiError={handleApiError} />
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendTitle}>Map Legend</div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.brown}`}></span>
          <span>Not Visited</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.gold}`}></span>
          <span>Visited - Has Fortaleza</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.tan}`}></span>
          <span>Visited - No Fortaleza</span>
        </div>
      </div>

      {/* Slide Panel */}
      <SlidePanel />
    </div>
  );
}

export function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
