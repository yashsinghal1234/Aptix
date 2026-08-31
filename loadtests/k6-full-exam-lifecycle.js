import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 Full Exam Lifecycle Load Test
// Run with: k6 run --vus 200 --duration 2m loadtests/k6-full-exam-lifecycle.js

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // Warmup: 100 candidates joining
    { duration: '45s', target: 500 }, // Spike: 500 concurrent candidates starting simultaneously
    { duration: '1m', target: 500 },  // Sustained: Active test taking with background autosaves
    { duration: '15s', target: 1000 }, // Submit Spike: Simultaneous deadline submission burst
    { duration: '30s', target: 0 },   // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'], // 95% of requests must complete under 800ms
    http_req_failed: ['rate<0.01'],    // Error rate must be under 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const EXAM_PIN = __ENV.EXAM_PIN || 'APT-1001';

export default function () {
  const vuId = __VU;
  const iterId = __ITER;
  const candidateEmail = `student_${vuId}_${iterId}@kiet.edu`;
  const candidateName = `Candidate ${vuId}`;

  // Step 1: Candidate Assessment Entry / Login
  const loginPayload = {
    examPin: EXAM_PIN,
    name: candidateName,
    email: candidateEmail,
  };

  const loginRes = http.post(`${BASE_URL}/api/auth/candidate-login`, JSON.stringify(loginPayload), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login status is 200 or 302': (r) => r.status === 200 || r.status === 302,
  });

  sleep(Math.random() * 2 + 1);

  // Step 2: Assessment Interface Fetch (Hits Redis / In-Memory Question Cache)
  const examPageRes = http.get(`${BASE_URL}/`);
  check(examPageRes, {
    'exam page loads successfully': (r) => r.status === 200,
  });

  // Step 3: Candidate answering questions with debounced autosave simulation
  for (let q = 1; q <= 5; q++) {
    sleep(Math.random() * 3 + 2); // Simulating reading and answering time

    const draftPayload = {
      questionId: `mock_q_${q}`,
      selectedOption: `Option ${String.fromCharCode(65 + (q % 4))}`,
    };

    const draftRes = http.post(`${BASE_URL}/api/exam/autosave`, JSON.stringify(draftPayload), {
      headers: { 'Content-Type': 'application/json' },
    });

    check(draftRes, {
      'autosave response received': (r) => r.status === 200 || r.status === 204 || r.status === 404,
    });
  }

  // Step 4: Final Submission Burst
  sleep(Math.random() * 2);
  const submitRes = http.post(`${BASE_URL}/api/exam/submit`, JSON.stringify({
    timestamp: Date.now(),
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(submitRes, {
    'submit completed without 500 error': (r) => r.status < 500,
  });
}
