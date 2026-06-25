import { useState, useEffect, useCallback, useRef } from "react";
import extractStructuredData from '../utils/structuredProcessor';
import calculateRisk from '../utils/riskEngine';
import { patientRepository } from "../repository/patientRepository";
import { syncPendingRecords } from "../sync/syncEngine";
import { verifyConnectivity } from "../utils/connectivity";
import micIcon from "../assets/mic.png";

function detectInputLanguage(text) {
  const input = (text || '').toLowerCase();
  const hasDevanagari = /[\u0900-\u097F]/.test(input);
  if (!hasDevanagari) return 'en';

  const hindiMarkers = [' है ', ' में ', ' को ', ' दिन', ' बुखार', ' गर्भवती', ' रक्तस्राव'];
  const marathiMarkers = [' आहे ', ' मध्ये ', ' दिवस', ' ताप', ' गरोदर', ' जास्त', ' सूज'];

  let hiScore = 0;
  let mrScore = 0;
  hindiMarkers.forEach((m) => {
    if (input.includes(m.trim())) hiScore += 1;
  });
  marathiMarkers.forEach((m) => {
    if (input.includes(m.trim())) mrScore += 1;
  });

  return mrScore > hiScore ? 'mr' : 'hi';
}

function getRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function toSpeechLocale(language, text) {
  if (language === "hi") return "hi-IN";
  if (language === "mr") return "mr-IN";
  if (language === "en") return "en-IN";
  const detected = detectInputLanguage(text);
  if (detected === "mr") return "mr-IN";
  if (detected === "hi") return "hi-IN";
  return "en-IN";
}

