import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseUrl, generateRandomRecord } from './utils/helpers.js';

export const options = {
  stages: [
    { duration: '5s', target: 50 },  // Ramp up to 50 users
    { duration: '10s', target: 150 }, // Ramp up to 150 users
    { duration: '10s', target: 350 }, // Stress ramp up to 350 users
    { duration: '10s', target: 500 }, // Stress peak up to 500 users
    { duration: '5s', target: 0 }    // Cool down to 0 users
  ],
  thresholds: {
    http_req_failed: ['rate<0.10'], // Less than 10% failures accepted under stress
  }
};

export default function () {
  const baseUrl = getBaseUrl();
  const rand = Math.random();

  // Mixed traffic during stress test
  if (rand < 0.50) {
    http.get(`${baseUrl}/api/records?limit=50`);
  } else {
    const payload = JSON.stringify(generateRandomRecord(__ITER));
    http.post(`${baseUrl}/api/records`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  sleep(0.05); // Rapid requests under stress
}
