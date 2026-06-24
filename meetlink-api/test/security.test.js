'use strict';
// Regression tests for the data-isolation / authorization invariants fixed in the
// 2026-06-24 security audit. Pure unit tests with mocked deps (no DB) using Node's
// built-in test runner — run with `npm test` (builds first, then `node --test`).

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { resolveJwtSecret, INSECURE_DEFAULT_JWT_SECRET } = require('../dist/auth/jwt-secret.js');
const { RateLimit } = require('../dist/common/rate-limit.guard.js');
const { MessagesService, sanitizeReplyStory } = require('../dist/messages/messages.service.js');
const { MessagesController } = require('../dist/messages/messages.controller.js');
const { RequestsService } = require('../dist/requests/requests.service.js');
const { ProfilesService } = require('../dist/profiles/profiles.service.js');
const { AdminGuard } = require('../dist/auth/admin.guard.js');
const { offloadImage } = require('../dist/common/image-storage.js');

const cfg = (values) => ({ get: (k) => values[k] });
const noDb = () => ({
  query: async () => {
    throw new Error('DB must NOT be queried without a viewer profile id');
  },
});

// ---- JWT secret never falls back to the public default in production ----
test('resolveJwtSecret: returns configured secret', () => {
  assert.equal(resolveJwtSecret(cfg({ ADMIN_JWT_SECRET: 'real-secret' })), 'real-secret');
});

test('resolveJwtSecret: dev falls back to the default (zero-config)', () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    assert.equal(resolveJwtSecret(cfg({})), INSECURE_DEFAULT_JWT_SECRET);
  } finally {
    process.env.NODE_ENV = prev;
  }
});

test('resolveJwtSecret: production THROWS when no real secret is set', () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    assert.throws(() => resolveJwtSecret(cfg({})), /must be set/i);
    // also rejects the public default value explicitly configured
    assert.throws(() => resolveJwtSecret(cfg({ ADMIN_JWT_SECRET: INSECURE_DEFAULT_JWT_SECRET })), /must be set/i);
  } finally {
    process.env.NODE_ENV = prev;
  }
});

// ---- Rate limiter trips after its limit ----
test('RateLimit: allows up to the limit then 429s', () => {
  const Guard = RateLimit(3, 60_000);
  const guard = new Guard();
  const ctx = {
    switchToHttp: () => ({ getRequest: () => ({ headers: {}, ip: '9.9.9.9' }) }),
  };
  assert.equal(guard.canActivate(ctx), true); // 1
  assert.equal(guard.canActivate(ctx), true); // 2
  assert.equal(guard.canActivate(ctx), true); // 3
  let status;
  try {
    guard.canActivate(ctx); // 4 → blocked
  } catch (e) {
    status = typeof e.getStatus === 'function' ? e.getStatus() : e.status;
  }
  assert.equal(status, 429);
});

test('RateLimit: separate IPs have independent buckets', () => {
  const Guard = RateLimit(1, 60_000);
  const guard = new Guard();
  const ctxFor = (ip) => ({ switchToHttp: () => ({ getRequest: () => ({ headers: {}, ip }) }) });
  assert.equal(guard.canActivate(ctxFor('1.1.1.1')), true);
  assert.equal(guard.canActivate(ctxFor('2.2.2.2')), true); // different IP, still allowed
  assert.throws(() => guard.canActivate(ctxFor('1.1.1.1')), (e) => (e.getStatus?.() ?? e.status) === 429);
});

// ---- Conversation/request lists NEVER return the whole table without a viewer ----
test('MessagesService.listConversations: returns [] (no DB query) when viewer is missing', async () => {
  const svc = new MessagesService(noDb(), {}, {});
  assert.deepEqual(await svc.listConversations(undefined), []);
  assert.deepEqual(await svc.listConversations(''), []);
});

test('RequestsService.listForOwner: returns [] (no DB query) when owner is missing', async () => {
  const svc = new RequestsService(noDb(), {}, {}, {});
  assert.deepEqual(await svc.listForOwner(undefined), []);
  assert.deepEqual(await svc.listForOwner(''), []);
});

