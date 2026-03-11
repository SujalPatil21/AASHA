import { getAllRecords, markRecordSynced } from '../indexeddb/db';
import { verifyConnectivity } from '../utils/connectivity';

const API_URL = import.meta.env.VITE_SYNC_API_URL || 'http://localhost:8080/records';
const inFlightRecordIds = new Set();

function getSourceDevice() {
  const key = 'asha_source_device_id';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const generated =
    window.crypto?.randomUUID?.() ||
    `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(key, generated);
  return generated;
}

function buildPayload(record) {
  return {
    id: record.id,
    patientName: record.patientName || null,
    age: Number.isFinite(record.age) ? record.age : record.age ? Number(record.age) : null,
    phone: record.phone || null,
    patientType: record.patientType,
    rawText: record.rawText,
    language: record.language,
    structured: record.structured,
    riskLevel: record.riskLevel || record.risk || null,
    createdAt: record.createdAt,
    sourceDevice: getSourceDevice(),
  };
}

/**
 * Sync pending records from IndexedDB to the backend API.
 * Keeps failed uploads pending and only marks records synced on confirmed success.
 */
export async function syncPendingRecords() {
  const isReachable = await verifyConnectivity();
  if (!isReachable) {
    console.log('Connectivity check failed; skipping sync attempt');
    return;
  }

  try {
    const allRecords = await getAllRecords();
    const pendingRecords = allRecords.filter((record) => record.syncStatus === 'pending');

    if (pendingRecords.length === 0) {
      console.log('No pending records to sync');
      return;
    }

    console.log(`Found ${pendingRecords.length} pending records to sync`);

    const seenInBatch = new Set();

    for (const record of pendingRecords) {
      if (seenInBatch.has(record.id) || inFlightRecordIds.has(record.id)) {
        continue;
      }

      seenInBatch.add(record.id);
      inFlightRecordIds.add(record.id);

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(buildPayload(record)),
        });

        if (response.ok) {
          await markRecordSynced(record.id);
          console.log(`Record ${record.id} synced successfully`);
        } else {
          console.error(`Failed to sync record ${record.id}: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error(`Error syncing record ${record.id}:`, error);
      } finally {
        inFlightRecordIds.delete(record.id);
      }
    }

    console.log('Sync completed');
  } catch (error) {
    console.error('Error during sync:', error);
  }
}
