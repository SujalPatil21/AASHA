import http from 'k6/http';
import { check, sleep } from 'k6';
import { scenarios, thresholds } from './config/scenarios.js';
import { getBaseUrl } from './utils/helpers.js';

export const options = {
  scenarios: {
    load_test: scenarios[__ENV.WORKLOAD_SCALE || 'scale_10']
  },
  thresholds: thresholds
};

export default function () {
  const url = `${getBaseUrl()}/api/records?limit=50`;
  const res = http.get(url, {
    headers: { 'Accept': 'application/json' }
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has records': (r) => r.json().records !== undefined
  });

  sleep(0.1);
}
