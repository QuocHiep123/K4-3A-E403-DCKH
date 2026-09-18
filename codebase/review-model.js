(function(root) {
  'use strict';
  const labels = {'no-response':'Cần theo dõi','responded-unclear':'Có phản hồi, chưa rõ kết quả',resolved:'Đã giải quyết','needs-context':'Cần kiểm tra thêm',other:'Không cần hỗ trợ',dismissed:'Bỏ khỏi danh sách'};
  const follow = new Set(['no-response','responded-unclear','needs-context']);
  function ranked(conversations, records) {
    return conversations.filter(c => records[c.id]?.result && follow.has(records[c.id].result.label))
      .sort((a,b) => records[b.id].result.priority-records[a.id].result.priority || a.last_at.localeCompare(b.last_at) || a.id.localeCompare(b.id)).slice(0,5);
  }
  function decide(records, id, label, note, reviewed) {
    const old = records[id];
    if (!reviewed) throw new Error('Đọc nguồn và đánh dấu đã kiểm tra trước khi lưu.');
    if (!old?.result) throw new Error('Chưa có kết quả AI hợp lệ cho hội thoại này.');
    if (!Object.hasOwn(labels,label)) throw new Error('Chọn quyết định hợp lệ.');
    note = String(note || '').trim();
    if (note.length > 500) throw new Error('Ghi chú tối đa 500 ký tự.');
    if ((label !== old.result.label || old.result.needs_ta_review || old.result.confidence < .6 || label === 'needs-context') && !note) throw new Error('Thêm lý do hoặc bước tiếp theo khi sửa hoặc chưa chắc chắn.');
    if (follow.has(label) && !follow.has(old.decision) && Object.values(records).filter(r => follow.has(r.decision)).length >= 5) throw new Error('Danh sách đã có 5 hội thoại. Bỏ một mục trước khi thêm mục khác.');
    const at = new Date().toISOString();
    return {...records,[id]:{...old,decision:label,note,saved_at:at,audit:[...(old.audit||[]),{at,before:old.decision||null,after:label,note,aiSuggestion:old.result}]}};
  }
  function validResult(row, conversation) {
    const ids = new Set(conversation.messages.map(m=>m.msg_id));
    return row && row.id === conversation.id && Object.hasOwn(labels,row.label) && row.label !== 'dismissed' &&
      Number.isInteger(row.priority) && row.priority >= 0 && row.priority <= 3 &&
      (follow.has(row.label) ? row.priority > 0 : row.priority === 0) &&
      typeof row.confidence === 'number' && Number.isFinite(row.confidence) && row.confidence >= 0 && row.confidence <= 1 &&
      typeof row.reasoning === 'string' && row.reasoning.trim() && typeof row.needs_ta_review === 'boolean' &&
      Array.isArray(row.evidence_ids) && row.evidence_ids.length >= 1 && row.evidence_ids.length <= 3 && row.evidence_ids.every(mid=>ids.has(mid));
  }
  const api={labels,follow,ranked,decide,validResult};
  if(typeof module !== 'undefined' && module.exports) module.exports=api; else root.PulseReview=api;
})(typeof window === 'undefined' ? {} : window);
