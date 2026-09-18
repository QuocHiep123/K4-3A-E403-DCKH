'use strict';
const Q=window.PulseQuestionGroups;
let groupSession=null,groupSessionKey=null;
const groupCandidates=()=>Q.candidates(conversations(),state.records);
const groupsKey=()=>state.review&&state.model?`${storageKey()}:groups-v1:${JSON.stringify(groupCandidates().map(c=>c.id).sort())}`:null;

function readGroupSession(){
  const key=groupsKey();if(key===groupSessionKey)return;
  groupSessionKey=key;groupSession=null;
  if(!key)return;
  try{
    const saved=JSON.parse(localStorage.getItem(key)||'null');
    if(saved?.version===1&&saved.model===state.model&&saved.fingerprint===state.review.fingerprint&&Q.validGroups(saved.groups,groupCandidates())){
      saved.reviews=Object.fromEntries(saved.groups.map(g=>[g.id,Q.restore(g,saved.reviews?.[g.id])]));groupSession=saved;
    }
  }catch{toast('Không đọc được nhóm đã lưu. Có thể đề xuất lại nhóm.');}
  $('groupsStatus').textContent=groupSession?`Đã khôi phục ${groupSession.groups.length} nhóm gợi ý của ${state.model}.`:'Chạy phân tích trước, rồi đề xuất nhóm khi muốn soạn một câu trả lời chung.';
}
function saveGroupSession(next){
  try{localStorage.setItem(groupSessionKey,JSON.stringify(next));groupSession=next;return true;}
  catch{toast('Không lưu được nhóm/bản nháp. Thay đổi chưa được lưu.');return false;}
}
function updateGroupControls(){
  if(!$('groupsBtn'))return;
  const count=groupCandidates().length;
  $('groupsBtn').disabled=state.busy||!state.model||draftModel()!==state.model||count<2||count>80;
  $('exportGroupsBtn').disabled=state.busy||!groupSession?.groups.some(g=>groupSession.reviews[g.id]?.confirmed);
  for(const input of document.querySelectorAll('#questionGroups input,#questionGroups textarea,#questionGroups button'))input.disabled=state.busy||input.dataset.locked==='true';
}
function groupExport(){
  if(!groupSession)return null;
  return {model:groupSession.model,trace_id:groupSession.trace_id,request_id:groupSession.request_id,generated_at:groupSession.generated_at,
    candidate_ids:groupSession.candidate_ids,groups:groupSession.groups.map(g=>({...g,review:groupSession.reviews[g.id]}))};
}
function renderGroups(){
  readGroupSession();$('groupSection').hidden=!state.review;
  if(!state.review){$('questionGroups').replaceChildren();return;}
  const count=groupCandidates().length,analyzed=Object.values(state.records).filter(r=>r.result).length;
  $('groupsCoverage').textContent=`${count} hội thoại chưa trả lời có thể kiểm tra · Đã phân tích ${analyzed}/${conversations().length} hội thoại.${count>80?' Chọn ngày/kênh nhỏ hơn để gom tối đa 80 hội thoại mỗi lần.':''}${analyzed<conversations().length?' Phạm vi phân tích chưa đầy đủ.':''}`;
  $('groupsBtn').textContent=groupSession?'Đề xuất lại (thay bản nháp)':'Đề xuất nhóm câu hỏi';
  $('questionGroups').replaceChildren();
  if(groupSession&&!groupSession.groups.length){const p=document.createElement('p');p.className='hint';p.textContent='AI chưa tìm thấy nhóm đủ rõ trong các hội thoại đã kiểm tra. Các câu hỏi vẫn được giữ riêng.';$('questionGroups').append(p);}
  for(const group of groupSession?.groups||[])renderQuestionGroup(group);
  updateGroupControls();
}
function renderQuestionGroup(group){
  const review=groupSession.reviews[group.id],sessionKey=groupSessionKey;
  const card=document.createElement('article');card.className='question-group';card.dataset.groupId=group.id;
  const heading=document.createElement('h3');heading.textContent=`${group.title} · ${review.included.length} hội thoại`;
  const status=document.createElement('p');status.className='group-state';status.textContent=review.dismissed?'Đã bỏ nhóm':review.confirmed?'TA đã xác nhận nhóm · chưa gửi câu trả lời':'AI gợi ý · chờ TA kiểm tra';
  const dismiss=document.createElement('button');dismiss.className='group-dismiss';dismiss.textContent=review.dismissed?'Khôi phục nhóm':'Bỏ nhóm';
  dismiss.addEventListener('click',()=>{if(state.busy)return;const next={...review,dismissed:!review.dismissed,confirmed:false,confirmed_at:null,audit:[...review.audit,{at:new Date().toISOString(),action:review.dismissed?'restored':'dismissed'}]};if(saveGroupSession({...groupSession,reviews:{...groupSession.reviews,[group.id]:next}}))renderGroups();});
  card.append(heading,status,dismiss);$('questionGroups').append(card);if(review.dismissed)return;
  const question=document.createElement('p');question.className='shared-question';question.textContent=group.question;
  const reason=document.createElement('p');reason.className='hint';reason.textContent=group.reasoning;card.append(question,reason);
  const members=document.createElement('div');members.className='group-members';card.append(members);
  for(const member of group.members){
    const c=conversations().find(c=>c.id===member.id);
    const row=document.createElement('div');row.className='group-member';row.dataset.memberId=c.id;
    const label=document.createElement('label');label.className='check';const check=document.createElement('input');check.type='checkbox';check.checked=review.included.includes(c.id);check.className='group-include';
    label.append(check,document.createTextNode(`Giữ ${c.id} · ${c.title}`));row.append(label);
    check.addEventListener('change',()=>{if(state.busy)return;const current=groupSession.reviews[group.id];const ids=check.checked?[...current.included,c.id]:current.included.filter(id=>id!==c.id);const next=Q.changeMembers(group,current,ids);if(saveGroupSession({...groupSession,reviews:{...groupSession.reviews,[group.id]:next}}))renderGroups();});
    const details=document.createElement('details');details.className='group-source';const summary=document.createElement('summary');summary.textContent=`Xem nguồn · ${c.guild} / ${c.channel} · ${review.seen.includes(c.id)?'đã mở':'chưa mở'}`;details.append(summary);
    for(const msg of c.messages){const block=document.createElement('div');block.className=`message${member.evidence_ids.includes(msg.msg_id)?' cited':''}`;const meta=document.createElement('p');meta.className='meta';meta.textContent=`${msg.msg_id} · ${msg.created_at_vn||'Không có thời gian'} · ${msg.speaker}`;const text=document.createElement('p');text.textContent=msg.content;block.append(meta,text);details.append(block);}
    for(const warning of c.warnings){const p=document.createElement('p');p.className='warnings';p.textContent=warning;details.append(p);}
    details.addEventListener('toggle',()=>{if(!details.open||state.busy||sessionKey!==groupSessionKey||!groupSession?.reviews[group.id])return;const current=groupSession.reviews[group.id];if(!current.seen.includes(c.id)){const next={...current,seen:[...current.seen,c.id]};if(saveGroupSession({...groupSession,reviews:{...groupSession.reviews,[group.id]:next}}))summary.textContent=`Xem nguồn · ${c.guild} / ${c.channel} · đã mở`;}});
    row.append(details);members.append(row);
  }
  const approved=document.createElement('label');approved.className='check';const approval=document.createElement('input');approval.type='checkbox';approval.className='group-approval';approval.checked=review.confirmed;
  approved.append(approval,document.createTextNode('Tôi đã kiểm tra: cùng câu hỏi chung, cùng đối tượng; một câu trả lời áp dụng cho tất cả.'));
  const confirm=document.createElement('button');confirm.className='group-confirm';confirm.textContent=review.confirmed?'Nhóm đã xác nhận':'Xác nhận nhóm';confirm.dataset.locked=String(review.confirmed);
  confirm.addEventListener('click',()=>{if(state.busy)return;try{const next=Q.confirm(group,groupSession.reviews[group.id],approval.checked);if(saveGroupSession({...groupSession,reviews:{...groupSession.reviews,[group.id]:next}}))renderGroups();}catch(error){toast(error.message);}});
  approval.addEventListener('change',()=>{if(!approval.checked&&groupSession.reviews[group.id].confirmed){const next={...groupSession.reviews[group.id],confirmed:false,confirmed_at:null};if(saveGroupSession({...groupSession,reviews:{...groupSession.reviews,[group.id]:next}}))renderGroups();}});
  const replyLabel=document.createElement('label');replyLabel.textContent='Câu trả lời chung của TA';replyLabel.htmlFor=`reply-${group.id}`;
  const reply=document.createElement('textarea');reply.id=replyLabel.htmlFor;reply.className='group-reply';reply.rows=3;reply.maxLength=5000;reply.value=review.reply;reply.dataset.locked=String(!review.confirmed);reply.placeholder='Xác nhận nhóm, rồi nhập câu trả lời với thông tin đã kiểm chứng (deadline, link, quy định…).';
  const copy=document.createElement('button');copy.className='group-copy primary';copy.textContent='Sao chép câu trả lời';copy.dataset.locked=String(!review.confirmed||!review.reply.trim());
  reply.addEventListener('input',()=>{if(state.busy||!groupSession.reviews[group.id].confirmed)return;const next={...groupSession.reviews[group.id],reply:reply.value,updated_at:new Date().toISOString()};if(saveGroupSession({...groupSession,reviews:{...groupSession.reviews,[group.id]:next}})){copy.dataset.locked=String(!next.reply.trim());updateGroupControls();}else{reply.value=groupSession.reviews[group.id].reply;}});
  copy.addEventListener('click',async()=>{const current=groupSession.reviews[group.id];if(state.busy||!current.confirmed||!current.reply.trim())return;try{await navigator.clipboard.writeText(current.reply);toast('Đã sao chép. Chưa gửi Discord hoặc đổi trạng thái hội thoại.');}catch{reply.focus();reply.select();toast('Trình duyệt không cho sao chép tự động. Dùng Ctrl/Cmd+C với nội dung đã chọn.');}});
  const note=document.createElement('p');note.className='hint';note.textContent='Bản nháp lưu trong trình duyệt. Sao chép không đánh dấu đã trả lời/giải quyết; danh sách tối đa 5 hội thoại vẫn được duyệt riêng.';
  card.append(approved,confirm,replyLabel,reply,copy,note);
}
async function suggestQuestionGroups(){
  const eligible=groupCandidates();if(state.busy||eligible.length<2||eligible.length>80||!state.model||draftModel()!==state.model)return;
  const controller=new AbortController();activeRequests.add(controller);state.stop=false;state.cancelled=false;setBusy(true);$('stopBtn').hidden=false;$('stopBtn').disabled=false;
  $('groupsStatus').textContent=`Đang kiểm tra ${eligible.length} hội thoại để đề xuất nhóm câu hỏi chung…`;
  try{
    const result=await api('/api/groups',{review_id:state.review.review_id,ids:eligible.map(c=>c.id),model:state.model},controller);
    if(controller.signal.aborted)return;
    if(result.mode!=='live'||result.model!==state.model||result.fingerprint!==state.review.fingerprint||!Q.validGroups(result.groups,eligible))throw new Error('Nhóm không khớp phạm vi hoặc căn cứ. Chưa nhận các gợi ý này.');
    const next={version:1,model:state.model,fingerprint:state.review.fingerprint,candidate_ids:eligible.map(c=>c.id),groups:result.groups,
      reviews:Object.fromEntries(result.groups.map(g=>[g.id,Q.initial(g)])),trace_id:result.trace_id,request_id:result.request_id,generated_at:new Date().toISOString()};
    if(!saveGroupSession(next))return;
    renderGroups();$('groupsStatus').textContent=`${result.groups.length} nhóm gợi ý từ ${eligible.length} hội thoại. Kiểm tra nguồn và bỏ các mục không phù hợp trước khi xác nhận.`;
    log(`Gom câu hỏi: ${result.groups.length} nhóm · ${result.latency_seconds}s${result.trace_id?` · trace ${result.trace_id}`:''}`);
    if(result.trace_logged===false)log('Không ghi được log LLM; kiểm tra thư mục logs.');
  }catch(error){$('groupsStatus').textContent=error.code==='analysis_cancelled'?'Đã dừng gom nhóm. Bản nháp đã lưu vẫn được giữ.':error.message;log(`Gom nhóm: ${error.message}${error.traceId?` · trace ${error.traceId}`:''}`);}
  finally{activeRequests.delete(controller);setBusy(false);$('stopBtn').hidden=true;}
}
function exportQuestionGroups(){
  if(state.busy||!groupSession)return;
  const data={product:'Discord Pulse',source:state.review.source,scope:state.review.scope,fingerprint:state.review.fingerprint,exported_at:new Date().toISOString(),sentToDiscord:false,question_groups:groupExport()};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='discord-pulse-question-groups.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
window.addEventListener('DOMContentLoaded',()=>{$('groupsBtn').addEventListener('click',suggestQuestionGroups);$('exportGroupsBtn').addEventListener('click',exportQuestionGroups);});
