'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('./model.js');
const scope = { server: 'Lớp thực hành (demo)', day: '2026-09-16' };
const session = scenario => M.createSession(scenario, scope);
test('happy path: every source must be opened, every item reviewed, then export two follow-ups', () => {
  const s = session('happy');
  assert.throws(() => M.finalize(s), /Duyệt tất cả/);
  assert.throws(() => M.decide(s, s.items[0].id, 'follow', ''), /tin nguồn/);
  assert.throws(() => M.exportResult(s), /Chốt danh sách/);
  for (const item of s.items) { M.viewSources(s, item.id); M.decide(s, item.id, item.suggested, ''); }
  M.finalize(s);
  const result = M.exportResult(s);
  assert.deepEqual(result.followUp, ['DEMO-01', 'DEMO-02']);
  assert.equal(result.decisions.length, 3);
  assert.equal(result.syntheticData, true);
  assert.equal(result.realAICall, false);
  assert.equal(result.sentToDiscord, false);
  assert.deepEqual(result.scope, scope);
});
test('low confidence: cannot accept without explanation; can finish with an explicit context request', () => {
  const s = session('low'); const id = s.items[0].id;
  M.viewSources(s, id);
  assert.throws(() => M.decide(s, id, 'context', '   '), /Thêm lý do/);
  M.decide(s, id, 'context', 'Hỏi lại đang lỗi ở bước nào và xin mô tả ảnh.');
  M.finalize(s);
  assert.deepEqual(M.exportResult(s).followUp, [id]);
});
test('no grounding and request failure: cannot masquerade as a valid empty result', () => {
  for (const scenario of ['no-grounding', 'error']) {
    const s = session(scenario);
    assert.equal(s.items.length, 0);
    assert.throws(() => M.finalize(s), /căn cứ/);
    assert.throws(() => M.exportResult(s), /Chốt danh sách/);
  }
});
test('correction: require rationale, remove resolved item, preserve AI suggestion and TA audit', () => {
  const s = session('correction'); const id = s.items[0].id;
  M.viewSources(s, id);
  assert.throws(() => M.decide(s, id, 'resolved', ''), /Thêm lý do/);
  M.decide(s, id, 'resolved', 'DEMO-M06 xác nhận đã mở được tài liệu.');
  M.finalize(s);
  const result = M.exportResult(s);
  assert.deepEqual(result.followUp, []);
  assert.equal(result.decisions[0].aiSuggestion, 'follow');
  assert.equal(result.decisions[0].taDecision, 'resolved');
  assert.equal(result.audit[0].after, 'resolved');
  M.undo(s, id);
  assert.equal(s.completed, false);
  assert.throws(() => M.finalize(s), /Duyệt tất cả/);
});
test('dismiss and reopen: user can discard a suggestion and later restore a follow-up', () => {
  const s = session('low'); const id = s.items[0].id;
  M.viewSources(s, id); M.decide(s, id, 'dismissed', 'Chưa xác định được nhu cầu hỗ trợ.'); M.finalize(s);
  assert.deepEqual(M.exportResult(s).followUp, []);
  M.decide(s, id, 'context', 'Cần hỏi thêm.');
  assert.equal(s.completed, false);
  M.finalize(s);
  assert.deepEqual(M.exportResult(s).followUp, [id]);
});
test('empty input can be explicitly finalized, and sessions do not share mutations', () => {
  const s = session('empty'); M.finalize(s); assert.deepEqual(M.exportResult(s).followUp, []);
  const first = session('happy'); M.viewSources(first, first.items[0].id);
  assert.equal(session('happy').items[0].seen, false);
});
test('invalid scope, missing source, decision, and oversized notes are rejected', () => {
  assert.throws(() => M.createSession('happy', { ...scope, day: '2027-01-01' }), /Chọn ngày/);
  assert.throws(() => session('unknown'), /Kịch bản/);
  const s = session('happy'); const item = s.items[0];
  M.viewSources(s, item.id);
  assert.throws(() => M.decide(s, item.id, 'invalid', ''), /Chọn một/);
  assert.throws(() => M.decide(s, item.id, 'follow', 'a'.repeat(501)), /500/);
  item.sources = [];
  assert.throws(() => M.viewSources(s, item.id), /căn cứ/);
});
