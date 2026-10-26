import { MetalFind } from '../types';
import { db, auth, uploadFindImage, handleFirestoreError, OperationType } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

const DB_NAME = 'TerraDetect_OfflineDB';
const DB_VERSION = 1;
const STORE_PENDING = 'pending_finds';
const STORE_CACHE = 'cached_finds';

export interface PendingOfflineFind {
  localId: string;
  data: Omit<MetalFind, 'id' | 'createdAt' | 'updatedAt'>;
  createdAt: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported on this device.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        db.createObjectStore(STORE_PENDING, { keyPath: 'localId' });
      }
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a find locally in IndexedDB when offline or to queue for background sync
 */
export async function saveFindToOfflineQueue(
  findData: Omit<MetalFind, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = await openDatabase();
  const localId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const item: PendingOfflineFind = {
    localId,
    data: findData,
    createdAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readwrite');
    const store = tx.objectStore(STORE_PENDING);
    const req = store.put(item);

    req.onsuccess = () => resolve(localId);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get count and items of all pending offline finds
 */
export async function getPendingOfflineFinds(): Promise<PendingOfflineFind[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PENDING, 'readonly');
      const store = tx.objectStore(STORE_PENDING);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to retrieve pending offline finds:', err);
    return [];
  }
}

/**
 * Remove a single synced find from the offline queue
 */
export async function removePendingFind(localId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readwrite');
    const store = tx.objectStore(STORE_PENDING);
    const req = store.delete(localId);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Cache user finds for offline viewing
 */
export async function cacheFindsLocally(finds: MetalFind[]): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_CACHE, 'readwrite');
    const store = tx.objectStore(STORE_CACHE);
    store.clear();
    for (const find of finds) {
      if (find.id) {
        store.put(find);
      }
    }
  } catch (err) {
    console.warn('Failed to cache finds locally:', err);
  }
}

/**
 * Read cached finds when offline
 */
export async function getLocallyCachedFinds(): Promise<MetalFind[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CACHE, 'readonly');
      const store = tx.objectStore(STORE_CACHE);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to get cached finds:', err);
    return [];
  }
}

/**
 * Sync all pending offline finds to Firebase Firestore and Storage
 */
export async function syncOfflineQueueToFirestore(
  onItemSynced?: (syncedCount: number, total: number) => void
): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine || !auth.currentUser) {
    return { synced: 0, failed: 0 };
  }

  const pendingList = await getPendingOfflineFinds();
  if (pendingList.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (let i = 0; i < pendingList.length; i++) {
    const item = pendingList[i];
    try {
      let finalImageUrl = item.data.imageUrl;
      const targetUserId = auth.currentUser.uid;

      if (finalImageUrl && finalImageUrl.startsWith('data:')) {
        finalImageUrl = await uploadFindImage(finalImageUrl, targetUserId);
      }

      const payload = {
        ...item.data,
        userId: targetUserId,
        userDisplayName: auth.currentUser.displayName || item.data.userDisplayName || 'Detectorist',
        imageUrl: finalImageUrl,
        createdAt: item.createdAt,
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'finds'), payload);
      await removePendingFind(item.localId);
      synced++;

      if (onItemSynced) {
        onItemSynced(synced, pendingList.length);
      }
    } catch (err) {
      console.error(`Failed to sync offline find ${item.localId}:`, err);
      failed++;
    }
  }

  return { synced, failed };
}
