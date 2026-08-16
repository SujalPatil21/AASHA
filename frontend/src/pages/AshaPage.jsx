import { useState, useEffect, useCallback, useRef } from "react";
import extractStructuredData from '../utils/structuredProcessor';
import calculateRisk from '../utils/riskEngine';
import { patientRepository } from "../repository/patientRepository";
import { syncPendingRecords } from "../sync/syncEngine";
import { verifyConnectivity } from "../utils/connectivity";
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi, WifiOff, Cloud, CloudOff, RefreshCcw, Mic, CheckCircle2,
  AlertTriangle, Save, HeartPulse, Search, Edit2, Trash2, Heart,
  User, Calendar, Activity, Phone, X
} from 'lucide-react';
import AmbientBackground from '../components/AmbientBackground';
import HealthWave from '../components/HealthWave';
import { AnimatedCounter } from '../components/AnimatedCounter';


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
  
  // Animation states for saving
  const [saveSyncStatus, setSaveSyncStatus] = useState('idle'); // idle, saving, saved
  const [saveOfflineStatus, setSaveOfflineStatus] = useState('idle'); // idle, saving, saved

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


  useEffect(() => {
    const initPage = async () => {
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

  useEffect(() => {
    refreshRecords();
  }, [searchQuery, refreshRecords]);

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

    if (editingId) {
      const original = records.find(r => r.id === editingId);
      if (original) {
        patientData.createdAt = original.createdAt;
      }
    }

    await patientRepository.savePatient(patientData);
    setLastSavedAt(now);
    
    await patientRepository.clearFormDraft();
    setEditingId(null);
    setPatientName('');
    setAge('');
    setPhone('');
    setRawText('');
    setExtracted(null);
    setRisk(null);
    
    refreshRecords();
    return true;
  };

  const handleProcessInputWrapper = async () => {
    setSaveOfflineStatus('saving');
    try {
      await handleProcessInput();
      setSaveOfflineStatus('saved');
      setTimeout(() => setSaveOfflineStatus('idle'), 2000);
    } catch {
      setSaveOfflineStatus('idle');
    }
  };

  const handleSaveAndSyncWrapper = async () => {
    setSaveSyncStatus('saving');
    try {
      await handleProcessInput();
      await checkConnectivityAndSync();
      setSaveSyncStatus('saved');
      setTimeout(() => setSaveSyncStatus('idle'), 2000);
    } catch {
      setSaveSyncStatus('idle');
    }
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


  const pendingCount = records.filter(r => r.syncStatus === 'pending' || r.syncStatus === 'pending-delete').length;



  /* ── Animation variants ── */
  const pageVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.99 },
    show:   { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.22,1,0.36,1] } }
  };
  const sectionVariants = (delay = 0) => ({
    hidden: { opacity: 0, y: 16 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut', delay } }
  });
  const listContainer = {
    hidden: { opacity: 0 },
    show:   { opacity: 1, transition: { staggerChildren: 0.07 } }
  };
  const listItem = {
    hidden: { opacity: 0, y: 12, scale: 0.97 },
    show:   { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: 'easeOut' } }
  };

  /* ── Visit type config ── */
  const visitTypes = [
    { id: 'routine',   label: 'Routine',    desc: 'Regular community visit',   icon: <Calendar size={18} /> },
    { id: 'follow-up', label: 'Follow-up',  desc: 'Review previous condition', icon: <Heart size={18} /> },
    { id: 'emergency', label: 'Emergency',  desc: 'Immediate attention needed', icon: <AlertTriangle size={18} /> },
  ];

  /* ── Risk display ── */
  const riskTone =
    (risk || '').toLowerCase().includes('critical') || (risk || '').toLowerCase().includes('high')
      ? { bg: '#FEE2E2', border: '#D64545', text: '#991B1B', dot: '#D64545' }
      : (risk || '').toLowerCase().includes('medium')
        ? { bg: '#FEF9C3', border: '#D98A00', text: '#854D0E', dot: '#D98A00' }
        : { bg: 'var(--c-mint)', border: 'var(--c-primary)', text: 'var(--c-primary-dark)', dot: 'var(--c-success)' };

  /* ── Input base style ── */
  const inp = {
    width: '100%', border: '1.5px solid var(--c-border)', borderRadius: 'var(--r-sm)',
    padding: '13px 14px', fontSize: 15, color: 'var(--c-dark)',
    backgroundColor: 'var(--c-surface)', outline: 'none', fontFamily: '"Inter", sans-serif',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };
  const inpFocus = { borderColor: 'var(--c-primary)', boxShadow: '0 0 0 3px rgba(8,127,115,0.12)' };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', backgroundColor: 'var(--c-bg)' }}>
      <AmbientBackground />

      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="show"
        style={{ position: 'relative', zIndex: 1, maxWidth: 1160, margin: '0 auto', padding: 'clamp(16px,3vw,32px)' }}
      >

        {/* ═══════════════════════════════
            HERO PANEL
        ═══════════════════════════════ */}
        <motion.div
          variants={sectionVariants(0)}
          style={{
            background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-alt) 100%)',
            borderRadius: 'var(--r-xl)',
            padding: 'clamp(24px,4vw,40px)',
            marginBottom: 28,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(8,127,115,0.25)',
          }}
        >
          {/* Decorative wave */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0.25 }}>
            <HealthWave width={900} height={60} color="#fff" opacity={1} />
          </div>

          {/* Animated breathing circle */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.22, 0.12] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', right: -60, top: -60,
              width: 280, height: 280, borderRadius: '50%',
              background: 'rgba(255,255,255,1)', pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.18)', borderRadius: 999, padding: '5px 12px', marginBottom: 16 }}>
              <HeartPulse size={13} color="#fff" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' }}>AASHA Worker</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <h1 style={{ color: '#fff', marginBottom: 6, fontSize: 'clamp(22px,3.5vw,32px)' }}>
                  Ready for today's visits?
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 15, maxWidth: 480, margin: 0 }}>
                  Record patient visits, capture voice observations and work safely — even without internet.
                </p>
              </div>

              {/* Connectivity pill */}
              <motion.div
                animate={{ scale: isOnline ? [1, 1.03, 1] : 1 }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  display: 'flex', flexDirection: 'column', gap: 8,
                  background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--r-md)',
                  padding: '12px 18px', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.25)', minWidth: 160,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isOnline ? <Wifi size={16} color="#fff" /> : <WifiOff size={16} color="rgba(255,255,255,0.7)" />}
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: isOnline ? '#4ADE80' : '#FCD34D', marginLeft: 'auto' }} />
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', display: 'flex', gap: 6 }}>
                  {syncState === 'syncing' ? (
                    <><RefreshCcw size={12} className="aasha-spin" /><span>Syncing...</span></>
                  ) : syncState === 'success' ? (
                    <><CheckCircle2 size={12} /><span>Synced</span></>
                  ) : syncState === 'failed' ? (
                    <><AlertTriangle size={12} /><span>Sync failed</span></>
                  ) : (
                    <><span>{pendingCount} pending</span></>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════
            OFFLINE / SYNC STATUS PANEL
        ═══════════════════════════════ */}
        <AnimatePresence mode="wait">
          {!isOnline ? (
            /* ── OFFLINE MODE — treated as a feature ── */
            <motion.div
              key="offline"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.22,1,0.36,1] }}
              style={{
                marginBottom: 24,
                background: 'linear-gradient(135deg, #E7F5F1 0%, #F1F8F5 100%)',
                border: '1.5px solid var(--c-border)',
                borderLeft: '4px solid var(--c-primary)',
                borderRadius: 'var(--r-lg)',
                padding: '20px 24px',
                display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
              }}
            >
              {/* Custom device → storage SVG illustration */}
              <div style={{ flexShrink: 0, position: 'relative', width: 68, height: 56 }}>
                {/* Device outline */}
                <svg width="68" height="56" viewBox="0 0 68 56" fill="none" aria-hidden="true">
                  <rect x="4" y="2" width="28" height="40" rx="4" stroke="#087F73" strokeWidth="1.8" fill="none" />
                  <rect x="8" y="6" width="20" height="28" rx="2" fill="#E7F5F1" />
                  <circle cx="18" cy="39" r="2" fill="#087F73" />
                  {/* Storage cylinder */}
                  <ellipse cx="52" cy="36" rx="10" ry="4" fill="#E7F5F1" stroke="#087F73" strokeWidth="1.6" />
                  <rect x="42" y="36" width="20" height="10" fill="#E7F5F1" stroke="none" />
                  <line x1="42" y1="36" x2="42" y2="46" stroke="#087F73" strokeWidth="1.6" />
                  <line x1="62" y1="36" x2="62" y2="46" stroke="#087F73" strokeWidth="1.6" />
                  <ellipse cx="52" cy="46" rx="10" ry="4" fill="none" stroke="#087F73" strokeWidth="1.6" />
                  {/* Connecting line with animated dot */}
                  <line x1="32" y1="22" x2="42" y2="22" stroke="#087F73" strokeWidth="1.4" strokeDasharray="3 3" />
                  <motion.circle
                    cx="32" cy="22" r="2.5" fill="#087F73"
                    animate={{ cx: [32, 42, 42] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                  />
                  {/* Lock icon on storage — means data is safe */}
                  <rect x="49" y="38" width="6" height="5" rx="1" fill="#087F73" opacity="0.7" />
                  <path d="M50,38 L50,36.5 A2,2 0 0,1 54,36.5 L54,38" stroke="#087F73" strokeWidth="1.2" fill="none" />
                </svg>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <motion.div
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--c-primary)', flexShrink: 0 }}
                  />
                  <span style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--c-dark)' }}>Offline Mode</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--c-body)', margin: '0 0 10px 0', lineHeight: 1.55 }}>
                  Your records are safely stored on this device. Sync will resume automatically when connectivity is restored.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 999, background: 'var(--c-mint)', border: '1px solid var(--c-border)', fontSize: 12, fontWeight: 600, color: 'var(--c-primary-dark)' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2,6 L5,9 L10,3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {pendingCount} {pendingCount === 1 ? 'record' : 'records'} waiting
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 999, background: 'var(--c-mint)', border: '1px solid var(--c-border)', fontSize: 12, fontWeight: 600, color: 'var(--c-primary-dark)' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><rect x="1" y="2" width="6" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" /><line x1="8" y1="4" x2="11" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><line x1="8" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
                    Stored locally
                  </span>
                </div>
              </div>
            </motion.div>
          ) : syncState === 'syncing' ? (
            /* ── SYNCING STATE ── */
            <motion.div
              key="syncing"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              style={{
                marginBottom: 24, background: 'var(--c-mint)', border: '1.5px solid var(--c-primary)',
                borderRadius: 'var(--r-lg)', padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              <motion.svg width="24" height="24" viewBox="0 0 24 24" fill="none" animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
                <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m18 0a9 9 0 0 1-9 9m0-18A9 9 0 0 0 3 12" stroke="var(--c-primary)" strokeWidth="2" strokeLinecap="round" />
              </motion.svg>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--c-dark)', fontSize: 14, margin: '0 0 2px 0' }}>Syncing records...</p>
                <p style={{ color: 'var(--c-body)', fontSize: 12, margin: 0 }}>{pendingCount} records uploading to server.</p>
              </div>
            </motion.div>
          ) : syncState === 'success' ? (
            /* ── SYNCED STATE ── */
            <motion.div
              key="synced"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                marginBottom: 24, background: '#DCFCE7', border: '1.5px solid #168A57',
                borderRadius: 'var(--r-lg)', padding: '14px 20px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                <CheckCircle2 size={20} color="#168A57" />
              </motion.div>
              <div>
                <p style={{ fontWeight: 700, color: '#166534', fontSize: 14, margin: '0 0 2px 0' }}>All records synced</p>
                <p style={{ color: '#15803D', fontSize: 12, margin: 0 }}>Your data is up to date on the server.</p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ═══════════════════════════════
            TWO-COLUMN LAYOUT
        ═══════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 24 }}>

          {/* ─── LEFT: ENTRY FORM ─── */}
          <motion.div variants={sectionVariants(0.05)}>
            <div style={{ background: 'var(--c-surface)', borderRadius: 'var(--r-xl)', border: '1px solid var(--c-border)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>

              {/* Form header */}
              <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--c-border)', paddingBottom: 16, background: 'var(--c-mint-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={18} color="#fff" />
                  </div>
                  <h2 style={{ margin: 0, fontSize: 18 }}>{editingId ? 'Edit Patient Record' : 'New Health Visit'}</h2>
                </div>
              </div>

              <div style={{ padding: '24px' }}>
                {/* Patient Details */}
                <p className="section-label" style={{ marginBottom: 12 }}>Patient Details</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 10 }}>
                  <input
                    className="aasha-input" style={inp} value={patientName}
                    onChange={e => setPatientName(e.target.value)} placeholder="Full Name *"
                    onFocus={e => Object.assign(e.target.style, inpFocus)}
                    onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <input
                    className="aasha-input" style={inp} type="number" min="0" value={age}
                    onChange={e => setAge(e.target.value)} placeholder="Age *"
                    onFocus={e => Object.assign(e.target.style, inpFocus)}
                    onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <select
                    style={inp} value={patientType} onChange={e => setPatientType(e.target.value)}
                    onFocus={e => Object.assign(e.target.style, inpFocus)}
                    onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.boxShadow = 'none'; }}
                  >
                    <option value="adult">Adult</option>
                    <option value="child">Child</option>
                    <option value="pregnant">Pregnant</option>
                    <option value="elder">Elder</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, position: 'relative' }}>
                  <Phone size={15} color="var(--c-muted)" style={{ position: 'absolute', left: 12, pointerEvents: 'none' }} />
                  <input
                    style={{ ...inp, paddingLeft: 34 }} value={phone}
                    onChange={e => setPhone(e.target.value)} placeholder="Mobile Number (Optional)"
                    onFocus={e => Object.assign(e.target.style, inpFocus)}
                    onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                {/* Visit Type — Visual Tiles */}
                <p className="section-label" style={{ marginBottom: 12 }}>Visit Type</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                  {visitTypes.map(vt => {
                    const active = visitType === vt.id;
                    return (
                      <motion.button
                        key={vt.id}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setVisitType(vt.id)}
                        style={{
                          flex: 1, minWidth: 90, display: 'flex', flexDirection: 'column',
                          alignItems: 'center', gap: 5, padding: '10px 8px',
                          borderRadius: 'var(--r-md)',
                          background: active ? 'var(--c-mint)' : 'var(--c-mint-light)',
                          border: active ? '2px solid var(--c-primary)' : '1.5px solid var(--c-border)',
                          cursor: 'pointer', transition: 'all 0.15s ease',
                          color: active ? 'var(--c-primary)' : 'var(--c-body)',
                        }}
                      >
                        <motion.div animate={{ scale: active ? 1.1 : 1 }} transition={{ duration: 0.15 }}>
                          {vt.icon}
                        </motion.div>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{vt.label}</span>
                        <span style={{ fontSize: 10, opacity: 0.7, textAlign: 'center', lineHeight: 1.2 }}>{vt.desc}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Observations — Voice & Text */}
                <p className="section-label" style={{ marginBottom: 12 }}>Observations</p>

                {/* Voice input button with pulse animation */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      {/* Pulse rings when listening */}
                      <AnimatePresence>
                        {isListening && (
                          <>
                            {[1, 2, 3].map(i => (
                              <motion.div
                                key={i}
                                initial={{ scale: 1, opacity: 0.7 }}
                                animate={{ scale: 2.5 + i * 0.4, opacity: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.4, ease: 'easeOut' }}
                                style={{
                                  position: 'absolute', width: 48, height: 48,
                                  borderRadius: '50%', background: 'rgba(214,69,69,0.25)',
                                  pointerEvents: 'none',
                                }}
                              />
                            ))}
                          </>
                        )}
                      </AnimatePresence>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={handleMicToggle}
                        style={{
                          position: 'relative', zIndex: 1,
                          width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
                          background: isListening ? '#D64545' : 'var(--c-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: isListening ? '0 0 0 4px rgba(214,69,69,0.2)' : 'var(--shadow-primary)',
                          transition: 'background 0.2s, box-shadow 0.2s',
                          flexShrink: 0,
                        }}
                        aria-label={isListening ? 'Stop recording' : 'Start voice input'}
                      >
                        {isListening ? <X size={20} color="#fff" /> : <Mic size={20} color="#fff" />}
                      </motion.button>
                    </div>

                    <div style={{ flex: 1 }}>
                      {isListening ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28 }}>
                            {[1, 2, 3, 4, 5, 6].map(i => (
                              <motion.div
                                key={i}
                                animate={{ scaleY: [0.3, 1, 0.3] }}
                                transition={{ duration: 0.5 + i * 0.08, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
                                style={{ width: 4, height: 28, background: '#D64545', borderRadius: 2, transformOrigin: 'bottom', opacity: 0.85 }}
                              />
                            ))}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#D64545' }}>Recording...</span>
                        </div>
                      ) : (
                        <div>
                          <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 14, color: 'var(--c-dark)' }}>Voice Input</p>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--c-muted)' }}>Tap mic to speak your observations</p>
                        </div>
                      )}
                    </div>

                    <select
                      style={{ ...inp, width: 'auto', minWidth: 130, fontSize: 13 }} value={language}
                      onChange={e => setLanguage(e.target.value)}
                    >
                      <option value="auto">Auto Detect</option>
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                      <option value="mr">Marathi</option>
                    </select>
                  </div>
                </div>

                {micError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#D64545', marginBottom: 10, padding: '8px 12px', background: '#FEE2E2', borderRadius: 8 }}>
                    <AlertTriangle size={14} />
                    {micError}
                  </div>
                )}

                <div style={{ position: 'relative' }}>
                  <textarea
                    rows={5}
                    style={{ ...inp, minHeight: 130, resize: 'vertical', lineHeight: 1.6 }}
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    placeholder="Type observations here, or use voice input above..."
                    maxLength={500}
                    onFocus={e => Object.assign(e.target.style, inpFocus)}
                    onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--c-muted)', marginTop: 4 }}>{rawText.length} / 500</div>
                </div>

                {/* Risk preview */}
                <AnimatePresence>
                  {risk && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      style={{
                        marginTop: 16, padding: '12px 16px',
                        background: riskTone.bg, borderLeft: `4px solid ${riskTone.border}`,
                        borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Activity size={16} color={riskTone.border} />
                        <span style={{ fontWeight: 600, fontSize: 14, color: riskTone.text }}>{risk} Risk Level</span>
                      </div>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: riskTone.dot }} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action buttons */}
                <div style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {editingId ? (
                    <>
                      <motion.button
                        whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                        onClick={handleProcessInputWrapper}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 16px', borderRadius: 'var(--r-md)', background: 'var(--c-mint)', border: '2px solid var(--c-primary)', color: 'var(--c-primary-dark)', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s' }}
                      >
                        {saveOfflineStatus === 'saving' ? <RefreshCcw size={16} className="aasha-spin" /> : saveOfflineStatus === 'saved' ? <CheckCircle2 size={16} /> : <Save size={16} />}
                        {saveOfflineStatus === 'saving' ? 'Saving...' : saveOfflineStatus === 'saved' ? 'Saved Locally' : 'Save Offline'}
                      </motion.button>
                      <motion.button
                        whileHover={{ y: -2, boxShadow: 'var(--shadow-primary)' }} whileTap={{ scale: 0.97 }}
                        onClick={handleSaveAndSyncWrapper}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 16px', borderRadius: 'var(--r-md)', background: 'var(--c-primary)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: 'var(--shadow-primary)', transition: 'all 0.15s' }}
                      >
                        {saveSyncStatus === 'saving' ? <RefreshCcw size={16} className="aasha-spin" /> : saveSyncStatus === 'saved' ? <CheckCircle2 size={16} /> : <Cloud size={16} />}
                        {saveSyncStatus === 'saving' ? 'Saving...' : saveSyncStatus === 'saved' ? 'Saved & Synced' : 'Save & Sync'}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.97 }} onClick={handleCancelEdit}
                        style={{ width: '100%', padding: '12px', borderRadius: 'var(--r-md)', background: 'var(--c-mint-light)', border: '1px solid var(--c-border)', color: 'var(--c-body)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                      >
                        Cancel Edit
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <motion.button
                        whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                        onClick={handleProcessInputWrapper}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 16px', borderRadius: 'var(--r-md)', background: 'var(--c-mint)', border: '2px solid var(--c-primary)', color: 'var(--c-primary-dark)', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s' }}
                      >
                        {saveOfflineStatus === 'saving' ? <RefreshCcw size={16} className="aasha-spin" /> : saveOfflineStatus === 'saved' ? <CheckCircle2 size={16} /> : <Save size={16} />}
                        {saveOfflineStatus === 'saving' ? 'Saving...' : saveOfflineStatus === 'saved' ? 'Saved Locally' : 'Save Offline'}
                      </motion.button>
                      <motion.button
                        whileHover={{ y: -2, boxShadow: 'var(--shadow-primary)' }} whileTap={{ scale: 0.97 }}
                        onClick={handleSaveAndSyncWrapper}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 16px', borderRadius: 'var(--r-md)', background: 'var(--c-primary)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: 'var(--shadow-primary)', transition: 'all 0.15s' }}
                      >
                        {saveSyncStatus === 'saving' ? <RefreshCcw size={16} className="aasha-spin" /> : saveSyncStatus === 'saved' ? <CheckCircle2 size={16} /> : <Cloud size={16} />}
                        {saveSyncStatus === 'saving' ? 'Saving...' : saveSyncStatus === 'saved' ? 'Saved & Synced' : 'Save & Sync'}
                      </motion.button>
                    </>
                  )}
                </div>

                {lastSavedAt && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 12, color: 'var(--c-success)' }}
                  >
                    <CheckCircle2 size={13} />
                    Last saved at {new Date(lastSavedAt).toLocaleTimeString()}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* ─── RIGHT: RECORDS ─── */}
          <motion.div variants={sectionVariants(0.1)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ════════════════════════════
                TODAY AT A GLANCE
            ════════════════════════════ */}
            <div>
              <div style={{ marginBottom: 14 }}>
                <p className="section-label" style={{ marginBottom: 2 }}>Today at a Glance</p>
                <p style={{ fontSize: 12, color: 'var(--c-muted)', margin: 0 }}>A quick view of your community visits and status.</p>
              </div>

              {/* PRIMARY metric — Patient Records (full width, tall) */}
              <motion.div
                variants={sectionVariants(0.08)}
                style={{
                  background: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-primary-alt) 100%)',
                  borderRadius: 'var(--r-lg)', padding: '22px 22px 14px',
                  marginBottom: 10, position: 'relative', overflow: 'hidden',
                  boxShadow: '0 6px 24px rgba(8,127,115,0.20)',
                }}
              >
                {/* Ambient glow */}
                <motion.div
                  animate={{ opacity: [0.10, 0.22, 0.10], scale: [1, 1.1, 1] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,1)', filter: 'blur(30px)', pointerEvents: 'none' }}
                />

                {/* SVG patient record icon */}
                <div style={{ position: 'absolute', right: 18, top: 18, opacity: 0.22 }}>
                  <svg width="44" height="52" viewBox="0 0 44 52" fill="none" aria-hidden="true">
                    <rect x="2" y="4" width="32" height="44" rx="4" fill="white" />
                    <line x1="8" y1="14" x2="28" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    <line x1="8" y1="21" x2="28" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    <line x1="8" y1="28" x2="20" y2="28" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="35" cy="40" r="7" fill="white" opacity="0.9" />
                    <path d="M32,40 L34,42 L38,37" stroke="#087F73" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 6px 0' }}>Patient Records</p>
                  <div style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 700, fontSize: 44, color: '#fff', lineHeight: 1, marginBottom: 4 }}>
                    <AnimatedCounter value={records.length} duration={0.7} />
                  </div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: '0 0 12px 0' }}>patients recorded in total</p>

                  {/* Health wave inside card */}
                  <div style={{ opacity: 0.4 }}>
                    <HealthWave width={220} height={28} color="#fff" opacity={1} />
                  </div>
                </div>
              </motion.div>

              {/* SECONDARY metrics — 2-col */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

                {/* Pending Sync — Device→Cloud visual */}
                <motion.div
                  variants={sectionVariants(0.12)}
                  style={{
                    background: 'var(--c-surface)', borderRadius: 'var(--r-md)',
                    padding: '16px 14px', border: '1.5px solid var(--c-border)',
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  {/* Subtle mint background fill based on state */}
                  {pendingCount > 0 && (
                    <div style={{ position: 'absolute', inset: 0, background: '#FEF9C3', borderRadius: 'inherit', opacity: 0.5 }} />
                  )}
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    {/* Mini device→cloud SVG */}
                    <div style={{ marginBottom: 8 }}>
                      <svg width="48" height="28" viewBox="0 0 48 28" fill="none" aria-hidden="true">
                        {/* Device */}
                        <rect x="1" y="4" width="12" height="16" rx="2" stroke={pendingCount > 0 ? '#D98A00' : 'var(--c-primary)'} strokeWidth="1.5" fill="none" />
                        <rect x="3" y="6" width="8" height="10" rx="1" fill={pendingCount > 0 ? '#FEF9C3' : 'var(--c-mint)'} />
                        {/* Animated transfer path */}
                        <motion.line
                          x1="13" y1="12" x2="30" y2="12"
                          stroke={pendingCount > 0 ? '#D98A00' : 'var(--c-primary)'}
                          strokeWidth="1.3" strokeDasharray="3 2"
                          animate={syncState === 'syncing' ? { strokeDashoffset: [0, -10] } : {}}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        />
                        {/* Moving data dot when syncing */}
                        {syncState === 'syncing' && (
                          <motion.circle
                            cy="12" r="2.5" fill="#D98A00"
                            animate={{ cx: [13, 30] }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                          />
                        )}
                        {/* Cloud */}
                        <path d="M36,18 Q31,18 31,13 Q31,8 36,8 Q36,5 40,5 Q45,5 45,10 Q48,10 48,13 Q48,18 44,18Z" stroke={pendingCount > 0 ? '#D98A00' : 'var(--c-primary)'} strokeWidth="1.4" fill={pendingCount > 0 ? '#FEF9C3' : 'var(--c-mint)'} />
                        {/* Check on cloud when synced */}
                        {syncState === 'success' && (
                          <motion.path
                            d="M36,12 L38.5,15 L43,9"
                            stroke="var(--c-success)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4 }}
                          />
                        )}
                      </svg>
                    </div>
                    <div style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 700, fontSize: 26, color: pendingCount > 0 ? '#D98A00' : 'var(--c-success)', lineHeight: 1 }}>
                      <AnimatedCounter value={pendingCount} duration={0.5} />
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--c-body)', margin: '3px 0 0 0', lineHeight: 1.3 }}>
                      {pendingCount === 0 ? 'All synced' : 'Pending sync'}
                    </p>
                  </div>
                </motion.div>

                {/* Health State — calm, NOT an error card */}
                <motion.div
                  variants={sectionVariants(0.15)}
                  style={{
                    background: 'var(--c-surface)', borderRadius: 'var(--r-md)',
                    padding: '16px 14px', border: '1.5px solid var(--c-border)',
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  {/* State-driven background tint */}
                  <div style={{ position: 'absolute', inset: 0, background: 'var(--c-mint)', borderRadius: 'inherit', opacity: 0.5 }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    {/* Mini waveform — calm health indicator */}
                    <div style={{ marginBottom: 8 }}>
                      <svg width="48" height="24" viewBox="0 0 48 24" fill="none" aria-hidden="true">
                        <motion.path
                          d="M0,12 C4,12 6,4 10,4 C14,4 16,20 20,20 C24,20 26,6 30,6 C34,6 36,16 40,16 C44,16 46,10 48,10"
                          stroke="var(--c-primary)" strokeWidth="2" strokeLinecap="round" fill="none"
                          animate={{ opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      </svg>
                    </div>
                    <div style={{ fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 700, fontSize: 26, color: 'var(--c-primary)', lineHeight: 1 }}>
                      {syncState === 'success' ? records.length - pendingCount : records.length > 0 ? records.length : '—'}
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--c-body)', margin: '3px 0 0 0', lineHeight: 1.3 }}>
                      {syncState === 'success' ? 'Synced' : 'On device'}
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Patient Records Card */}
            <div style={{ background: 'var(--c-surface)', borderRadius: 'var(--r-xl)', border: '1px solid var(--c-border)', boxShadow: 'var(--shadow-md)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--c-border)', background: 'var(--c-mint-light)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={16} color="#fff" />
                </div>
                <h3 style={{ margin: 0, fontSize: 16 }}>Local Patient Records</h3>
              </div>

              <div style={{ padding: '16px 20px 8px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={15} color="var(--c-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    style={{ ...inp, paddingLeft: 34, fontSize: 14 }}
                    placeholder="Search patients..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={e => Object.assign(e.target.style, inpFocus)}
                    onBlur={e => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              <div style={{ padding: '0 20px 16px', overflowY: 'auto', flex: 1 }}>
                {records.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--c-muted)' }}
                  >
                    <motion.div
                      animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <CloudOff size={36} strokeWidth={1.5} />
                    </motion.div>
                    <p style={{ marginTop: 12, fontSize: 14 }}>No records stored offline yet.</p>
                    <p style={{ fontSize: 12, marginTop: 4 }}>Add a patient visit to get started.</p>
                  </motion.div>
                ) : (
                  <motion.div
                    variants={listContainer} initial="hidden" animate="show"
                    style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}
                  >
                    {records.map(rec => {
                      const riskColor =
                        (rec.riskLevel || '').toLowerCase().includes('high') || (rec.riskLevel || '').toLowerCase().includes('critical')
                          ? '#D64545' : (rec.riskLevel || '').toLowerCase().includes('medium')
                          ? '#D98A00' : 'var(--c-success)';
                      const riskBg =
                        (rec.riskLevel || '').toLowerCase().includes('high') || (rec.riskLevel || '').toLowerCase().includes('critical')
                          ? '#FEE2E2' : (rec.riskLevel || '').toLowerCase().includes('medium')
                          ? '#FEF9C3' : '#DCFCE7';

                      return (
                        <motion.div
                          key={rec.id}
                          layout
                          variants={listItem}
                          whileHover={{ y: -3, boxShadow: 'var(--shadow-md)' }}
                          style={{
                            background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                            borderRadius: 'var(--r-md)', padding: '14px 16px',
                            borderLeft: `3px solid ${riskColor}`,
                            transition: 'box-shadow 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                              <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--c-dark)' }}>{rec.patientName}</span>
                              <span style={{ fontSize: 13, color: 'var(--c-body)', marginLeft: 6 }}>{rec.age}y · </span>
                              <span style={{ fontSize: 13, color: 'var(--c-body)', textTransform: 'capitalize' }}>{rec.patientType}</span>
                            </div>
                            <motion.div
                              initial={false}
                              animate={{ color: rec.syncStatus === 'synced' ? 'var(--c-success)' : '#D98A00' }}
                              title={rec.syncStatus === 'synced' ? 'Synced' : 'Pending sync'}
                            >
                              {rec.syncStatus === 'synced' ? <Cloud size={15} /> : <CloudOff size={15} />}
                            </motion.div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: riskBg, color: riskColor, fontSize: 11, fontWeight: 700 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: riskColor }} />
                              {rec.riskLevel || 'Low'} Risk
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--c-muted)', textTransform: 'capitalize' }}>{rec.visitType || 'routine'}</span>
                          </div>

                          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <motion.button
                              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.93 }}
                              onClick={() => handleEditRecord(rec)}
                              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: 'var(--c-mint)', border: 'none', color: 'var(--c-primary-dark)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                            >
                              <Edit2 size={12} /> Edit
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.93 }}
                              onClick={async () => {
                                if (confirm(`Delete record for ${rec.patientName}?`)) {
                                  await patientRepository.deletePatient(rec.id);
                                  refreshRecords();
                                }
                              }}
                              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: '#FEE2E2', border: 'none', color: '#D64545', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                            >
                              <Trash2 size={12} /> Delete
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}


export default AshaPage;

