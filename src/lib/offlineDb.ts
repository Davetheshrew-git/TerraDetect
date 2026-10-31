/**
 * TerraDetect UK — Private On-Device Vault Storage Engine (IndexedDB)
 * Stores all detectorist finds, photos, and GPS coordinates 100% locally on the user's device.
 */

import { MetalFind } from '../types';

const VAULT_DB_NAME = 'TerraDetect_LocalVault';
const VAULT_DB_VERSION = 2;
const VAULT_STORE_NAME = 'finds';

function openVaultDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB storage is unavailable on this browser.'));
    }

    const openReq = window.indexedDB.open(VAULT_DB_NAME, VAULT_DB_VERSION);

    openReq.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(VAULT_STORE_NAME)) {
        db.createObjectStore(VAULT_STORE_NAME, { keyPath: 'id' });
      }
    };

    openReq.onsuccess = () => resolve(openReq.result);
    openReq.onerror = () => reject(openReq.error);
  });
}

function generateVaultRecordId(prefix = 'td_vault'): string {
  const timeHex = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timeHex}_${randomPart}`;
}

/**
 * Save a newly logged metallic find into the device's Local Vault
 */
export async function saveLocalFind(
  findInput: Omit<MetalFind, 'id' | 'createdAt' | 'updatedAt'>
): Promise<MetalFind> {
  const db = await openVaultDatabase();
  const nowIso = new Date().toISOString();

  const record: MetalFind = {
    ...findInput,
    id: generateVaultRecordId('td_find'),
    userId: 'device-owner',
    userDisplayName: findInput.userDisplayName || 'Detectorist (Device Vault)',
    createdAt: nowIso,
    updatedAt: nowIso
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(VAULT_STORE_NAME);
    const putReq = store.put(record);

    putReq.onsuccess = () => resolve(record);
    putReq.onerror = () => reject(putReq.error);
  });
}

/**
 * Retrieve all finds stored in the device's Local Vault (newest first)
 */
export async function getAllLocalFinds(): Promise<MetalFind[]> {
  try {
    const db = await openVaultDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(VAULT_STORE_NAME, 'readonly');
      const store = tx.objectStore(VAULT_STORE_NAME);
      const getAllReq = store.getAll();

      getAllReq.onsuccess = () => {
        const records: MetalFind[] = getAllReq.result || [];
        records.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        resolve(records);
      };
      getAllReq.onerror = () => reject(getAllReq.error);
    });
  } catch (err) {
    console.warn('Unable to read Local Vault:', err);
    return [];
  }
}

/**
 * Delete a specific find by ID from the Local Vault
 */
export async function deleteLocalFind(findId: string): Promise<void> {
  const db = await openVaultDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(VAULT_STORE_NAME);
    const delReq = store.delete(findId);

    delReq.onsuccess = () => resolve();
    delReq.onerror = () => reject(delReq.error);
  });
}

/**
 * Update an existing find in the Local Vault
 */
export async function updateLocalFind(
  findId: string,
  patch: Partial<MetalFind>
): Promise<MetalFind> {
  const db = await openVaultDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(VAULT_STORE_NAME);
    const getReq = store.get(findId);

    getReq.onsuccess = () => {
      const existing = getReq.result as MetalFind | undefined;
      if (!existing) {
        return reject(new Error(`Record "${findId}" not found in Local Vault.`));
      }

      const updated: MetalFind = {
        ...existing,
        ...patch,
        id: findId,
        updatedAt: new Date().toISOString()
      };

      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve(updated);
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Export the entire Local Vault to a downloadable .json archive
 */
export async function exportLocalVaultBackup(): Promise<string> {
  const records = await getAllLocalFinds();
  const payload = {
    application: 'TerraDetect UK',
    schemaVersion: '2.1-device-vault',
    exportedAt: new Date().toISOString(),
    recordCount: records.length,
    finds: records
  };

  const serialized = JSON.stringify(payload, null, 2);
  const blob = new Blob([serialized], { type: 'application/json' });
  const objectUrl = URL.createObjectURL(blob);
  const dateStamp = new Date().toISOString().slice(0, 10);

  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `TerraDetect_Vault_${dateStamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);

  return serialized;
}

/**
 * Restore and merge records from a .json backup archive into the Local Vault
 */
export async function importLocalVaultBackup(
  rawJson: string
): Promise<{ importedCount: number; errors: number }> {
  const parsed = JSON.parse(rawJson);
  const candidateList: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.finds)
    ? parsed.finds
    : [];

  if (candidateList.length === 0) {
    throw new Error('No valid find records found in the selected backup file.');
  }

  const db = await openVaultDatabase();
  let importedCount = 0;
  let errors = 0;

  const tx = db.transaction(VAULT_STORE_NAME, 'readwrite');
  const store = tx.objectStore(VAULT_STORE_NAME);

  for (const raw of candidateList) {
    if (!raw?.title || typeof raw.latitude !== 'number' || typeof raw.longitude !== 'number') {
      errors++;
      continue;
    }

    const sanitized: MetalFind = {
      id: raw.id || generateVaultRecordId('td_restored'),
      userId: 'device-owner',
      userDisplayName: raw.userDisplayName || 'Detectorist (Device Vault)',
      title: String(raw.title).trim(),
      depth: raw.depth || '',
      targetVdi: raw.targetVdi || '',
      metalType: raw.metalType || 'Other',
      customTags: Array.isArray(raw.customTags) ? raw.customTags : [],
      notes: raw.notes || '',
      latitude: Number(raw.latitude),
      longitude: Number(raw.longitude),
      accuracy: Number(raw.accuracy) || 5,
      generalLocation: raw.generalLocation || 'United Kingdom',
      imageUrl: raw.imageUrl || '',
      isPublic: Boolean(raw.isPublic),
      likesCount: Number(raw.likesCount) || 0,
      nearScheduledMonument: Boolean(raw.nearScheduledMonument),
      nearestMonumentName: raw.nearestMonumentName,
      nearestMonumentDistance: raw.nearestMonumentDistance,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    store.put(sanitized);
    importedCount++;
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve({ importedCount, errors });
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Wipe all records from the Local Vault
 */
export async function clearLocalVault(): Promise<void> {
  const db = await openVaultDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(VAULT_STORE_NAME);
    const clearReq = store.clear();

    clearReq.onsuccess = () => resolve();
    clearReq.onerror = () => reject(clearReq.error);
  });
}

/**
 * Compute storage footprint of the Local Vault
 */
export async function getLocalVaultStats(): Promise<{ count: number; estimatedSizeKB: number }> {
  try {
    const records = await getAllLocalFinds();
    const byteLength = new Blob([JSON.stringify(records)]).size;
    return {
      count: records.length,
      estimatedSizeKB: Math.round(byteLength / 1024)
    };
  } catch {
    return { count: 0, estimatedSizeKB: 0 };
  }
}
