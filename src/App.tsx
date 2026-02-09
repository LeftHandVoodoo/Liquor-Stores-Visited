import { useState, useCallback } from 'react';
import { StoreProvider, useStores } from './hooks/useStores';
import { Map } from './components/Map';
import { SlidePanel } from './components/SlidePanel';
import { Toolbar } from './components/Toolbar';
import { FileSetup } from './components/FileSetup';
import { isApiKeyConfigured } from './services/googleMaps';
import { isFileSystemSupported } from './services/fileStorage';
import styles from './styles/App.module.css';

type MapType = 'roadmap' | 'satellite' | 'hybrid';

function AppContent() {
  console.log('[APP] AppContent rendering');
  const [error, setError] = useState<string | null>(null);
  const [showFirefoxBanner, setShowFirefoxBanner] = useState(!isFileSystemSupported());
  const [mapType, setMapType] = useState<MapType>('roadmap');

  const {
    saveStatus,
    saveFileName,
    needsFileSetup,
    loadDataFromFile,
    setFileSetupComplete,
  } = useStores();

  const handleApiError = useCallback((errorMessage: string) => {
    setError(errorMessage);
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  const dismissFirefoxBanner = useCallback(() => {
    setShowFirefoxBanner(false);
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

  // Show file setup modal if needed
  if (needsFileSetup && isFileSystemSupported()) {
    return (
      <FileSetup
        mode="initial"
        onComplete={loadDataFromFile}
        onSkip={setFileSetupComplete}
      />
    );
  }

  return (
    <div className={styles.app}>
      {/* Firefox/Unsupported Browser Banner */}
      {showFirefoxBanner && (
        <div className={styles.firefoxBanner}>
          <span>
            Your browser doesn't support auto-save to file. Use the Export button
            regularly to back up your data.
          </span>
          <button className={styles.bannerDismiss} onClick={dismissFirefoxBanner}>
            Got it
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button className={styles.errorDismiss} onClick={dismissError}>
            Dismiss
          </button>
        </div>
      )}

      {/* Save Status Indicator */}
      {isFileSystemSupported() && (
        <div className={styles.saveStatus}>
          {saveStatus === 'saving' && (
            <span className={styles.savingIndicator}>Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span className={styles.savedIndicator}>Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className={styles.errorIndicator}>Save failed</span>
          )}
          {saveFileName && saveStatus === 'idle' && (
            <span className={styles.fileNameIndicator}>{saveFileName}</span>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <Toolbar mapType={mapType} onMapTypeChange={setMapType} />
      </div>

      {/* Map */}
      <div className={styles.mapContainer}>
        <Map onApiError={handleApiError} mapType={mapType} />
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendTitle}>Map Legend</div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.home}`}></span>
          <span>Home (Route Start)</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.blue}`}></span>
          <span>Not Visited</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.green}`}></span>
          <span>Fortaleza Spotted</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.lightBlue}`}></span>
          <span>Visited</span>
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
