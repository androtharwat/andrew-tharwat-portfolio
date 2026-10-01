const { test } = require('node:test');
const assert = require('node:assert/strict');

const handler = require('../api/share.js');
const mediaId = 'b827d0f8-fbef-4673-95ad-d2a114c2cf58';

function responseHarness() {
  return {
    headers: {},
    statusCode: 200,
    body: '',
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; }
  };
}

async function withFetchStub(run) {
  const original = global.fetch;
  const calls = [];
  global.fetch = async url => {
    calls.push(String(url));
    if (String(url).includes('portfolio_project_media')) {
      return { ok: true, json: async () => [{
        id: mediaId,
        url: 'https://cdn.example.test/media.png',
        media_type: 'image',
        title: 'Test visual',
        brief: 'Test brief',
        project_id: '8a9819ab-9542-4f8b-9bdc-e5f903c2f3f6'
      }] };
    }
    return { ok: true, json: async () => [{
      slug: 'test-project',
      title: 'Test project',
      excerpt: 'Test excerpt',
      cover_url: 'https://cdn.example.test/cover.png'
    }] };
  };
  try { await run(calls); } finally { global.fetch = original; }
}

test('share preview accepts a legacy req.query value and uses the request host', async () => {
  await withFetchStub(async calls => {
    const res = responseHarness();
    await handler({ query: { media: mediaId }, headers: { host: 'preview.example.test' }, url: '/api/share' }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 2);
    assert.match(res.body, /https:\/\/preview\.example\.test\/projects\/test-project#media-/);
    assert.match(res.body, /https:\/\/preview\.example\.test\/api\/share\?media=/);
    assert.doesNotMatch(res.body, /andrew-tharwat-portfolio\.vercel\.app/);
  });
});

test('share preview reads media from req.url when req.query is unavailable', async () => {
  await withFetchStub(async calls => {
    const res = responseHarness();
    await handler({ headers: { 'x-forwarded-host': 'company.example.test' }, url: `/api/share?media=${mediaId}` }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 2);
    assert.match(res.body, /https:\/\/company\.example\.test\/projects\/test-project#media-/);
  });
});

test('share preview rejects an invalid media id before contacting Supabase', async () => {
  await withFetchStub(async calls => {
    const res = responseHarness();
    await handler({ query: { media: 'invalid' }, headers: { host: 'preview.example.test' }, url: '/api/share' }, res);
    assert.equal(res.statusCode, 404);
    assert.equal(res.body, 'Not found');
    assert.equal(calls.length, 0);
  });
});
