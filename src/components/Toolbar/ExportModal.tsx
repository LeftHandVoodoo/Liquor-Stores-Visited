import { useCallback } from 'react';
import { useStores } from '../../hooks/useStores';
import styles from './ExportModal.module.css';

interface ExportModalProps {
  onClose: () => void;
}

export function ExportModal({ onClose }: ExportModalProps) {
  const { exportData, exportCSV, stores } = useStores();

  const handleExportJSON = useCallback(() => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liquor-stores-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  }, [exportData, onClose]);

  const handleExportCSV = useCallback(() => {
    const data = exportCSV();
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liquor-stores-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  }, [exportCSV, onClose]);

  const handleImportJSON = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.version && data.stores) {
          localStorage.setItem('liquor-tracker-data', text);
          window.location.reload();
        } else {
          alert('Invalid backup file format');
        }
      } catch (error) {
        alert('Failed to read backup file');
      }
    };
    input.click();
  }, []);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Export / Import Data</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.stats}>
            <p>
              <strong>{stores.length}</strong> stores tracked
            </p>
            <p>
              <strong>{stores.filter((s) => s.visited).length}</strong> visited
            </p>
            <p>
              <strong>
                {stores.reduce((sum, s) => sum + s.visits.length, 0)}
              </strong>{' '}
              total visits logged
            </p>
          </div>

          <div className={styles.section}>
            <h3>Export</h3>
            <div className={styles.buttons}>
              <button className={styles.exportBtn} onClick={handleExportJSON}>
                <span className={styles.icon}>📦</span>
                <span>
                  <strong>JSON Backup</strong>
                  <small>Full data, can be re-imported</small>
                </span>
              </button>
              <button className={styles.exportBtn} onClick={handleExportCSV}>
                <span className={styles.icon}>📊</span>
                <span>
                  <strong>CSV Spreadsheet</strong>
                  <small>For Excel / Google Sheets</small>
                </span>
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <h3>Import</h3>
            <button className={styles.importBtn} onClick={handleImportJSON}>
              <span className={styles.icon}>📥</span>
              <span>
                <strong>Restore from JSON Backup</strong>
                <small>Replaces current data</small>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
