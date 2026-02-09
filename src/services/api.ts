/**
 * API service for communicating with the backend server
 */

import type { StorageData, Store, AppSettings } from '../types/store';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed: ${url}`, error);
    throw error;
  }
}

export async function loadDataFromApi(): Promise<StorageData | null> {
  try {
    const [storesResponse, settingsResponse] = await Promise.all([
      fetchWithErrorHandling<{ stores: Store[] }>(`${API_BASE_URL}/api/stores`),
      fetchWithErrorHandling<AppSettings>(`${API_BASE_URL}/api/settings`),
    ]);

    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      stores: storesResponse.stores,
      settings: settingsResponse,
    };
  } catch (error) {
    console.error('Failed to load data from API:', error);
    return null;
  }
}

export async function saveDataToApi(data: StorageData): Promise<boolean> {
  try {
    await fetchWithErrorHandling(`${API_BASE_URL}/api/data`, {
      method: 'POST',
      body: JSON.stringify({
        stores: data.stores,
        settings: data.settings,
      }),
    });
    return true;
  } catch (error) {
    console.error('Failed to save data to API:', error);
    return false;
  }
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    await fetchWithErrorHandling<{ status: string }>(`${API_BASE_URL}/api/health`);
    return true;
  } catch (error) {
    return false;
  }
}