function AshaPage() {
  const [language, setLanguage] = useState('auto');
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [patientType, setPatientType] = useState('adult');
  const [visitType, setVisitType] = useState('routine');
  const [rawText, setRawText] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [risk, setRisk] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [lastDetectedLanguage, setLastDetectedLanguage] = useState('en');
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState("");
  const [micMode, setMicMode] = useState("");
  
  // Offline CRUD & Draft states
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  // Sync states
  const [syncState, setSyncState] = useState('idle'); // 'idle' | 'syncing' | 'success' | 'failed'
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const recognitionRef = useRef(null);

  const refreshRecords = useCallback(async () => {
    const data = await patientRepository.searchPatients(searchQuery);
    setRecords(data);
  }, [searchQuery]);

  const checkConnectivityAndSync = useCallback(async () => {
    const reachable = await verifyConnectivity();
    setIsOnline(reachable);

    if (reachable) {
      setSyncState('syncing');
      try {
        await syncPendingRecords();
        setSyncState('success');
        setLastSyncTime(new Date().toLocaleTimeString());
      } catch (err) {
        setSyncState('failed');
      }
    } else {
      setSyncState('idle');
    }
    refreshRecords();
  }, [refreshRecords]);


  // Load draft and local records on mount
  useEffect(() => {
    const initPage = async () => {
      // Restore form draft if available
      const draft = await patientRepository.getFormDraft();
      if (draft) {
        setPatientName(draft.patientName || '');
        setAge(draft.age || '');
        setPhone(draft.phone || '');
        setPatientType(draft.patientType || 'adult');
        setVisitType(draft.visitType || 'routine');
        setRawText(draft.rawText || '');
        setLanguage(draft.language || 'auto');
      }
      refreshRecords();
    };
    initPage();
  }, []);

  // Save form draft on changes (only if not actively editing an existing record)
  useEffect(() => {
    if (editingId) return;

    const saveCurrentDraft = async () => {
      await patientRepository.saveFormDraft({
        patientName,
        age,
        phone,
        patientType,
        visitType,
        rawText,
        language
      });
    };

    saveCurrentDraft();
  }, [patientName, age, phone, patientType, visitType, rawText, language, editingId]);

  // Refresh records list when search query changes
  useEffect(() => {
    refreshRecords();
  }, [searchQuery, refreshRecords]);

  // Auto sync polling & event listeners
  useEffect(() => {
    checkConnectivityAndSync();

    const handleNetworkEvent = () => {
      checkConnectivityAndSync();
    };

    const interval = window.setInterval(checkConnectivityAndSync, 30000);

    window.addEventListener("online", handleNetworkEvent);
    window.addEventListener("offline", handleNetworkEvent);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", handleNetworkEvent);
      window.removeEventListener("offline", handleNetworkEvent);
    };
  }, [checkConnectivityAndSync]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const Recognition = getRecognitionConstructor();
    if (!Recognition) {
      setMicError("Speech recognition is not supported in this browser.");
      return;
    }
    const start = async () => {
      setMicError("");
      setMicMode("");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        setMicError("Microphone permission denied or unavailable.");
        return;
      }

      const mountRecognition = (preferLocal) => {
        const recognition = new Recognition();
        recognition.lang = toSpeechLocale(language, rawText);
        recognition.continuous = true;
        recognition.interimResults = true;
        if ("processLocally" in recognition) {
          recognition.processLocally = preferLocal;
        }

        recognition.onresult = (event) => {
          let finalChunk = "";
          let interimChunk = "";

          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const transcript = event.results[i][0]?.transcript || "";
            if (event.results[i].isFinal) {
              finalChunk += `${transcript.trim()} `;
            } else {
              interimChunk += `${transcript.trim()} `;
            }
          }

          const transcriptChunk = (finalChunk || interimChunk).trim();
          if (!transcriptChunk) return;

          setRawText((prev) => {
            const base = prev.trim();
            return base ? `${base} ${transcriptChunk}`.slice(0, 500) : transcriptChunk.slice(0, 500);
          });
        };

        recognition.onerror = (event) => {
          const localModeAttempt = "processLocally" in recognition && recognition.processLocally === true;

          if (localModeAttempt && (event.error === "language-not-supported" || event.error === "service-not-allowed")) {
            setMicMode("Online fallback");
            setMicError("Offline speech pack unavailable. Switched to online recognition.");
            recognitionRef.current = null;
            setIsListening(false);
            mountRecognition(false);
            return;
          }

          if (event.error === "not-allowed") {
            setMicError("Microphone permission denied.");
          } else if (event.error === "language-not-supported") {
            setMicError("Speech pack for this language is not available on-device.");
          } else {
            setMicError(`Speech recognition error: ${event.error}`);
          }
          stopListening();
        };

        recognition.onend = () => {
          setIsListening(false);
          recognitionRef.current = null;
        };

        try {
          recognitionRef.current = recognition;
          recognition.start();
          setIsListening(true);
          setMicMode(preferLocal ? "Offline-first" : "Online fallback");
        } catch {
          setMicError("Could not start speech recognition in this browser.");
          stopListening();
        }
      };

      mountRecognition(true);
    };

    start();
  }, [language, rawText, stopListening]);

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }
    startListening();
  }, [isListening, startListening, stopListening]);

  const handleProcessInput = async () => {
    if (!rawText.trim()) {
      alert("Please enter or record an observation.");
      return;
    }
    if (!patientName.trim()) {
      alert("Please enter patient name.");
      return;
    }
    if (!age || Number(age) <= 0) {
      alert("Please enter a valid age.");
      return;
    }

    const effectiveLanguage = language === 'auto' ? detectInputLanguage(rawText) : language;
    setLastDetectedLanguage(effectiveLanguage);

    const result = extractStructuredData(rawText, effectiveLanguage);
    setExtracted(result);
    const riskResult = calculateRisk(result, patientType);
    setRisk(riskResult);

    const now = Date.now();
    const patientData = {
      id: editingId || now.toString(),
      patientName: patientName.trim(),
      age: Number(age),
      phone: phone.trim() || null,
      patientType,
      visitType,
      rawText,
      language: effectiveLanguage,
      syncStatus: "pending"
    };

    // If editing, preserve the original createdAt timestamp if we can find it
    if (editingId) {
      const original = records.find(r => r.id === editingId);
      if (original) {
        patientData.createdAt = original.createdAt;
      }
    }

    await patientRepository.savePatient(patientData);
    setLastSavedAt(now);
    
    // Clear draft and reset state variables
    await patientRepository.clearFormDraft();
    setEditingId(null);
    setPatientName('');
    setAge('');
    setPhone('');
    setRawText('');
    setExtracted(null);
    setRisk(null);
    
    refreshRecords();
  };

  const handleSaveAndSync = async () => {
    await handleProcessInput();
    await checkConnectivityAndSync();
  };

  const handleEditRecord = (record) => {
    setEditingId(record.id);
    setPatientName(record.patientName || '');
    setAge(record.age || '');
    setPhone(record.phone || '');
    setPatientType(record.patientType || 'adult');
    setVisitType(record.structured?.visitType || record.visitType || 'routine');
    setRawText(record.rawText || '');
    setLanguage(record.language || 'auto');
    setExtracted(record.structured || null);
    setRisk(record.riskLevel || null);
  };

  const handleCancelEdit = async () => {
    setEditingId(null);
    setPatientName('');
    setAge('');
    setPhone('');
    setRawText('');
    setExtracted(null);
    setRisk(null);
    await patientRepository.clearFormDraft();
  };

  const cardStyle = {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.88), rgba(244,252,247,0.78))',
    border: '1px solid rgba(151, 188, 167, 0.45)',
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 8px 28px rgba(16, 24, 40, 0.08)',
    backdropFilter: 'blur(10px)',
  };
  const inputStyle = { width: '100%', border: '1px solid #c9d8cf', borderRadius: 8, padding: '10px 12px', color: '#111827', background: '#fff' };
  const primaryButton = { borderRadius: 10, border: '1px solid #0f8f5a', padding: '10px 16px', background: '#0f8f5a', color: '#fff', fontWeight: 600, cursor: 'pointer' };
  const secondaryButton = { borderRadius: 10, border: '1px solid #9ecbb3', padding: '10px 16px', background: '#ecfdf3', color: '#0f5132', fontWeight: 600, cursor: 'pointer' };
  const cancelEditButton = { borderRadius: 10, border: '1px solid #d1d5db', padding: '10px 16px', background: '#f3f4f6', color: '#374151', fontWeight: 600, cursor: 'pointer' };
  
  const riskLabel = risk || 'No risk';
  const riskTone = riskLabel.toLowerCase().includes('critical')
    ? { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', dot: '#dc2626' }
    : riskLabel.toLowerCase().includes('high')
      ? { bg: '#fff7ed', border: '#f97316', text: '#9a3412', dot: '#ea580c' }
      : riskLabel.toLowerCase().includes('medium')
        ? { bg: '#fffbeb', border: '#f59e0b', text: '#92400e', dot: '#d97706' }
        : { bg: '#ecfdf3', border: '#16a34a', text: '#065f46', dot: '#16a34a' };

  const pendingCount = records.filter(r => r.syncStatus === 'pending' || r.syncStatus === 'pending-delete').length;

  return (
    <div style={{ maxWidth: 1100, margin: '24px auto', padding: 16 }}>
      {/* Dynamic Offline Warning Banner */}
      {!isOnline && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fef3c7',
          borderLeft: '6px solid #d97706',
          color: '#92400e',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 16,
          fontWeight: 600,
          fontSize: 14,
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <span>⚠️</span>
          <span><strong>Working Offline:</strong> Patient records will be saved locally on this device and synced automatically to the server when connection is restored.</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(151, 188, 167, 0.45)', borderRadius: 24, padding: '6px 12px', marginBottom: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0f8f5a' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f5132', letterSpacing: 0.4 }}>AASHA PLATFORM</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 38, lineHeight: 1.08, color: '#111827' }}>AASHA Health Console</h1>
          <small style={{ color: '#475467', fontSize: 14 }}>AI-Powered Assistant for Community Health Visits</small>
        </div>
        
        {/* Sync Status Console Card */}
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(244,252,247,0.8))', 
          border: '1px solid rgba(151, 188, 167, 0.45)', 
          borderRadius: 12, 
          padding: '10px 16px',
          boxShadow: '0 4px 12px rgba(16, 24, 40, 0.05)',
          fontSize: 13,
          minWidth: 240
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <strong>Network Status:</strong>
            <span style={{ 
              background: isOnline ? '#ecfdf3' : '#fef3f2', 
              color: isOnline ? '#027a48' : '#b42318', 
              borderRadius: 16, 
              padding: '2px 8px', 
              fontWeight: 700,
              fontSize: 11
            }}>
              {isOnline ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Unsynced Queue:</span>
            <span style={{ 
              fontWeight: 700, 
              color: pendingCount > 0 ? '#b42318' : '#027a48',
              background: pendingCount > 0 ? '#fef3f2' : '#ecfdf3',
              padding: '1px 6px',
              borderRadius: 6,
              fontSize: 11
            }}>
              {pendingCount} records
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Sync Status:</span>
            <span style={{ fontWeight: 600, color: '#475467' }}>
              {syncState === 'syncing' ? '⏳ Syncing...' :
               syncState === 'success' ? '✅ Synced' :
               syncState === 'failed' ? '❌ Sync Failed' : '💤 Standby'}
            </span>
          </div>
          {lastSyncTime && (
            <div style={{ fontSize: 11, color: '#667085', textAlign: 'right', marginTop: 4 }}>
              Last sync: {lastSyncTime}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>
            {editingId ? "Edit Patient Health Record" : "Add New Patient - Health Record"}
          </h2>

          <h3 style={{ marginBottom: 10 }}>Basic Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr 1fr', gap: 10, marginBottom: 10 }}>
            <input style={inputStyle} value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Full Name *" />
            <input style={inputStyle} type="number" min="0" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age *" />
            <select style={inputStyle} value={patientType} onChange={(e) => setPatientType(e.target.value)}>
              <option value="adult">Adult</option>
              <option value="child">Child</option>
              <option value="pregnant">Pregnant</option>
              <option value="elder">Elder</option>
              <option value="general">General</option>
            </select>
          </div>
          <input
            style={{ ...inputStyle, marginBottom: 14 }}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Mobile Number"
          />

          <h3 style={{ marginBottom: 10 }}>Visit Type</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {['routine', 'follow-up', 'emergency'].map((type) => (
              <button
                key={type}
                onClick={() => setVisitType(type)}
                style={{
                  borderRadius: 20,
                  border: visitType === type ? '1px solid #0f8f5a' : '1px solid #c9d8cf',
                  padding: '6px 12px',
                  background: visitType === type ? '#dcfce7' : '#fff',
                  color: '#111827',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {type}
              </button>
            ))}
          </div>

          <h3 style={{ marginBottom: 10 }}>Observations (Voice / Text)</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <button
              type="button"
              style={{ ...secondaryButton, padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
              title="Offline-first speech to text"
              onClick={handleMicToggle}
            >
              <img src={micIcon} alt="Mic" style={{ width: 16, height: 16 }} />
              {isListening ? "Stop Mic" : "Start Mic"}
            </button>
            <select style={inputStyle} value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="auto">Auto Detect</option>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="mr">Marathi</option>
            </select>
          </div>
          <div style={{ color: micError ? '#b42318' : '#667085', fontSize: 12, marginBottom: 8 }}>
            {micError || (micMode ? `Mode: ${micMode}` : "Speech-to-text runs offline when on-device recognition is available in your browser.")}
          </div>
          {language === 'auto' && (
            <div style={{ color: '#667085', fontSize: 12, marginBottom: 8 }}>
              Auto-detected language on last process: {lastDetectedLanguage.toUpperCase()}
            </div>
          )}
          <textarea
            rows={7}
            style={{ ...inputStyle, minHeight: 150, resize: 'vertical' }}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Enter observation text..."
            maxLength={500}
          />
          <div style={{ textAlign: 'right', color: '#667085', fontSize: 12 }}>{rawText.length} / 500</div>

          <div style={{ marginTop: 14 }}>
            {editingId ? (
              <>
                <button style={primaryButton} onClick={handleProcessInput}>Save Offline Update</button>{' '}
                <button style={secondaryButton} onClick={handleSaveAndSync}>Save & Sync Update</button>{' '}
                <button style={cancelEditButton} onClick={handleCancelEdit}>Cancel Edit</button>
              </>
            ) : (
              <>
                <button style={secondaryButton} onClick={handleProcessInput}>Save Offline</button>{' '}
                <button style={primaryButton} onClick={handleSaveAndSync}>Save & Sync</button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Risk Summary</h3>
            <div
              style={{
                background: riskTone.bg,
                border: `1px solid ${riskTone.border}`,
                borderLeft: `6px solid ${riskTone.dot}`,
                borderRadius: 12,
                padding: 12,
                fontWeight: 700,
                color: riskTone.text,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{risk ? `${risk} Risk` : 'No risk calculated yet'}</span>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: riskTone.dot }} />
            </div>
            <p style={{ color: '#667085', marginTop: 12 }}>
              Last saved offline: {lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString() : 'Not yet'}
            </p>

            <h4>Structured Preview</h4>
            {extracted ? (
              <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                <div><strong>Pregnancy Month:</strong> {extracted.pregnancyMonth ?? 'N/A'}</div>
                <div><strong>Fever Days:</strong> {extracted.feverDays ?? 'N/A'}</div>
                <div><strong>High BP:</strong> {extracted.highBP ? 'Yes' : 'No'}</div>
                <div><strong>Swelling:</strong> {extracted.swelling ? 'Yes' : 'No'}</div>
                <div><strong>Bleeding:</strong> {extracted.bleeding ? 'Yes' : 'No'}</div>
                <div><strong>Breathing Issue:</strong> {extracted.breathingIssue ? 'Yes' : 'No'}</div>
                <div><strong>Symptoms:</strong> {(extracted.symptoms || []).join(', ') || 'None'}</div>
              </div>
            ) : (
              <p style={{ color: '#667085' }}>No structured data yet.</p>
            )}
          </div>

          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>Patient Records (Local Cache)</h3>
            <input
              style={{ ...inputStyle, marginBottom: 12, padding: '6px 10px' }}
              placeholder="Search patients offline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div style={{ maxHeight: 350, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {records.length === 0 ? (
                <p style={{ color: '#667085', fontSize: 14 }}>No records found offline.</p>
              ) : (
                records.map((rec) => (
                  <div 
                    key={rec.id} 
                    style={{ 
                      background: 'rgba(255,255,255,0.7)', 
                      border: '1px solid rgba(151, 188, 167, 0.3)', 
                      borderRadius: 10, 
                      padding: 10, 
                      fontSize: 13 
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, alignItems: 'center' }}>
                      <span>{rec.patientName} ({rec.age}y)</span>
                      <span 
                        style={{ 
                          fontSize: 11, 
                          padding: '2px 6px', 
                          borderRadius: 10, 
                          fontWeight: 600,
                          background: rec.syncStatus === 'synced' ? '#dcfce7' : '#fef9c3', 
                          color: rec.syncStatus === 'synced' ? '#14532d' : '#713f12' 
                        }}
                      >
                        {rec.syncStatus === 'synced' ? 'Synced' : 'Pending'}
                      </span>
                    </div>
                    <div style={{ color: '#475467', marginTop: 4 }}>
                      <strong>Risk:</strong> {rec.riskLevel} | <strong>Type:</strong> {rec.patientType}
                    </div>
                    <div style={{ color: '#667085', fontSize: 11, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rec.rawText}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button 
                        onClick={() => handleEditRecord(rec)}
                        style={{ 
                          background: '#eff6ff', 
                          border: '1px solid #bfdbfe', 
                          color: '#1e40af', 
                          borderRadius: 6, 
                          padding: '2px 8px', 
                          cursor: 'pointer',
                          fontSize: 11
                        }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={async () => {
                          if (confirm(`Delete record for ${rec.patientName}?`)) {
                            await patientRepository.deletePatient(rec.id);
                            refreshRecords();
                          }
                        }}
                        style={{ 
                          background: '#fef2f2', 
                          border: '1px solid #fecaca', 
                          color: '#991b1b', 
                          borderRadius: 6, 
                          padding: '2px 8px', 
                          cursor: 'pointer',
                          fontSize: 11
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AshaPage;
