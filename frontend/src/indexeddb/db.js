import { openDB } from 'idb';

const DB_NAME = 'asha-health-db';
const STORE_NAME = 'records';
const DRAFTS_STORE = 'drafts';
const METADATA_STORE = 'metadata';
const DB_VERSION = 2;

/**
 * Initialize the IndexedDB database
 * Opens the database and creates the object stores, handling upgrades
 */
export async function initDB() {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Version 1 upgrade
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex("syncStatus", "syncStatus");
        }
      }
      // Version 2 upgrade: add drafts and metadata stores
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
          db.createObjectStore(DRAFTS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
        }
      }
    },
  });
  return db;
}

/**
 * Save or update a record in the IndexedDB store
 * @param {Object} record - The record to save
 * @returns {Promise<IDBValidKey>}
 */
export async function saveRecord(record) {
  if (!record.syncStatus) {
    record.syncStatus = "pending";
  }
  record.updatedAt = Date.now();
  const db = await initDB();
  return db.put(STORE_NAME, record);
}

/**
 * Get a specific patient record by id
 * @param {string} id - Unique identifier
 * @returns {Promise<Object|undefined>}
 */
export async function getRecord(id) {
  const db = await initDB();
  return db.get(STORE_NAME, id);
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
 * Delete a specific patient record by id
 * @param {string} id - Unique identifier
 * @returns {Promise<void>}
 */
export async function deleteRecord(id) {
  const db = await initDB();
  return db.delete(STORE_NAME, id);
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
  record.updatedAt = Date.now();
  return db.put(STORE_NAME, record);
}

/**
 * Save form draft state
 * @param {Object} draft - Form draft content
 * @returns {Promise<IDBValidKey>}
 */
export async function saveDraft(draft) {
  if (!draft.id) {
    draft.id = 'asha_form_draft';
  }
  draft.updatedAt = Date.now();
  const db = await initDB();
  return db.put(DRAFTS_STORE, draft);
}

/**
 * Retrieve form draft state
 * @param {string} id - Draft identifier
 * @returns {Promise<Object|undefined>}
 */
export async function getDraft(id = 'asha_form_draft') {
  const db = await initDB();
  return db.get(DRAFTS_STORE, id);
}

/**
 * Delete active form draft
 * @param {string} id - Draft identifier
 * @returns {Promise<void>}
 */
export async function deleteDraft(id = 'asha_form_draft') {
  const db = await initDB();
  return db.delete(DRAFTS_STORE, id);
}

/**
 * Store metadata key-value
 * @param {string} key
 * @param {any} value
 * @returns {Promise<IDBValidKey>}
 */
export async function setMetadata(key, value) {
  const db = await initDB();
  return db.put(METADATA_STORE, { key, value, updatedAt: Date.now() });
}

/**
 * Retrieve metadata value by key
 * @param {string} key
 * @returns {Promise<any>}
 */
export async function getMetadata(key) {
  const db = await initDB();
  const result = await db.get(METADATA_STORE, key);
  return result ? result.value : null;
}
