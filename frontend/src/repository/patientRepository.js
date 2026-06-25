import { 
  saveRecord, 
  getRecord, 
  getAllRecords, 
  deleteRecord, 
  saveDraft, 
  getDraft, 
  deleteDraft,
  setMetadata,
  getMetadata
} from '../indexeddb/db';
import { extractStructuredData } from '../utils/structuredProcessor';
import { calculateRisk } from '../utils/riskEngine';
import { verifyConnectivity } from '../utils/connectivity';
import { syncPendingRecords } from '../sync/syncEngine';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://aasha-production-1974.up.railway.app';

export const patientRepository = {
  /**
   * Save a patient record (Offline-first write)
   */
  async savePatient(recordData) {
    const now = Date.now();
    const id = recordData.id || now.toString();
    
    // Perform NLP Parsing and Risk assessment locally
    const lang = recordData.language || 'en';
    const structured = extractStructuredData(recordData.rawText, lang);
    const riskLevel = calculateRisk(structured, recordData.patientType);

    const record = {
      id,
      patientName: recordData.patientName.trim(),
      age: Number(recordData.age),
      phone: recordData.phone?.trim() || null,
      patientType: recordData.patientType,
      rawText: recordData.rawText,
      language: lang,
      structured: { ...structured, visitType: recordData.visitType || 'routine' },
      riskLevel,
      createdAt: recordData.createdAt || now,
      updatedAt: now,
      syncStatus: recordData.syncStatus || 'pending'
    };

    // Save to IndexedDB
    await saveRecord(record);

    // Asynchronously trigger sync if online
    const isOnline = await verifyConnectivity();
    if (isOnline) {
      // Run sync in background (non-blocking)
      syncPendingRecords().catch(err => console.error("Background sync failed:", err));
    }

    return record;
  },

  /**
   * Soft-delete a record offline
   */
  async deletePatient(id) {
    const record = await getRecord(id);
    if (!record) return;

    // Mark as pending-delete to let the sync queue remove it on the backend
    record.syncStatus = 'pending-delete';
    record.updatedAt = Date.now();
    await saveRecord(record);

    // Try synchronizing
    const isOnline = await verifyConnectivity();
    if (isOnline) {
      syncPendingRecords().catch(err => console.error("Background delete sync failed:", err));
    }
  },

  /**
   * Get a specific patient record
   */
  async getPatient(id) {
    return getRecord(id);
  },

  /**
   * Retrieve all patients (Filters out pending-delete)
   */
  async getAllPatients() {
    const allRecords = await getAllRecords();
    
    // Filter out soft-deleted items
    const activeRecords = allRecords.filter(r => r.syncStatus !== 'pending-delete');

    // Trigger asynchronous background pull from backend if online
    const isOnline = await verifyConnectivity();
    if (isOnline) {
      this.syncFromServer().catch(err => console.warn("Background server pull failed:", err));
    }

    // Sort by createdAt descending
    return activeRecords.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  /**
   * Pull records from server and sync to local IndexedDB
   */
  async syncFromServer() {
    try {
      const response = await fetch(`${API_BASE}/api/records`);
      if (!response.ok) return;

      const data = await response.json();
      const serverRecords = data.records || [];

      // Save server records locally if we don't have pending edits
      for (const sRec of serverRecords) {
        const local = await getRecord(sRec.id);
        
        // Only overwrite if we don't have local pending modifications
        if (!local || local.syncStatus === 'synced') {
          await saveRecord({
            ...sRec,
            syncStatus: 'synced'
          });
        }
      }
      
      // Update metadata last synced time
      await setMetadata('last_synced_at', Date.now());
    } catch (e) {
      console.warn("Could not sync records from server:", e);
    }
  },

  /**
   * Search patients locally by name, phone, or symptoms
   */
  async searchPatients(query) {
    const activeRecords = await this.getAllPatients();
    if (!query || !query.trim()) return activeRecords;

    const term = query.toLowerCase().trim();
    return activeRecords.filter(p => {
      const name = (p.patientName || '').toLowerCase();
      const phone = (p.phone || '').toLowerCase();
      const rawText = (p.rawText || '').toLowerCase();
      const symptoms = (p.structured?.symptoms || []).map(s => s.toLowerCase());

      return name.includes(term) || 
             phone.includes(term) || 
             rawText.includes(term) ||
             symptoms.some(s => s.includes(term));
    });
  },

  /**
   * Draft helpers
   */
  async saveFormDraft(formFields) {
    return saveDraft(formFields);
  },

  async getFormDraft() {
    return getDraft();
  },

  async clearFormDraft() {
    return deleteDraft();
  }
};

export default patientRepository;
