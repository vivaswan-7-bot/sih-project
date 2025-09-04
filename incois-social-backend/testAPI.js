/**
 * testAPI.js — Coastal Hazard Social MVP Backend Verifier
 * -------------------------------------------------------
 * Run this to continuously validate the backend against the shared API contract.
 *
 * ▶ Usage
 *   1) npm i axios chalk
 *   2) BASE_URL=.env or set below
 *   3) node testAPI.js
 *
 * What it does
 *   - Registers/logs in 3 roles (citizen, official, analyst)
 *   - Creates 6 mock posts with geo + media
 *   - Likes, comments, reacts, reposts on posts from different users
 *   - Fetches feeds, single post, dashboard endpoints
 *   - Prints a ✅/❌ checklist + % progress + TODO hints per failure
 *
 * Notes
 *   - Endpoints follow the **technical document** you shared.
 *   - Body fields include userId where the doc specifies it (even if the backend could infer from JWT).
 *   - If register fails due to existing email, it will fall back to login.
 */

const axios = require('axios');
const crypto = require('crypto');
const chalk = require('chalk');

// =========================
// Config
// =========================
const CONFIG = {
  BASE_URL: process.env.BASE_URL || 'http://localhost:4000',
  TIMEOUT: 15000,
  // Toggle these if your backend rate-limits writes
  SLOW_MODE_MS: 150,
};

const http = axios.create({ baseURL: CONFIG.BASE_URL, timeout: CONFIG.TIMEOUT });

// =========================
// Tiny Test Framework
// =========================
class Runner {
  constructor() { this.tests = []; this.pass = 0; this.fail = 0; this.skipped = 0; }
  add(name, fn) { this.tests.push({ name, fn }); }
  async run() {
    console.log('\n' + chalk.bold.cyan('—— Backend Contract Verifier ————————————————')); 
    console.log(chalk.gray('Base URL: ' + CONFIG.BASE_URL));
    const failures = [];
    for (const [i, t] of this.tests.entries()) {
      try {
        await sleep(CONFIG.SLOW_MODE_MS);
        await t.fn();
        this.pass++;
        console.log(chalk.green(`[${pad(i+1)}] ✓ ${t.name}`));
      } catch (err) {
        this.fail++;
        const msg = errorToMessage(err);
        failures.push({ name: t.name, msg });
        console.log(chalk.red(`[${pad(i+1)}] ✗ ${t.name}`));
        console.log(chalk.red('    → ' + msg));
      }
    }
    const total = this.tests.length;
    const pct = Math.round((this.pass / total) * 100);
    console.log('\n' + chalk.bold('Summary:') + ` ${this.pass}/${total} passed (${pct}%)`);
    if (failures.length) {
      console.log(chalk.bold.red('\nFailures & TODO hints:'));
      for (const f of failures) {
        console.log(chalk.red('\n• ' + f.name));
        console.log(chalk.gray('  ' + f.msg));
        const hint = hintFor(f.name);
        if (hint) console.log(chalk.yellow('  TODO: ' + hint));
      }
    }
  }
}

function pad(n){ return String(n).padStart(2, '0'); }
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function errorToMessage(err){
  if (err.response) {
    const { status, data } = err.response;
    return `HTTP ${status} → ${JSON.stringify(data)}`;
  }
  return err.message || String(err);
}

// =========================
// Validators
// =========================
function expectFields(obj, paths) {
  const missing = [];
  for (const p of paths) {
    if (!hasPath(obj, p)) missing.push(p);
  }
  if (missing.length) {
    throw new Error('Missing fields: ' + missing.join(', '));
  }
}
function hasPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && key in acc ? acc[key] : undefined), obj) !== undefined;
}

// =========================
// Test Data
// =========================
const SUFFIX = crypto.randomBytes(3).toString('hex');
const USERS = {
  citizen: { name: 'Citizen One', email: `citizen_${SUFFIX}@demo.dev`, password: 'Password@123', role: 'citizen' },
  official: { name: 'Official One', email: `official_${SUFFIX}@demo.dev`, password: 'Password@123', role: 'official' },
  analyst: { name: 'Analyst One', email: `analyst_${SUFFIX}@demo.dev`, password: 'Password@123', role: 'analyst' },
};

const MOCK_POSTS = [
  { title: 'Waterlogging at Marina Rd', description: 'Knee-deep water near shops', eventType: 'flood', latitude: 13.06, longitude: 80.28, media: ['marina1.jpg'] },
  { title: 'Unusually high tide', description: 'Waves breaching promenade', eventType: 'high_waves', latitude: 19.07, longitude: 72.88, media: ['tide1.jpg','tide2.mp4'] },
  { title: 'Coastal damage spotted', description: 'Broken embankment after surge', eventType: 'other', latitude: 21.17, longitude: 72.83, media: [] },
  { title: 'Tsunami sirens tested', description: 'Public alerted for drill', eventType: 'tsunami', latitude: 8.49, longitude: 76.95, media: ['sirens.png'] },
  { title: 'Cyclone winds picking up', description: 'Trees swaying heavily', eventType: 'cyclone', latitude: 17.69, longitude: 83.20, media: [] },
  { title: 'Harbor flooding report', description: 'Water entering storage area', eventType: 'flood', latitude: 15.50, longitude: 73.83, media: ['harbor.jpg'] },
];

