'use strict';
const M = window.PulseModel;
const workspace = document.querySelector('#workspace');
const announcement = document.querySelector('#announcement');
let session = null;
let activeId = null;
let busy = false;
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const e = escapeHTML;
function say(message) { announcement.textContent = message; }
function step(number) { ['one', 'two', 'three'].forEach((id, index) => { const element = document.querySelector('#step-' + id); if (index + 1 === number) element.setAttribute('aria-current', 'step'); else element.removeAttribute('aria-current'); }); }
function focusTitle() { const title = workspace.querySelector('[tabindex="-1"]'); if (title) title.focus({ preventScroll: true }); }
function scopeText() { return `${session.scope.server} / ${session.scope.day.split('-').reverse().join('/')} / đến 23:59`; }
function badge(item) { return item.decision ? `<span class="badge done">TA: ${e(M.labels[item.decision])}</span>` : `<span class="badge ${item.confidence === 'low' ? 'low' : ''}">${item.confidence === 'low' ? 'Chưa chắc chắn' : 'Đủ căn cứ · giả lập'}</span>`; }
document.querySelector('#setup').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  busy = true;
  const form = event.currentTarget;
  const scope = { server: document.querySelector('#server').value, day: document.querySelector('#day').value };
  const scenario = document.querySelector('#scenario').value;
  Array.from(form.elements).forEach(element => { element.disabled = true; });
  say('Đang chuẩn bị đề xuất giả lập…');
  workspace.setAttribute('aria-busy', 'true');
  try {
    await new Promise(resolve => setTimeout(resolve, 450));
    session = M.createSession(scenario, scope);
    activeId = session.items[0]?.id || null;
    step(2); render(); focusTitle(); say(['error', 'no-grounding'].includes(scenario) ? 'Lượt rà soát chưa có kết quả hợp lệ. Xem thông báo để khôi phục.' : scenario === 'empty' ? 'Không có dữ liệu trong phạm vi giả lập này.' : 'Đã tạo lượt rà soát. Mở tin nguồn trước khi quyết định.');
  } catch (error) { say(error.message); }
  finally { busy = false; workspace.removeAttribute('aria-busy'); Array.from(form.elements).forEach(element => { element.disabled = false; }); }
});
function render() {
  if (session.completed) return renderResult();
  if (session.scenario === 'error' || session.scenario === 'no-grounding') return renderFailure();
  if (!session.items.length) return renderEmpty();
  const item = session.items.find(row => row.id === activeId);
  const done = session.items.filter(row => row.decision).length;
  const follow = session.items.filter(row => ['follow', 'context'].includes(row.decision)).length;
  workspace.innerHTML = `<div class="review-heading"><div><h2 tabindex="-1">Hội thoại cần bạn xem</h2><p>${e(scopeText())} · ${new Set(session.items.map(row => row.topic)).size} chủ đề</p></div><span class="count">Đã duyệt ${done}/${session.items.length}</span></div>
    <div class="review-grid"><nav class="queue" aria-label="Hội thoại"><p class="queue-title">Chủ đề & hội thoại</p>${session.items.map(row => `<button type="button" class="conversation" data-action="select" data-id="${e(row.id)}" aria-pressed="${row.id === activeId}">${badge(row)}<strong>${e(row.title)}</strong><span class="small">${e(row.topic)} / ${e(row.channel)}</span></button>`).join('')}<p class="source-note">Mỗi nhận định đi cùng tin nguồn. Nhãn tin cậy là tình huống giả lập, không phải xác suất AI đã đo.</p></nav>
    <article class="detail" aria-label="Chi tiết hội thoại"><div class="detail-meta">${e(item.id)} / ${e(item.channel)}</div><h2 tabindex="-1" id="detail-title">${e(item.title)}</h2>${badge(item)}<div class="reason"><strong>AI đề xuất: ${e(M.labels[item.suggested])}</strong><p>${e(item.reason)}</p></div>
    ${item.confidence === 'low' ? '<div class="warning"><strong>Chưa đủ ngữ cảnh để kết luận.</strong><br>Đọc phần tin hiện có, ghi rõ điều cần hỏi thêm. Bạn có thể giữ “Cần kiểm tra thêm” hoặc bỏ đề xuất kèm lý do.</div>' : ''}
    <button type="button" data-action="sources" aria-expanded="${item.seen}" aria-controls="sources" ${item.seen ? 'disabled' : ''}>${item.seen ? 'Đã mở tin nguồn' : `Mở ${item.sources.length} tin nguồn`}</button>
    <div id="sources">${item.seen ? `<section class="source-block" aria-label="Tin nguồn"><h3>Căn cứ của nhận định</h3>${item.sources.map(source => `<div class="message"><small>${e(source.id)} / ${e(source.who)} / ${e(source.time)}</small><p>${e(source.text)}</p></div>`).join('')}<p class="source-note">Ví dụ tự tạo cho CP2. Không phải tin thật hoặc liên kết Discord.</p></section>` : ''}</div>
    <form class="decision-form" id="decision-form"><label for="decision">Quyết định của TA<select id="decision" ${item.seen ? '' : 'disabled'}>${Object.entries(M.labels).map(([value, label]) => `<option value="${value}" ${(item.decision || item.suggested) === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label for="note">Lý do / việc cần làm tiếp<textarea id="note" maxlength="500" ${item.seen ? '' : 'disabled'} placeholder="Ví dụ: Hỏi lại học viên đang lỗi ở bước nào.">${e(item.note)}</textarea></label><p class="helper">Bắt buộc ghi lý do khi sửa đề xuất hoặc xử lý trường hợp chưa chắc chắn. Lưu trong lượt này; không gửi lên Discord.</p><p class="error-text" id="decision-error" role="alert"></p><div class="form-actions"><button class="primary" type="submit" ${item.seen ? '' : 'disabled'}>Lưu quyết định</button>${item.decision ? '<button type="button" class="quiet" data-action="undo">Mở lại để duyệt</button>' : ''}</div>${!item.seen ? '<p class="helper">Mở và đọc tin nguồn để bật phần quyết định.</p>' : ''}</form>
    ${item.decision ? `<div class="saved">Đã lưu trong lượt này: <strong>${e(M.labels[item.decision])}</strong>. Bạn có thể sửa tiếp hoặc mở lại để duyệt.</div>` : ''}</article></div>
    <div class="bottom-bar"><p>${follow}/5 hội thoại trong danh sách theo dõi. ${done < session.items.length ? `Còn ${session.items.length - done} hội thoại chưa duyệt.` : 'Đã duyệt hết; bạn có thể chốt danh sách.'}</p><button type="button" class="primary" data-action="finish" ${done < session.items.length ? 'disabled' : ''}>Chốt danh sách</button></div>`;
  document.querySelector('#decision-form').addEventListener('submit', event => {
    event.preventDefault();
    try { M.decide(session, activeId, document.querySelector('#decision').value, document.querySelector('#note').value); render(); say('Đã lưu quyết định của TA.'); }
    catch (error) { document.querySelector('#decision-error').textContent = error.message; }
  });
}
function renderFailure() {
  const grounding = session.scenario === 'no-grounding';
  workspace.innerHTML = `<section class="failure"><span class="badge low">${grounding ? 'Không có căn cứ' : 'Yêu cầu thất bại'}</span><h2 tabindex="-1">${grounding ? 'Chưa có tin nguồn để đưa ra đề xuất.' : 'Chưa nhận được kết quả phân tích.'}</h2><p>${grounding ? 'Mã nguồn trong phản hồi giả lập không khớp dữ liệu. Đề xuất bị loại; không có danh sách để duyệt. Bạn có thể kiểm tra dữ liệu hoặc thử lượt đủ căn cứ.' : 'Đang mô phỏng một yêu cầu AI hết thời gian chờ. Phạm vi rà soát vẫn được giữ. Thử lại sẽ dùng phản hồi thành công dựng sẵn cho CP2.'}</p><p>${e(scopeText())}</p><div class="form-actions"><button type="button" class="primary" data-action="retry">${grounding ? 'Thử lượt có căn cứ' : 'Thử lại'}</button><button type="button" data-action="raw">Kiểm tra dữ liệu đầu vào</button></div><div id="raw-data"></div><p class="helper">Không tạo kết quả thay thế khi thiếu nguồn hoặc lỗi yêu cầu. Nút thử lại chủ động chuyển sang tình huống thành công giả lập.</p></section>`;
}
function renderEmpty() { workspace.innerHTML = `<section class="failure"><span class="badge">Không có hội thoại</span><h2 tabindex="-1">Không có dữ liệu trong phạm vi này.</h2><p>${e(scopeText())}</p><p>Không có dữ liệu không chứng minh mọi vấn đề đã được giải quyết. Bạn có thể đổi phạm vi ở trên hoặc chốt một danh sách rỗng có ghi rõ giới hạn.</p><button type="button" class="primary" data-action="finish">Chốt danh sách rỗng</button></section>`; }
function resultRow(item) { return `<div class="result-item"><h3>${e(item.title)}</h3><span class="badge ${item.decision === 'context' ? 'low' : 'done'}">${e(M.labels[item.decision])}</span><p>${e(item.note || 'TA đã đọc nguồn và giữ đề xuất.')}<br>Nguồn: ${item.sources.map(source => e(source.id)).join(', ')}</p></div>`; }
function renderResult() {
  step(3);
  const follow = session.items.filter(item => ['follow', 'context'].includes(item.decision));
  const rest = session.items.filter(item => !['follow', 'context'].includes(item.decision));
  workspace.innerHTML = `<section class="result"><div class="result-title"><span class="result-check" aria-hidden="true">✓</span><div><h2 tabindex="-1">Đã chốt ${follow.length} hội thoại cần theo dõi.</h2><p>${e(scopeText())}<br>TA đã xác nhận trong bản mẫu. Chưa gửi hoặc cập nhật gì trên Discord.</p></div></div>${follow.length ? follow.map(resultRow).join('') : '<div class="warning">Danh sách theo dõi rỗng. Đây là kết quả của lượt rà soát này, không chứng minh toàn server không còn ai cần giúp.</div>'}${rest.length ? `<details><summary>${rest.length} hội thoại đã giải quyết / bỏ khỏi đề xuất</summary>${rest.map(resultRow).join('')}</details>` : ''}<div class="form-actions"><button class="primary" type="button" data-action="export">Tải kết quả JSON</button>${session.items.length ? '<button type="button" data-action="back">Quay lại chỉnh sửa</button>' : ''}<button type="button" class="quiet" data-action="new">Chọn lượt mới</button></div><p class="helper">Tệp ghi rõ dữ liệu giả lập, quyết định TA, mã nguồn và lịch sử sửa. Tải tệp trước khi đóng hoặc tải lại tab.</p></section>`;
}
workspace.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button || !session) return;
  try {
    switch (button.dataset.action) {
      case 'select': activeId = button.dataset.id; render(); document.querySelector('#detail-title').focus({ preventScroll: true }); break;
      case 'sources': M.viewSources(session, activeId); render(); document.querySelector('#decision').focus({ preventScroll: true }); say('Đã mở tin nguồn. Đọc căn cứ rồi chọn quyết định.'); break;
      case 'undo': M.undo(session, activeId); render(); say('Đã mở lại hội thoại; cần lưu quyết định mới trước khi chốt.'); break;
      case 'finish': M.finalize(session); render(); focusTitle(); say('Danh sách đã được chốt trong bản mẫu.'); break;
      case 'retry': session = M.createSession('happy', session.scope); activeId = session.items[0].id; document.querySelector('#scenario').value = 'happy'; render(); focusTitle(); say('Đã chuyển sang phản hồi thành công giả lập. Hãy duyệt lại các đề xuất.'); break;
      case 'raw': document.querySelector('#raw-data').innerHTML = `<div class="source-block"><h3>Kiểm tra dữ liệu đầu vào</h3><p class="helper">Phạm vi: ${e(scopeText())}</p><p>${session.scenario === 'no-grounding' ? 'Không có tin nguồn hợp lệ. Mã DEMO-MISSING không tồn tại; đề xuất không được đưa vào danh sách.' : 'Ví dụ đầu vào: DEMO-M01 — “Mình mở bài thực hành thì thấy trang trắng.” Nguồn giả lập có sẵn, nhưng yêu cầu phân tích đã thất bại.'}</p></div>`; break;
      case 'back': session.completed = false; step(2); render(); focusTitle(); say('Đã mở lại lượt rà soát. Chốt lại danh sách sau khi sửa.'); break;
      case 'new': document.querySelector('#scenario').focus(); say('Chọn kịch bản rồi bấm “Tạo lượt rà soát”. Lượt mới sẽ thay thế lượt hiện tại.'); break;
      case 'export': {
        const data = M.exportResult(session);
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = `discord-pulse-cp2-${session.scope.day}.json`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); say('Đã yêu cầu tải tệp JSON. Kiểm tra thư mục tải xuống của trình duyệt.'); break;
      }
    }
  } catch (error) { say(error.message); }
});
