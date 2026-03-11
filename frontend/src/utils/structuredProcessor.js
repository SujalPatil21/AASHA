function normalizeDigits(input) {
  // Hindi/Marathi digits -> ASCII digits
  const devanagariDigitMap = {
    '०': '0',
    '१': '1',
    '२': '2',
    '३': '3',
    '४': '4',
    '५': '5',
    '६': '6',
    '७': '7',
    '८': '8',
    '९': '9',
  };

  return input.replace(/[०-९]/g, (d) => devanagariDigitMap[d] || d);
}

function applyReplacements(text, replacements) {
  let out = text;
  replacements.forEach(([pattern, replacement]) => {
    out = out.replace(pattern, replacement);
  });
  return out;
}

function normalizeText(rawText, language) {
  let text = normalizeDigits((rawText || '').toLowerCase());

  const commonReplacements = [
    [/\bfevr\b/g, 'fever'],
    [/\bbp\s*high\b/g, 'high bp'],
    [/\bhigh\s*b\.?p\.?\b/g, 'high bp'],
  ];
  text = applyReplacements(text, commonReplacements);

  if (language === 'hi') {
    const hiReplacements = [
      [/बुखार|ताप|ज्वर/g, 'fever'],
      [/तेज\s*बुखार/g, 'high fever'],
      [/खांसी|कफ/g, 'cough'],
      [/सर्दी|जुकाम/g, 'cold'],
      [/सांस\s*फूलना|सांस\s*लेने\s*में\s*दिक्कत|सांस\s*की\s*तकलीफ/g, 'breathing issue'],
      [/सीने\s*में\s*दर्द/g, 'chest pain'],
      [/उल्टी|वमन/g, 'vomiting'],
      [/दस्त|डायरिया|पतला\s*पाखाना/g, 'diarrhea'],
      [/कमजोरी/g, 'weakness'],
      [/चक्कर/g, 'dizziness'],
      [/सिर\s*दर्द/g, 'headache'],
      [/पेट\s*दर्द/g, 'abdominal pain'],
      [/सूजन|सोज़िश/g, 'swelling'],
      [/पैरों?\s*में\s*सूजन/g, 'swelling in legs'],
      [/रक्तचाप\s*ज्यादा|उच्च\s*रक्तचाप|बीपी\s*ज्यादा|ब्लड\s*प्रेशर\s*ज्यादा/g, 'high bp'],
      [/रक्तस्राव|खून\s*आना|ब्लीडिंग/g, 'bleeding'],
      [/गर्भवती|प्रेग्नेंट/g, 'pregnant'],
      [/महीना/g, 'month'],
      [/(\d{1,2})\s*दिन/g, '$1 days'],
      [/(\d{1,2})\s*महीने?/g, '$1 months'],
    ];
    text = applyReplacements(text, hiReplacements);
  } else if (language === 'mr') {
    const mrReplacements = [
      [/ताप|ज्वर/g, 'fever'],
      [/खोकला/g, 'cough'],
      [/सर्दी|थंडी/g, 'cold'],
      [/श्वास\s*घेण्यास\s*त्रास|धाप\s*लागणे/g, 'breathing issue'],
      [/छातीत\s*दुखणे/g, 'chest pain'],
      [/ओकारी|उलटी/g, 'vomiting'],
      [/जुलाब|अतिसार/g, 'diarrhea'],
      [/अशक्तपणा|कमजोरी/g, 'weakness'],
      [/गरगरणे/g, 'dizziness'],
      [/डोकेदुखी/g, 'headache'],
      [/पोट\s*दुखणे/g, 'abdominal pain'],
      [/सूज|सुज/g, 'swelling'],
      [/पायात\s*सूज/g, 'swelling in legs'],
      [/रक्तदाब\s*जास्त|बीपी\s*जास्त/g, 'high bp'],
      [/रक्तस्राव|ब्लीडिंग/g, 'bleeding'],
      [/गरोदर|गर्भवती/g, 'pregnant'],
      [/महिना/g, 'month'],
      [/(\d{1,2})\s*दिवस/g, '$1 days'],
      [/(\d{1,2})\s*महिने?/g, '$1 months'],
    ];
    text = applyReplacements(text, mrReplacements);
  }

  return text;
}

export function extractStructuredData(rawText, language) {
  if (!rawText || !rawText.trim()) {
    return {
      pregnancyMonth: null,
      symptoms: [],
      highBP: false,
      swelling: false,
      feverDays: null,
    };
  }

  const normalized = normalizeText(rawText, language);
  const text = normalized.toLowerCase();

  let pregnancyMonth = null;
  let feverDays = null;
  let highBP = false;
  let swelling = false;
  let bleeding = false;
  let breathingIssue = false;
  const symptoms = [];

  const monthPattern1 = text.match(/(\d{1,2})\s*(?:months?|month)\b/);
  const monthPattern2 = text.match(/\bmonth\s*(?:is\s*)?:?\s*(\d{1,2})\b/);
  if (monthPattern1) {
    pregnancyMonth = parseInt(monthPattern1[1], 10);
  } else if (monthPattern2) {
    pregnancyMonth = parseInt(monthPattern2[1], 10);
  }

  const feverPattern = text.match(/fever(?:\s*(?:for|since))?\s*(\d{1,3})\s*day[s]?\b/i);
  const feverPatternAlt = text.match(/fever.*?(\d{1,3})\s*day[s]?\b/i);
  if (feverPattern) {
    feverDays = parseInt(feverPattern[1], 10);
    symptoms.push('Fever');
  } else if (feverPatternAlt) {
    feverDays = parseInt(feverPatternAlt[1], 10);
    symptoms.push('Fever');
  } else if (text.includes('fever')) {
    symptoms.push('Fever');
  }

  if (text.includes('high bp')) {
    highBP = true;
    symptoms.push('High BP');
  }

  if (text.includes('swelling')) {
    swelling = true;
    symptoms.push('Swelling');
  }

  if (text.includes('cough')) symptoms.push('Cough');
  if (text.includes('cold')) symptoms.push('Cold');
  if (text.includes('breathing issue')) {
    breathingIssue = true;
    symptoms.push('Breathing Issue');
  }
  if (text.includes('chest pain')) symptoms.push('Chest Pain');
  if (text.includes('vomiting')) symptoms.push('Vomiting');
  if (text.includes('diarrhea')) symptoms.push('Diarrhea');
  if (text.includes('weakness')) symptoms.push('Weakness');
  if (text.includes('dizziness')) symptoms.push('Dizziness');
  if (text.includes('headache')) symptoms.push('Headache');
  if (text.includes('abdominal pain')) symptoms.push('Abdominal Pain');
  if (text.includes('bleeding')) {
    bleeding = true;
    symptoms.push('Bleeding');
  }

  const uniqueSymptoms = Array.from(new Set(symptoms));

  return {
    pregnancyMonth,
    symptoms: uniqueSymptoms,
    highBP,
    swelling,
    bleeding,
    breathingIssue,
    feverDays,
  };
}

export default extractStructuredData;
