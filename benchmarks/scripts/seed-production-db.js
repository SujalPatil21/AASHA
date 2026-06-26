const API_BASE = 'https://aasha-production-1974.up.railway.app';

function generateRandomRecord(idNum) {
  return {
    id: `bench-prod-${idNum}-${Math.random().toString(36).slice(2, 9)}`,
    patientName: `Prod Patient ${idNum}`,
    age: 20 + (idNum % 60),
    phone: `9${Math.floor(Math.random() * 900000000) + 100000000}`,
    patientType: ['ADULT', 'CHILD', 'PREGNANT', 'ELDER'][idNum % 4],
    rawText: 'Fever and headache for 2 days',
    language: 'en',
    structured: { feverDays: 2, swelling: false, highBP: false, bleeding: false, breathingIssue: false },
    riskLevel: 'Low',
    createdAt: Date.now() - (idNum * 60000), 
    updatedAt: Date.now() - (idNum * 60000),
    sourceDevice: 'seed-prod-script'
  };
}

async function seedData(count) {
  console.log(`Starting to seed ${count} records to production backend at ${API_BASE}...`);
  const batchSize = 250;
  let batch = [];
  let totalSeeded = 0;

  for (let i = 1; i <= count; i++) {
    batch.push(generateRandomRecord(i));

    if (batch.length === batchSize || i === count) {
      const payload = JSON.stringify(batch);
      const start = performance.now();
      
      const res = await fetch(`${API_BASE}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: payload
      });

      const elapsed = performance.now() - start;

      if (!res.ok) {
        throw new Error(`Failed to upload batch: status ${res.status}`);
      }

      const data = await res.json();
      totalSeeded += batch.length;
      console.log(`Uploaded batch (${batch.length} records) in ${elapsed.toFixed(1)}ms. Total seeded: ${totalSeeded}/${count}`);
      batch = [];
      
      // Throttle sleep slightly to prevent production DB rate-limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`Successfully completed seeding ${totalSeeded} records to production database!`);
}

const targetCount = parseInt(process.argv[2]) || 1000;
seedData(targetCount).catch(console.error);
