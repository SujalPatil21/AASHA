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
  const idNum = __ITER;
  const payload = JSON.stringify(generateRandomRecord(idNum));
  const url = `${getBaseUrl()}/api/records`;

  const res = http.post(url, payload, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'saved successfully': (r) => r.json().synced === true
  });

  sleep(0.1);
}
