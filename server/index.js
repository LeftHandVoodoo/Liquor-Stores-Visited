import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup - using JSON file
const dataDir = join(__dirname, '..', 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, 'liquor-stores.json');

// Initialize database
function initDatabase() {
  if (!existsSync(dbPath)) {
    const initialData = {
      stores: [],
      settings: {
        priceAlertThreshold: 150,
        lastExportReminder: new Date().toISOString(),
        lastPlacesRefresh: '',
      },
      version: 1,
      lastUpdated: new Date().toISOString(),
    };
    writeFileSync(dbPath, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

function loadDatabase() {
  try {
    if (!existsSync(dbPath)) {
      initDatabase();
    }
    const data = readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading database:', error);
    initDatabase();
    return loadDatabase();
  }
}

function saveDatabase(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving database:', error);
    return false;
  }
}

initDatabase();

// API Routes

// Get all stores with visits
app.get('/api/stores', (req, res) => {
  try {
    const data = loadDatabase();
    res.json({ stores: data.stores || [] });
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

// Get settings
app.get('/api/settings', (req, res) => {
  try {
    const data = loadDatabase();
    res.json(data.settings || {
      priceAlertThreshold: 150,
      lastExportReminder: new Date().toISOString(),
      lastPlacesRefresh: '',
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Save all data (stores and settings)
app.post('/api/data', (req, res) => {
  try {
    const { stores, settings } = req.body;
    const data = {
      stores: stores || [],
      settings: settings || {
        priceAlertThreshold: 150,
        lastExportReminder: new Date().toISOString(),
        lastPlacesRefresh: '',
      },
      version: 1,
      lastUpdated: new Date().toISOString(),
    };

    if (saveDatabase(data)) {
      res.json({ success: true, message: 'Data saved successfully' });
    } else {
      res.status(500).json({ error: 'Failed to save data' });
    }
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Database: ${dbPath}`);
  console.log('API endpoints:');
  console.log(`  GET  http://localhost:${PORT}/api/stores`);
  console.log(`  GET  http://localhost:${PORT}/api/settings`);
  console.log(`  POST http://localhost:${PORT}/api/data`);
  console.log(`  GET  http://localhost:${PORT}/api/health`);
});