// ---- Conversation routes reject a caller without a resolved profile ----
test('MessagesController: rejects a request with no profileId', () => {
  const ctrl = new MessagesController({ listConversations: (id) => ({ scopedTo: id }) });
  assert.throws(() => ctrl.listConversations({ user: undefined }), (e) => (e.getStatus?.() ?? e.status) === 401);
  assert.throws(() => ctrl.listConversations({ user: {} }), (e) => (e.getStatus?.() ?? e.status) === 401);
  // with a profileId it forwards the scoped id to the service
  assert.deepEqual(ctrl.listConversations({ user: { profileId: 'p1' } }), { scopedTo: 'p1' });
});

// ---- "My profile" never falls back to the admin profile ----
test('ProfilesService.findOwnProfile: throws without a profile id (no admin fallback)', async () => {
  const svc = new ProfilesService(noDb());
  await assert.rejects(() => svc.findOwnProfile(undefined), (e) => (e.getStatus?.() ?? e.status) === 401);
  await assert.rejects(() => svc.findOwnProfile(''), (e) => (e.getStatus?.() ?? e.status) === 401);
});

// ---- Legacy x-admin-token bypass is gone; only a Bearer JWT is accepted ----
test('AdminGuard: rejects the removed x-admin-token header and no-auth', () => {
  const guard = new AdminGuard({ get: () => undefined });
  const ctxWith = (headers) => ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) });
  assert.throws(() => guard.canActivate(ctxWith({ 'x-admin-token': 'whatever' })), (e) => (e.getStatus?.() ?? e.status) === 401);
  assert.throws(() => guard.canActivate(ctxWith({})), (e) => (e.getStatus?.() ?? e.status) === 401);
});

// ---- Image offload is a safe no-op until Supabase Storage is configured ----
test('offloadImage: passthrough for non-data-URLs / null, and falls back when unconfigured', async () => {
  assert.equal(await offloadImage(null, 'avatars'), null);
  assert.equal(await offloadImage(undefined, 'avatars'), null);
  assert.equal(await offloadImage('https://cdn.example/x.jpg', 'avatars'), 'https://cdn.example/x.jpg');
  // With no SUPABASE_* env set, a data-URL is returned unchanged (no regression / no upload).
  const data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  assert.equal(await offloadImage(data, 'avatars'), data);
});

// ---- Persisted reply-story is capped and NEVER stores a base64 image ----
test('sanitizeReplyStory: drops data-URL images, keeps http URLs, caps + nulls empty', () => {
  assert.equal(sanitizeReplyStory(null), null);
  assert.equal(sanitizeReplyStory({}), null); // no name/snippet/image → null
  const fromDataUrl = sanitizeReplyStory({ name: 'Mara', snippet: 'hi', gradient: 'g', image: 'data:image/png;base64,AAAA', mine: true });
  assert.equal(fromDataUrl.image, null); // data-URL image dropped (no re-bloat)
  assert.equal(fromDataUrl.mine, undefined); // mine is NOT persisted (derived per-viewer)
  const fromUrl = sanitizeReplyStory({ name: 'Mara', image: 'https://cdn/x.jpg' });
  assert.equal(fromUrl.image, 'https://cdn/x.jpg');
  const capped = sanitizeReplyStory({ snippet: 'x'.repeat(1000) });
  assert.ok(capped.snippet.length <= 300);
});

// ---- Public profile lookup must never SELECT private contact fields ----
test('ProfilesService.findPublicByNickname: query never selects contact fields', async () => {
  const sqls = [];
  const db = {
    query: async (q) => {
      sqls.push(q);
      return /profile_photos/i.test(q) ? { rows: [] } : { rows: [{ id: '1', nickname: 'x', name: 'X' }] };
    },
  };
  const svc = new ProfilesService(db);
  await svc.findPublicByNickname('x');
  for (const f of ['instagram', 'telegram', 'phone']) {
    assert.ok(!sqls.some((q) => q.includes(f)), `public profile query must not select ${f}`);
  }
});
