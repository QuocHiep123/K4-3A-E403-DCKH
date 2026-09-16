(function (root) {
  'use strict';
  const labels = { follow: 'Cần theo dõi', context: 'Cần kiểm tra thêm', resolved: 'Đã giải quyết', dismissed: 'Bỏ khỏi đề xuất' };
  // All messages below are authored synthetic fixtures, not course-pack excerpts.
  const fixtures = {
    access: { id: 'DEMO-01', title: 'Vẫn chưa mở được bài thực hành', topic: 'Truy cập bài học', channel: '#ho-tro', confidence: 'high', suggested: 'follow', reason: 'Tin gần nhất nói vẫn gặp lỗi sau khi đã thử hướng dẫn. Có phản hồi chưa đồng nghĩa đã giải quyết.', sources: [{ id: 'DEMO-M01', time: '16:20', who: 'Học viên A (giả lập)', text: 'Mình mở bài thực hành thì thấy trang trắng.' }, { id: 'DEMO-M02', time: '16:25', who: 'Trợ giảng (giả lập)', text: 'Bạn thử đăng xuất rồi đăng nhập lại giúp mình nhé.' }, { id: 'DEMO-M03', time: '17:10', who: 'Học viên A (giả lập)', text: 'Mình đã thử nhưng vẫn thấy trang trắng.' }] },
    submit: { id: 'DEMO-02', title: 'Cần làm rõ cách nộp bài nhóm', topic: 'Nộp bài', channel: '#hoi-dap', confidence: 'high', suggested: 'follow', reason: 'Có câu hỏi về cách nộp bài; trong phần ngữ cảnh giả lập chưa thấy câu trả lời. Không kết luận rằng TA đã bỏ sót.', sources: [{ id: 'DEMO-M04', time: '18:05', who: 'Học viên B (giả lập)', text: 'Nhóm mình nộp chung một bản hay mỗi người nộp một bản vậy ạ?' }] },
    fixed: { id: 'DEMO-03', title: 'Đã mở được tài liệu buổi học', topic: 'Tài liệu', channel: '#ho-tro', confidence: 'high', suggested: 'resolved', reason: 'Tin cuối xác nhận đã mở được tài liệu. TA vẫn cần đọc nguồn trước khi chốt.', sources: [{ id: 'DEMO-M05', time: '15:00', who: 'Học viên C (giả lập)', text: 'Mình chưa mở được tài liệu buổi học.' }, { id: 'DEMO-M06', time: '15:12', who: 'Học viên C (giả lập)', text: 'Mình đổi sang tài khoản lớp và đã mở được rồi, cảm ơn mọi người!' }] },
    unclear: { id: 'DEMO-04', title: '“Vẫn như lúc nãy” là vấn đề gì?', topic: 'Thiếu ngữ cảnh', channel: '#ho-tro', confidence: 'low', suggested: 'context', reason: 'Tin không nói rõ vấn đề và ảnh đính kèm không có trong mẫu. Chưa đủ căn cứ để xác định lỗi hoặc kết quả.', sources: [{ id: 'DEMO-M07', time: '18:20', who: 'Học viên D (giả lập)', text: 'Mình vẫn như lúc nãy ạ. [Ảnh không có trong mẫu]' }] }
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  function createSession(scenario, scope) {
    if (!['happy', 'low', 'no-grounding', 'correction', 'error', 'empty'].includes(scenario)) throw new Error('Kịch bản không hợp lệ.');
    if (!scope.server || !['2026-09-15', '2026-09-16'].includes(scope.day)) throw new Error('Chọn ngày 15 hoặc 16/09/2026 cho bản mẫu.');
    let items = scenario === 'happy' ? [fixtures.access, fixtures.submit, fixtures.fixed] : scenario === 'low' ? [fixtures.unclear] : scenario === 'correction' ? [{ ...fixtures.fixed, suggested: 'follow', reason: 'Đề xuất sai có chủ đích để thử correction: AI chỉ nhìn tin báo lỗi đầu tiên và bỏ qua tin xác nhận đã mở được.' }] : [];
    items = clone(items).map(item => ({ ...item, seen: false, decision: null, note: '' }));
    return { scenario, scope: clone(scope), items, completed: false, createdAt: new Date().toISOString(), audit: [] };
  }
  function getItem(session, id) { const item = session.items.find(row => row.id === id); if (!item) throw new Error('Không tìm thấy hội thoại.'); return item; }
  function viewSources(session, id) { const item = getItem(session, id); if (!item.sources.length) throw new Error('Không có căn cứ hợp lệ.'); item.seen = true; }
  function decide(session, id, decision, note) {
    const item = getItem(session, id);
    if (!item.seen) throw new Error('Hãy mở và đọc tin nguồn trước khi lưu quyết định.');
    if (!Object.hasOwn(labels, decision)) throw new Error('Chọn một quyết định.');
    note = String(note || '').trim();
    if (note.length > 500) throw new Error('Ghi chú tối đa 500 ký tự.');
    if ((item.confidence === 'low' || decision !== item.suggested) && !note) throw new Error('Thêm lý do khi sửa đề xuất hoặc xử lý trường hợp chưa chắc chắn.');
    if (['follow', 'context'].includes(decision) && !['follow', 'context'].includes(item.decision) && session.items.filter(row => ['follow', 'context'].includes(row.decision)).length >= 5) throw new Error('Danh sách đã có 5 hội thoại. Hãy bỏ bớt trước khi thêm.');
    session.audit.push({ id, before: item.decision, after: decision, note, at: new Date().toISOString() });
    item.decision = decision; item.note = note; session.completed = false;
  }
  function undo(session, id) { const item = getItem(session, id); session.audit.push({ id, before: item.decision, after: null, note: 'Mở lại để duyệt', at: new Date().toISOString() }); item.decision = null; item.note = ''; session.completed = false; }
  function finalize(session) {
    if (['error', 'no-grounding'].includes(session.scenario)) throw new Error('Chưa có kết quả có căn cứ để chốt.');
    if (session.items.some(item => !item.decision)) throw new Error('Duyệt tất cả hội thoại trước khi chốt danh sách.');
    session.completed = true;
  }
  function exportResult(session) {
    if (!session.completed) throw new Error('Chốt danh sách trước khi tải kết quả.');
    return { product: 'Discord Pulse', checkpoint: 'CP2', prototype: 'Mock', syntheticData: true, realAICall: false, sentToDiscord: false, scope: session.scope, scenario: session.scenario, createdAt: session.createdAt, exportedAt: new Date().toISOString(), followUp: session.items.filter(item => ['follow', 'context'].includes(item.decision)).map(item => item.id), decisions: session.items.map(({ id, title, suggested, decision, note, sources }) => ({ id, title, aiSuggestion: suggested, taDecision: decision, note, sourceIds: sources.map(source => source.id) })), audit: session.audit };
  }
  const api = { labels, createSession, viewSources, decide, undo, finalize, exportResult };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PulseModel = api;
})(typeof window === 'undefined' ? {} : window);
