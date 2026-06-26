import http from 'k6/http';
import { check, sleep } from 'k6';
import { scenarios, thresholds } from './config/scenarios.js';
import { getBaseUrl, generateRandomRecord } from './utils/helpers.js';

export const options = {
  scenarios: {
    load_test: scenarios[__ENV.WORKLOAD_SCALE || 'scale_50']
  },
  thresholds: thresholds
};

export default function () {
  const rand = Math.random();
  const baseUrl = getBaseUrl();

  if (rand < 0.70) {
    // 70% GET
    const res = http.get(`${baseUrl}/api/records?limit=50`, {
      headers: { 'Accept': 'application/json' }
    });
    check(res, { 'get status is 200': (r) => r.status === 200 });
  } else if (rand < 0.90) {
    // 20% POST
    const payload = JSON.stringify(generateRandomRecord(__ITER));
    const res = http.post(`${baseUrl}/api/records`, payload, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });
    check(res, { 'post status is 200': (r) => r.status === 200 });
  } else {
    // 10% Sync
    const records = [generateRandomRecord(__ITER * 10), generateRandomRecord(__ITER * 10 + 1)];
    const payload = JSON.stringify(records);
    const res = http.post(`${baseUrl}/api/sync`, payload, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });
    check(res, { 'sync status is 200': (r) => r.status === 200 });
  }

  sleep(0.1);
}
