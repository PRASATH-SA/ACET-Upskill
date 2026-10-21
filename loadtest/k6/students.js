/**
 * H1 k6 scenario (same as loadtest/run.js): 500 students submit quizzes and rate revision
 * cards; a faculty user polls insights. Thresholds fail the run if p95 >= 500 ms.
 *
 *   LOAD_WORKERS=8 node loadtest/server.js          # in one terminal (writes .tmp/load-fixture.json)
 *   k6 run -e FIXTURE=../../.tmp/load-fixture.json loadtest/k6/students.js
 *
 * Against a deployed API, build the fixture with real tokens instead of the throwaway server.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const fx = JSON.parse(open(__ENV.FIXTURE || '../../.tmp/load-fixture.json'));
const topicIds = Object.keys(fx.quizzes);

export const options = {
  scenarios: {
    students: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 500),
      duration: __ENV.DURATION || '60s',
      exec: 'student',
    },
    faculty: {
      executor: 'constant-vus',
      vus: 1,
      duration: __ENV.DURATION || '60s',
      exec: 'faculty',
    },
  },
  thresholds: {
    'http_req_duration{name:quiz submit}': ['p(95)<500'],
    'http_req_duration{name:revision rate}': ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const headers = (token) => ({
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
});

export function student() {
  const token = fx.students[(__VU - 1) % fx.students.length];
  const topicId = topicIds[(__VU + __ITER) % topicIds.length];
  const answers = fx.quizzes[topicId].map((q) => ({
    questionId: q.questionId,
    selectedIndex: Math.floor(Math.random() * q.options),
  }));
  const quiz = http.post(`${fx.baseUrl}/quiz/submit`, JSON.stringify({ topicId, answers }), {
    ...headers(token),
    tags: { name: 'quiz submit' },
  });
  check(quiz, { 'quiz submit 200': (r) => r.status === 200 });
  sleep(1);

  const today = http.get(`${fx.baseUrl}/revision/today`, {
    ...headers(token),
    tags: { name: 'revision today' },
  });
  const ids = (today.json('data.groups') || []).flatMap((g) => g.items.map((i) => i.reviewId));
  for (const id of ids.slice(0, 3)) {
    const rating = ['again', 'hard', 'good', 'easy'][Math.floor(Math.random() * 4)];
    const r = http.post(`${fx.baseUrl}/revision/${id}/rate`, JSON.stringify({ rating }), {
      ...headers(token),
      tags: { name: 'revision rate' },
    });
    check(r, { 'revision rate 200': (x) => x.status === 200 });
    sleep(1);
  }
}

export function faculty() {
  const r = http.get(`${fx.baseUrl}/subjects/${fx.subjectId}/insights`, {
    ...headers(fx.faculty),
    tags: { name: 'insights' },
  });
  check(r, { 'insights 200': (x) => x.status === 200 });
  sleep(2);
}
