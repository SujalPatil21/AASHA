import { openDB } from 'idb';

const DB_NAME = 'asha-health-db';
const STORE_NAME = 'records';
const DB_VERSION = 1;

/**
 * Initialize the IndexedDB database
 * Opens the database and creates the object store if it doesn't exist
 */
export async function initDB() {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create the object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex("syncStatus", "syncStatus");
      }
    },
  });
  return db;
}

/**
 * Save a record to the IndexedDB store
 * @param {Object} record - The record to save
 * @param {string} record.id - Unique identifier
 * @param {string} record.patientType - Type of patient
 * @param {string} record.rawText - Raw text input
 * @param {string} record.language - Language of the text
 * @param {Object} record.structured - Structured data
 * @param {number} record.createdAt - Timestamp of creation
 * @param {string} record.syncStatus - Sync status (default: 'pending')
 * @returns {Promise<IDBValidKey>} The key of the saved record
 */
export async function saveRecord(record) {
  if (!record.syncStatus) {
    record.syncStatus = "pending";
  }
  const db = await initDB();
  return db.add(STORE_NAME, record);
}

/**
 * Retrieve all records from the IndexedDB store
 * @returns {Promise<Array>} Array of all records
 */
export async function getAllRecords() {
  const db = await initDB();
  return db.getAll(STORE_NAME);
}

/**
 * Mark a record as synced by updating its syncStatus
 * @param {string} id - The id of the record to update
 * @returns {Promise<IDBValidKey>} The key of the updated record
 */
export async function markRecordSynced(id) {
  const db = await initDB();
  const record = await db.get(STORE_NAME, id);
  
  if (!record) {
    throw new Error(`Record with id ${id} not found`);
  }
  
  record.syncStatus = 'synced';
  return db.put(STORE_NAME, record);
}
