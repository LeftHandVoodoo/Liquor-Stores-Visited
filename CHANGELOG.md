# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Map view toggle button in toolbar to switch between Roadmap and Satellite views
- Backend API server with Express.js for persistent data storage
- JSON file-based database (`data/liquor-stores.json`) for reliable persistence across sessions
- API endpoints: `/api/stores`, `/api/settings`, `/api/data`, `/api/health`
- Automatic data migration from localStorage to database on first API connection
- Production mode now starts both backend server and frontend

### Changed
- Data persistence now uses backend API with database instead of localStorage-only
- Frontend automatically saves to database when API is available, falls back to localStorage/file
- Production build process includes backend server startup

### Fixed
- Data now persists reliably across browser sessions using database backend

### Removed

## [0.3.1] - 2026-02-09

### Added
- `run.py` launcher to start the app in dev mode or production preview.

### Fixed
- `run.py` now resolves the npm executable path explicitly on Windows.

## [0.2.0] - 2026-01-21

### Added
- Full React application with Google Maps integration
- Interactive map showing all liquor stores in Frederick County, MD
- Slide-out panel for viewing and editing store details
- Store tracking: visited status, owner name, comments
- Fortaleza tequila availability tracking (Blanco, Reposado, Añejo)
- Don Julio 1942 price tracking with history
- Visit logging with date and price capture
- Price history display with change indicators
- Filtering by visit status, Fortaleza availability, Don Julio 1942 price
- Sorting by name, visit status, recent visits, cheapest 1942
- Data export to JSON (full backup) and CSV (spreadsheet)
- JSON import for data restoration
- Brown and gold theme with modern UI
- localStorage persistence with auto-save
- Manual store entry for stores not in Google Places
- Google Places API integration for automatic store discovery

### Changed
- Switched from Node.js backend to Vite-based React SPA
- Updated npm scripts for Vite development workflow

## [0.1.0] - 2026-01-21

### Added
- Initial project scaffold
- TypeScript configuration
- ESLint and Prettier setup
- Vitest test framework
- Project documentation structure
- Claude Flow integration
