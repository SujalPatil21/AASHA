export const scenarios = {
  scale_10: {
    executor: 'constant-vus',
    vus: 10,
    duration: '10s',
  },
  scale_50: {
    executor: 'constant-vus',
    vus: 50,
    duration: '10s',
  },
  scale_100: {
    executor: 'constant-vus',
    vus: 100,
    duration: '10s',
  },
  scale_250: {
    executor: 'constant-vus',
    vus: 250,
    duration: '15s',
  },
  scale_500: {
    executor: 'constant-vus',
    vus: 500,
    duration: '15s',
  }
};

export const thresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<500', 'p(99)<1500'],
};