const MOCK_COMMENTS = [
  'Please avoid this stretch.',
  'Stay safe everyone!',
  'Can officials verify?',
  'Any shelters nearby?',
  'Sharing to my community group.',
  'Road is now clear.'
];

const MOCK_REACTIONS = ['like', 'love', 'sad', 'alert'];

// =========================
// Session State
// =========================
const state = {
  tokens: {}, // role → jwt
  userIds: {}, // role → userId
  postIds: [],
};

// =========================
// API helpers
// =========================
async function register(user){
  const res = await http.post('/auth/register', user);
  expectFields(res, ['data.userId','data.token']);
  return res.data;
}
async function login({ email, password }){
  const res = await http.post('/auth/login', { email, password });
  expectFields(res, ['data.userId','data.token','data.role']);
  return res.data;
}
async function upsertUser(role){
  const u = USERS[role];
  try {
    const data = await register(u);
    state.tokens[role] = data.token;
    state.userIds[role] = data.userId;
    return { created: true, ...data };
  } catch (e) {
    // If email exists, fallback to login
    const data = await login({ email: u.email, password: u.password });
    state.tokens[role] = data.token;
    state.userIds[role] = data.userId;
    return { created: false, ...data };
  }
}

function auth(role){
  return { headers: { Authorization: `Bearer ${state.tokens[role]}` } };
}

async function createPost(role, payload){
  const res = await http.post('/posts', payload, auth(role));
  expectFields(res, ['data.postId','data.status']);
  return res.data.postId;
}

async function likePost(role, postId){
  const res = await http.post(`/posts/${postId}/like`, { userId: state.userIds[role] }, auth(role));
  expectFields(res, ['data.status']);
}
async function commentPost(role, postId, text){
  const res = await http.post(`/posts/${postId}/comment`, { userId: state.userIds[role], text }, auth(role));
  expectFields(res, ['data.commentId']);
}
async function reactPost(role, postId, reaction){
  const res = await http.post(`/posts/${postId}/react`, { userId: state.userIds[role], reaction }, auth(role));
  expectFields(res, ['data.status']);
}
async function repostPost(role, postId){
  const res = await http.post(`/posts/${postId}/repost`, { userId: state.userIds[role] }, auth(role));
  expectFields(res, ['data.status']);
}

async function getFeed(params={}){
  const res = await http.get('/posts', { params });
  expectFields(res, ['data']);
  if (!Array.isArray(res.data)) throw new Error('Feed should return an array');
  return res.data;
}
async function getPost(postId){
  const res = await http.get(`/posts/${postId}`);
  expectFields(res, ['data._id','data.title','data.engagement']);
  return res.data;
}

async function getDashboardSummary(role='official'){
  const res = await http.get('/dashboard/summary', auth(role));
  // accept flexible shape but require at least an object
  if (typeof res.data !== 'object') throw new Error('Summary should be an object');
  return res.data;
}
async function getDashboardReports(role='official', params={ limit: 20 }){
  const res = await http.get('/dashboard/reports', { ...auth(role), params });
  if (!Array.isArray(res.data)) throw new Error('Reports should be an array');
  return res.data;
}

// Optional endpoints (skip if 404)
async function optional(fn){
  try { return await fn(); } catch (e) {
    if (e.response && e.response.status === 404) {
      console.log(chalk.gray('    (optional endpoint not implemented; skipping)'));
      return null;
    }
    throw e;
  }
}

// =========================
// Build Tests
// =========================
const runner = new Runner();

runner.add('Auth → Register/Login Citizen', async () => {
  const r = await upsertUser('citizen');
  if (!state.tokens.citizen) throw new Error('Citizen token missing');
});

runner.add('Auth → Register/Login Official', async () => {
  const r = await upsertUser('official');
  if (!state.tokens.official) throw new Error('Official token missing');
});

runner.add('Auth → Register/Login Analyst', async () => {
  const r = await upsertUser('analyst');
  if (!state.tokens.analyst) throw new Error('Analyst token missing');
});

runner.add('Posts → Create 6 Mock Posts (Citizen/Official)', async () => {
  // Alternate authors between citizen and official
  for (let i = 0; i < MOCK_POSTS.length; i++) {
    const role = i % 2 === 0 ? 'citizen' : 'official';
    const postId = await createPost(role, MOCK_POSTS[i]);
    state.postIds.push(postId);
  }
  if (state.postIds.length !== MOCK_POSTS.length) throw new Error('Not all posts created');
});

