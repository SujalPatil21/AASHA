export function getBaseUrl() {
  return __ENV.API_BASE_URL || 'http://localhost:8080';
}

export function generateRandomRecord(idNum) {
  return {
    id: `bench-client-${idNum}-${Math.random().toString(36).slice(2, 9)}`,
    patientName: `Test Patient ${idNum}`,
    age: Math.floor(Math.random() * 80) + 1,
    phone: `9${Math.floor(Math.random() * 900000000) + 100000000}`,
    patientType: ['ADULT', 'CHILD', 'PREGNANT', 'ELDER'][Math.floor(Math.random() * 4)],
    rawText: 'Fever and headache for 2 days',
    language: 'en',
    structured: { feverDays: 2, swelling: false, highBP: false, bleeding: false, breathingIssue: false },
    riskLevel: 'Low',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sourceDevice: 'k6-load-tester'
  };
}
