import http from 'k6/http';
import { check, sleep } from 'k6';
import { scenarios, thresholds } from './config/scenarios.js';
import { getBaseUrl, generateRandomRecord } from './utils/helpers.js';

export const options = {
  scenarios: {
    load_test: scenarios[__ENV.WORKLOAD_SCALE || 'scale_10']
  },
  thresholds: thresholds
};

export default function () {
  const records = [];
  for (let i = 0; i < 5; i++) {
    records.push(generateRandomRecord(__ITER * 10 + i));
  }

  const payload = JSON.stringify(records);
  const url = `${getBaseUrl()}/api/sync`;

  const res = http.post(url, payload, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'synced records': (r) => r.json().synced > 0
  });

  sleep(0.1);
}