runner.add('Feed → GET /posts returns recent posts', async () => {
  const feed = await getFeed({ limit: 20 });
  if (!feed.find(p => state.postIds.includes(p._id))) {
    throw new Error('Created posts not visible in feed');
  }
});

runner.add('Post → GET /posts/:id returns engagement object', async () => {
  const p = await getPost(state.postIds[0]);
  expectFields(p, ['engagement.likes','engagement.comments','engagement.reactions','engagement.reposts']);
});

runner.add('Engagement → Like posts from multiple users', async () => {
  for (const id of state.postIds.slice(0,3)) {
    await likePost('citizen', id);
    await likePost('official', id);
  }
});

runner.add('Engagement → Comment on posts (varied users)', async () => {
  for (let i = 0; i < state.postIds.length; i++) {
    const role = i % 2 === 0 ? 'citizen' : 'official';
    const text = MOCK_COMMENTS[i % MOCK_COMMENTS.length];
    await commentPost(role, state.postIds[i], text);
  }
});

runner.add('Engagement → React on posts (mix of reactions)', async () => {
  for (let i = 0; i < state.postIds.length; i++) {
    const reaction = MOCK_REACTIONS[i % MOCK_REACTIONS.length];
    await reactPost('citizen', state.postIds[i], reaction);
  }
});

runner.add('Engagement → Repost from official and analyst', async () => {
  for (const id of state.postIds.slice(0,2)) {
    await repostPost('official', id);
    await repostPost('analyst', id);
  }
});

runner.add('Post Integrity → Single post reflects engagement counts increasing', async () => {
  const id = state.postIds[0];
  const p = await getPost(id);
  if (!Array.isArray(p.engagement.likes) || p.engagement.likes.length < 1) {
    throw new Error('Like not recorded');
  }
  if (!Array.isArray(p.engagement.comments) || p.engagement.comments.length < 1) {
    throw new Error('Comment not recorded');
  }
  if (!Array.isArray(p.engagement.reactions) || p.engagement.reactions.length < 1) {
    throw new Error('Reaction not recorded');
  }
});

runner.add('Filters → GET /posts?eventType=flood', async () => {
  const feed = await getFeed({ eventType: 'flood', limit: 50 });
  if (!feed.every(p => p.eventType === 'flood')) {
    throw new Error('Filter by eventType did not work');
  }
});

runner.add('Dashboard → GET /dashboard/summary (official auth)', async () => {
  const s = await getDashboardSummary('official');
  // Soft validate a couple of common keys if present
  // (Implementers can shape this freely)
});

runner.add('Dashboard → GET /dashboard/reports (official auth)', async () => {
  const r = await getDashboardReports('official', { limit: 10 });
  if (!r.length) throw new Error('Dashboard reports returned empty unexpectedly');
});

// Optional profile-style endpoint (skip if not in MVP)
runner.add('OPTIONAL → GET /users/me (any role)', async () => {
  await optional(async () => {
    const res = await http.get('/users/me', auth('citizen'));
    expectFields(res, ['data._id','data.email','data.role']);
  });
});

// =========================
// Hints per test name
// =========================
function hintFor(name){
  const map = {
    'Auth → Register/Login Citizen': 'Ensure POST /auth/register and /auth/login return { userId, token } with proper HTTP codes.',
    'Posts → Create 6 Mock Posts (Citizen/Official)': 'Implement POST /posts. Validate body: title, description, eventType, latitude, longitude, media[]. Return { postId, status }.',
    'Feed → GET /posts returns recent posts': 'Implement GET /posts with pagination & sorting by createdAt DESC.',
    'Post → GET /posts/:id returns engagement object': 'GET /posts/:id should embed engagement: { likes: [], comments: [], reactions: [], reposts: [] }.',
    'Engagement → Like posts from multiple users': 'Implement POST /posts/:id/like. Avoid duplicate likes by same user (optional).',
    'Engagement → Comment on posts (varied users)': 'Implement POST /posts/:id/comment returning { commentId } and persist createdAt.',
    'Engagement → React on posts (mix of reactions)': 'Implement POST /posts/:id/react with reaction ∈ {like,love,sad,alert}.',
    'Engagement → Repost from official and analyst': 'Implement POST /posts/:id/repost; consider preventing duplicate reposts by same user (optional).',
    'Post Integrity → Single post reflects engagement counts increasing': 'Make sure GET /posts/:id aggregates engagement arrays from DB correctly.',
    'Filters → GET /posts?eventType=flood': 'Implement query filter on eventType and return only matching posts.',
    'Dashboard → GET /dashboard/summary (official auth)': 'Aggregate counts per eventType/time bucket. Restrict access to official/analyst.',
    'Dashboard → GET /dashboard/reports (official auth)': 'Return list of posts for officials with pagination and filters.',
  };
  return map[name];
}

// =========================
// Go
// =========================
(async function main(){
  try {
    await runner.run();
  } catch (e) {
    console.error(chalk.red('\nFatal error:'), e);
    process.exit(1);
  }
})();
