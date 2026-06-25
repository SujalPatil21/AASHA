import { getAllRecords, markRecordSynced, deleteRecord } from '../indexeddb/db';
import { verifyConnectivity } from '../utils/connectivity';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://aasha-production-1974.up.railway.app';
const API_URL = `${API_BASE}/api/records`;
const SYNC_URL = `${API_BASE}/api/sync`;
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
    updatedAt: record.updatedAt || record.createdAt || Date.now(),
    sourceDevice: getSourceDevice(),
  };
}

/**
 * Sync pending records (inserts, updates, and deletes) to the backend.
 */
export async function syncPendingRecords() {
  const isReachable = await verifyConnectivity();
  if (!isReachable) {
    console.log('Connectivity check failed; skipping sync attempt');
    return;
  }

  try {
    const allRecords = await getAllRecords();
    
    // 1. Process soft deletes offline
    const pendingDeletions = allRecords.filter((record) => record.syncStatus === 'pending-delete');
    if (pendingDeletions.length > 0) {
      console.log(`Found ${pendingDeletions.length} pending deletions to sync`);
      for (const record of pendingDeletions) {
        if (inFlightRecordIds.has(record.id)) continue;
        inFlightRecordIds.add(record.id);

        try {
          const response = await fetch(`${API_URL}/${record.id}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            await deleteRecord(record.id);
            console.log(`Record ${record.id} deleted successfully from server and local cache`);
          } else {
            console.error(`Failed to delete record ${record.id} on server: ${response.status}`);
          }
        } catch (error) {
          console.error(`Error deleting record ${record.id}:`, error);
        } finally {
          inFlightRecordIds.delete(record.id);
        }
      }
    }

    // 2. Process batch inserts and updates
    const pendingUploads = allRecords.filter((record) => record.syncStatus === 'pending');
    if (pendingUploads.length === 0) {
      console.log('No pending updates or uploads to sync');
      return;
    }

    console.log(`Found ${pendingUploads.length} pending records to upload`);
    const uploadBatch = [];

    for (const record of pendingUploads) {
      if (inFlightRecordIds.has(record.id)) continue;
      uploadBatch.push(record);
      inFlightRecordIds.add(record.id);
    }

    if (uploadBatch.length === 0) return;

    try {
      const response = await fetch(SYNC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uploadBatch.map(buildPayload)),
      });

      if (response.ok) {
        for (const record of uploadBatch) {
          await markRecordSynced(record.id);
          console.log(`Record ${record.id} synced successfully`);
        }
        console.log('Batch sync completed successfully');
      } else {
        console.error(`Batch sync failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error during batch sync upload:', error);
    } finally {
      for (const record of uploadBatch) {
        inFlightRecordIds.delete(record.id);
      }
    }
  } catch (error) {
    console.error('Error during sync cycle:', error);
  }
}
