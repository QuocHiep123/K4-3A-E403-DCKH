'use strict';
const M = window.PulseReview;
const $ = id => document.getElementById(id);
const state = {source:'bundled', dataset:null, review:null, records:{}, selected:null, view:'all', busy:false, stop:false, model:null, configLoaded:false};
let toastTimer;
const activeRequests=new Set();
function toast(message) { clearTimeout(toastTimer); $('toast').textContent=message; $('toast').classList.add('show'); toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4500); }
function log(message) { $('runLog').textContent += `\n[${new Date().toLocaleTimeString()}] ${message}`; $('runLog').scrollTop=$('runLog').scrollHeight; }
async function api(path, body, controller=new AbortController()) {
  const timer=setTimeout(()=>controller.abort(),70000);
  try {
    const response=await fetch(path,{signal:controller.signal,...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
    let data; try {data=await response.json();} catch {throw new Error(`Server không trả JSON (HTTP ${response.status}). Chạy lại python server.py.`);}
    if(!response.ok || data.success!==true) {const error=new Error(data.message || `HTTP ${response.status}`);error.status=response.status;error.code=data.error;error.traceId=data.trace_id;error.traceLogged=data.trace_logged;throw error;}
    return data;
  } catch(error) {
    if(controller.signal.reason==='user_stop'){const cancelled=new Error('Đã dừng chờ kết quả.');cancelled.code='analysis_cancelled';throw cancelled;}
    if(error.name==='AbortError') throw new Error('Hết thời gian chờ. Lượt này chưa có kết quả, hãy thử lại.');
    if(error instanceof TypeError) throw new Error('Không kết nối được server. Chạy python server.py rồi thử lại.');
    throw error;
  } finally {clearTimeout(timer);}
}
const conversations=()=>state.review?.conversations||[];
const selected=()=>conversations().find(c=>c.id===state.selected);
const storageKey=()=>`discord-pulse-review-v3:${state.review.fingerprint}:${state.model}`;
const draftModel=()=>$('modelSelect').value==='custom'?$('customModel').value.trim():$('modelSelect').value;
const validModel=value=>typeof value==='string' && value.length<=200 && /^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(value);
function editModel() {
  $('customModelLabel').hidden=$('modelSelect').value!=='custom';
  $('modelStatus').textContent=draftModel()===state.model?`Đang dùng: ${state.model}`:validModel(draftModel())?'Nhấn Enter hoặc rời ô nhập để dùng model này.':'Nhập ID OpenRouter dạng provider/model-id.';
  updateControls();
}
function applyModel() {
  if(state.busy||!state.configLoaded)return;
  const model=draftModel();
  if(!validModel(model)||model===state.model){editModel();return;}
  state.model=model;
  try{localStorage.setItem('discord-pulse-model',model);}catch{toast('Model chỉ được giữ trong tab này.');}
  editModel();
  if(state.review){
    readRecords();state.view='all';state.selected=conversations()[0]?.id||null;render();
    const restored=Object.values(state.records).filter(r=>r.result).length;
    $('analysisStatus').textContent=restored?`Đã khôi phục ${restored}/${conversations().length} kết quả của ${model}. Chưa gọi AI mới.`:`Chưa phân tích với ${model}. Bấm phân tích để chạy trên cùng phạm vi.`;
  }
}
async function loadModels() {
  try{
    const config=await api('/api/config');
    $('modelSelect').replaceChildren();
    for(const model of config.models||[])$('modelSelect').add(new Option(model.name,model.id));
    if(validModel(config.model)&&![...$('modelSelect').options].some(o=>o.value===config.model))$('modelSelect').add(new Option(config.model,config.model));
    $('modelSelect').add(new Option('Model khác…','custom'));
    let preferred;try{preferred=localStorage.getItem('discord-pulse-model');}catch{}
    state.model=validModel(preferred)?preferred:validModel(config.model)?config.model:null;
    const preset=[...$('modelSelect').options].some(o=>o.value===state.model);
    $('modelSelect').value=preset?state.model:'custom';$('customModel').value=preset?'':state.model||'';
    state.configLoaded=true;editModel();
    if(state.review&&state.model){readRecords();render();}
  }catch(error){$('modelStatus').textContent=error.message;}
  updateControls();
}
function writeRecords(next, required=false) {
  try {localStorage.setItem(storageKey(),JSON.stringify({version:3,model:state.model,records:next}));}
  catch {if(required) throw new Error('Không lưu được trong trình duyệt. Quyết định chưa được lưu.'); $('savedStatus').textContent='Không lưu được tự động. Kết quả AI hiện chỉ có trong tab này.';}
  state.records=next;
}
function readRecords() {
  const records={};
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey())||localStorage.getItem(`discord-pulse-review-v2:${state.review.fingerprint}`)||'null');
    if(saved?.version===2 || (saved?.version===3 && saved.model===state.model)) for(const c of conversations()) {
      const record=saved.records?.[c.id];
      if(record && record.model===state.model && M.validResult(record.result,c) && Array.isArray(record.audit||[]) &&
        (!record.decision || Object.hasOwn(M.labels,record.decision)) && typeof(record.note||'')==='string') records[c.id]=record;
    }
  } catch {toast('Không đọc được bản lưu cũ. Dữ liệu nguồn vẫn có thể xem và phân tích.');}
  // Do not accept corrupted stored state with more than five final priorities.
  if(Object.values(records).filter(r=>M.follow.has(r.decision)).length>5) for(const r of Object.values(records)) r.decision=null;
  state.records=records;
}
function chooseSource(source) {
  if(state.busy) return;
  if(source!==state.source){invalidatePreview();state.dataset=null;$('scopePanel').hidden=true;$('inputStatus').classList.remove('error');$('inputStatus').textContent='Đọc dữ liệu mới để tạo phạm vi rà soát.';}
  state.source=source;
  for(const button of document.querySelectorAll('[data-source]')) {
    const active=button.dataset.source===source; button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active));
  }
  $('bundledPanel').hidden=source!=='bundled'; $('csvPanel').hidden=source!=='csv'; $('pastePanel').hidden=source!=='paste';
}
function setBusy(value) {
  state.busy=value;
  for(const id of ['loadBundled','loadCsv','loadPaste','csvFile','pasteText','guildFilter','dateFilter','channelFilter','previewBtn']) $(id).disabled=value;
  for(const button of document.querySelectorAll('[data-source]')) button.disabled=value;
  updateControls();
}
function updateControls() {
  const modelReady=state.configLoaded && !!state.model && draftModel()===state.model;
  $('modelSelect').disabled=state.busy||!state.configLoaded;$('customModel').disabled=state.busy||!state.configLoaded;
  const pending=conversations().filter(c=>!c.blocked && !state.records[c.id]?.result);
  const failed=pending.filter(c=>state.records[c.id]?.error);
  $('analyzeBtn').disabled=state.busy || !modelReady || pending.length===0;
  $('analyzeBtn').textContent=Object.values(state.records).some(r=>r.result)?'Tiếp tục phân tích':'Tìm hội thoại cần giúp';
  $('retryBtn').hidden=failed.length===0; $('retryBtn').disabled=state.busy||!modelReady;
  const canDecide=!state.busy && !!state.records[state.selected]?.result && $('sourceReviewed').checked;
  for(const id of ['taDecision','decisionNote','saveDecision']) $(id).disabled=!canDecide;
  $('sourceReviewed').disabled=state.busy;
  $('exportBtn').disabled=state.busy || !Object.values(state.records).some(r=>r.decision);
}
function invalidatePreview() {
  state.review=null; state.records={}; state.selected=null;
  $('analysisSection').hidden=true; $('reviewSection').hidden=true;
}
function options(element, values, allLabel) {
  element.replaceChildren();
  if(allLabel) element.add(new Option(allLabel,''));
  for(const value of values) element.add(new Option(value,value));
}
function guildOptions() {
  const scope=state.dataset.scopes.find(s=>s.guild===$('guildFilter').value);
  options($('dateFilter'),scope?.dates||[],'Toàn bộ thời gian');
  if(scope?.dates.length) $('dateFilter').value=scope.dates.at(-1);
  options($('channelFilter'),scope?.channels||[],'Tất cả kênh');
}
async function importData(source) {
  if(state.busy) return;
  setBusy(true); invalidatePreview(); $('scopePanel').hidden=true; $('inputStatus').classList.remove('error');
  $('inputStatus').textContent='Đang đọc và kiểm tra dữ liệu…';
  try {
    let body={source};
    if(source==='csv') {
      const file=$('csvFile').files[0];
      if(!file) throw new Error('Chọn một file CSV trước.');
      if(file.size>2*1024*1024) throw new Error('File lớn hơn 2 MB. Hãy chia nhỏ trước khi tải.');
      const bytes=await file.arrayBuffer();
      let text; try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new Error('CSV cần mã hóa UTF-8. Xuất lại file ở định dạng CSV UTF-8.');}
      body={source,text,name:file.name};
    } else if(source==='paste') body.text=$('pasteText').value;
    state.dataset=await api('/api/import',body);
    $('inputStatus').textContent=`${state.dataset.name}: ${state.dataset.message_count} tin nhắn, ${state.dataset.human_count} tin do người viết. Chưa gọi AI.`;
    options($('guildFilter'),state.dataset.guilds);
    $('guildFilter').value=state.dataset.guilds.at(-1);
    guildOptions(); $('scopePanel').hidden=false;
    await loadPreview(true);
  } catch(error) {$('inputStatus').classList.add('error'); $('inputStatus').textContent=error.message;}
  finally {setBusy(false);}
}
async function loadPreview(fromImport=false) {
  if(state.busy && !fromImport) return;
  setBusy(true); invalidatePreview();
  try {
    const result=await api('/api/preview',{dataset_id:state.dataset.dataset_id,guild:$('guildFilter').value,day:$('dateFilter').value,channel:$('channelFilter').value});
    state.review=result; readRecords(); state.view='all'; state.selected=result.conversations[0]?.id||null;
    $('analysisSection').hidden=false; $('reviewSection').hidden=false;
    $('scopeSummary').textContent=`${result.conversations.length} hội thoại · ${result.message_count} tin · ${result.batches.length} lượt AI`;
    $('scopeName').textContent=`${result.name} / ${result.scope.guild} / ${result.scope.day||'toàn bộ thời gian'} / ${result.scope.channel||'tất cả kênh'}`;
    $('scopeWarnings').replaceChildren();
    for(const warning of result.warnings) {const li=document.createElement('li');li.textContent=warning;$('scopeWarnings').append(li);}
    $('savedStatus').textContent='Quyết định lưu trong trình duyệt này. Nhập lại cùng dữ liệu và bộ lọc để khôi phục; tải JSON để giữ bản sao.';
    render();
    const restored=Object.values(state.records).filter(r=>r.result).length;
    $('analysisStatus').textContent=restored?`Đã khôi phục ${restored}/${result.conversations.length} kết quả AI trong trình duyệt. Đây là lượt đã lưu, chưa gọi AI mới.`:result.conversations.length?'Kiểm tra tin nguồn trước khi chạy. AI chỉ nhận phạm vi đang hiển thị.':'Không có hội thoại do người viết trong phạm vi này. Hãy đổi ngày hoặc kênh.';
  } catch(error) {$('inputStatus').classList.add('error');$('inputStatus').textContent=error.message;}
  finally {if(!fromImport)setBusy(false);}
}
function renderList() {
  const items=state.view==='top'?M.ranked(conversations(),state.records):conversations();
  $('viewTop').classList.toggle('active',state.view==='top'); $('viewTop').setAttribute('aria-pressed',String(state.view==='top'));
  $('viewAll').classList.toggle('active',state.view==='all'); $('viewAll').setAttribute('aria-pressed',String(state.view==='all'));
  $('listSummary').textContent=state.view==='top'?'Xếp theo mức ưu tiên AI; cùng mức thì hội thoại cũ hơn trước. Kết quả có thể thay đổi khi phân tích chưa xong.':`${items.length} hội thoại, gồm cả mục không được AI ưu tiên.`;
  $('caseList').replaceChildren();
  if(!items.length) {const p=document.createElement('p');p.className='hint';p.textContent=state.view==='top'?'Chưa có đề xuất cần theo dõi. Xem tiến độ và các lượt lỗi trước khi kết luận.':'Không có hội thoại.';$('caseList').append(p);}
  for(const c of items) {
    const r=state.records[c.id];const button=document.createElement('button');button.className=`case-button${state.selected===c.id?' selected':''}`;button.dataset.id=c.id;
    const title=document.createElement('strong');title.textContent=c.id;const text=document.createTextNode(c.title.length>=110?c.title+'…':c.title);
    const meta=document.createElement('span');meta.textContent=r?.decision?`TA: ${M.labels[r.decision]}`:r?.result?`${M.labels[r.result.label]} · Ưu tiên ${r.result.priority}/3`:c.blocked?'Vượt giới hạn':r?.error?'Lỗi · chưa phân tích':'Chưa phân tích';
    button.append(title,text,meta);button.addEventListener('click',()=>{state.selected=c.id;renderList();renderDetail();});$('caseList').append(button);
  }
}
function renderDetail() {
  const c=selected();$('detail').hidden=!c;if(!c)return;
  const r=state.records[c.id], ai=r?.result;
  $('caseMeta').textContent=`${c.id} · ${c.guild} / ${c.channel} · ${c.messages.length} tin`;
  $('caseTitle').textContent=c.title;
  $('aiLabel').textContent=ai?M.labels[ai.label]:'Chưa phân tích';$('aiLabel').className=`status ${ai?.label||''}`;
  $('aiResult').hidden=!ai;
  if(ai){$('aiReason').textContent=ai.reasoning;$('aiMetrics').textContent=`Ưu tiên ${ai.priority}/3 · Tin cậy ${Math.round(ai.confidence*100)}% (model tự báo, chưa hiệu chuẩn) · ${r.model}${Number.isFinite(r.latency_seconds)?` · ${r.latency_seconds}s / lượt`:""}`;$('evidenceIds').textContent=`Căn cứ: ${ai.evidence_ids.join(', ')}. Mã đã đối chiếu; TA cần kiểm tra nội dung.`;}
  $('caseError').hidden=!r?.error;$('caseError').textContent=r?.error||'';
  $('caseWarnings').replaceChildren();for(const warning of c.warnings){const li=document.createElement('li');li.textContent=warning;$('caseWarnings').append(li);}
  $('messages').replaceChildren();
  for(const msg of c.messages){const article=document.createElement('div');article.className=`message${ai?.evidence_ids.includes(msg.msg_id)?' cited':''}`;article.dataset.messageId=msg.msg_id;
    const meta=document.createElement('p');meta.className='meta';meta.textContent=`${msg.msg_id} · ${msg.speaker} · ${msg.created_at_vn||'Không có thời gian'}${msg.reply_to?' · reply '+msg.reply_to:''}`;
    const content=document.createElement('p');content.textContent=msg.content;article.append(meta,content);
    if(msg.n_attachments){const note=document.createElement('p');note.className='attachment';note.textContent=`${msg.n_attachments} tệp đính kèm không có trong dữ liệu`;article.append(note);}$('messages').append(article);}
  $('decisionArea').hidden=!ai;$('sourceReviewed').checked=false;
  $('taDecision').value=r?.decision||ai?.label||'needs-context';$('decisionNote').value=r?.note||'';
  $('decisionStatus').textContent=r?.decision?`Đã lưu: ${M.labels[r.decision]} · ${r.saved_at}`:'Chưa lưu quyết định.';
  updateControls();
}
function renderFinal() {
  const final=conversations().filter(c=>M.follow.has(state.records[c.id]?.decision));
  $('finalCount').textContent=`${final.length}/5`;$('finalList').replaceChildren();
  for(const c of final){const li=document.createElement('li');li.textContent=`${c.id} · ${c.title}`;const button=document.createElement('button');button.textContent='Xem / đổi quyết định';button.addEventListener('click',()=>{state.selected=c.id;state.view='all';renderList();renderDetail();$('detail').scrollIntoView({block:'start'});});li.append(button);$('finalList').append(li);}
  if(!final.length){const li=document.createElement('li');li.textContent='Chưa chốt mục cần theo dõi.';$('finalList').append(li);}
  updateControls();
}
function render(){renderList();renderDetail();renderFinal();const count=Object.values(state.records).filter(r=>r.result).length;$('analysisProgress').max=Math.max(1,conversations().length);$('analysisProgress').value=count;}
async function analyzePending(onlyFailed=false) {
  if(state.busy||!state.review||!state.model||draftModel()!==state.model)return;
  const groups=state.review.batches.map(ids=>ids.filter(id=>!state.records[id]?.result && (!onlyFailed||state.records[id]?.error))).filter(ids=>ids.length);
  if(!groups.length)return;
  state.stop=false;state.cancelled=false;setBusy(true);$('stopBtn').hidden=false;$('stopBtn').disabled=false;
  const concurrency=state.model.endsWith(':free')||state.model==='openrouter/free'?1:3;
  const started=performance.now();let cursor=0,active=0,completed=0;
  const progress=()=>{$('analysisStatus').textContent=`${state.stop?'Đang dừng; chờ các lượt đã gửi…':'Đang phân tích…'} ${completed}/${groups.length} lượt hoàn tất · ${active} lượt đang chạy · ${Math.round((performance.now()-started)/1000)}s đã trôi qua.`;};
  const timer=setInterval(progress,1000);
  async function worker(){
   while(!state.stop && cursor<groups.length){
    const i=cursor++,ids=groups[i];active++;progress();
    const controller=new AbortController();activeRequests.add(controller);
    log(`Bắt đầu lượt ${i+1}: ${ids.join(', ')}`);
    try {
      const result=await api('/api/analyze',{review_id:state.review.review_id,ids,model:state.model},controller);
      if(controller.signal.aborted)continue;
      if(result.model!==state.model||result.mode!=='live'||result.fingerprint!==state.review.fingerprint||!Array.isArray(result.results)||result.results.length!==ids.length||new Set(result.results.map(r=>r.id)).size!==ids.length||result.results.some(r=>!ids.includes(r.id)||!M.validResult(r,conversations().find(c=>c.id===r.id))))throw new Error('Kết quả AI không khớp model/phạm vi hoặc thiếu căn cứ. Lượt này chưa được chấp nhận.');
      const next={...state.records};for(const row of result.results)next[row.id]={result:row,model:result.model,served_model:result.served_model,trace_id:result.trace_id,timing:result.timing,request_id:result.request_id,latency_seconds:result.latency_seconds,analyzed_at:new Date().toISOString(),decision:null,note:'',audit:[]};
      writeRecords(next);log(`Đã nhận ${result.results.length} kết quả · ${result.model} · ${result.latency_seconds}s${result.trace_id?` · trace ${result.trace_id}`:""}`);if(result.trace_logged===false)log("Không ghi được log LLM; kiểm tra thư mục logs.");
    }catch(error){
      if(error.code==='analysis_cancelled'){log(`Đã dừng chờ lượt ${i+1}; chưa lưu kết quả cho ${ids.join(', ')}.`);}
      else{for(const id of ids)state.records[id]={error:error.message,trace_id:error.traceId};log(`LỖI: ${error.message}${error.traceId?` · trace ${error.traceId}`:""}`);if(error.traceLogged===false)log("Không ghi được log LLM; kiểm tra thư mục logs.");if(error.status===400||error.code==='missing_api_key'||error.code==='upstream_error'){state.stop=true;toast(error.message);}}
    }finally{activeRequests.delete(controller);active--;if(!controller.signal.aborted)completed++;render();progress();}
   }
  }
  try{await Promise.all(Array.from({length:Math.min(concurrency,groups.length)},()=>worker()));}
  finally{clearInterval(timer);setBusy(false);$('stopBtn').hidden=true;}
  const elapsed=((performance.now()-started)/1000).toFixed(1);
  log(`Kết thúc: ${completed}/${groups.length} lượt · ${elapsed}s tổng thời gian · tối đa ${concurrency} lượt đồng thời`);
  const done=Object.values(state.records).filter(r=>r.result).length;
  const failed=Object.values(state.records).filter(r=>r.error).length;
  const blocked=conversations().filter(c=>c.blocked).length;
  $('analysisStatus').textContent=`${state.cancelled?'Đã dừng. ':''}Đã phân tích ${done}/${conversations().length} hội thoại. ${failed} lỗi; ${blocked} vượt giới hạn. Lần chạy này: ${elapsed}s.${state.cancelled?' Yêu cầu đã gửi có thể vẫn hoàn tất ở provider; có thể tiếp tục các mục chưa có kết quả.':''}${done<conversations().length?' Danh sách ưu tiên tạm thời, chưa bao phủ toàn phạm vi.':' Đã có kết quả cho toàn phạm vi. TA cần kiểm tra trước khi chốt.'}`;
  state.view='top';state.selected=M.ranked(conversations(),state.records)[0]?.id||conversations()[0]?.id||null;render();
}
function saveDecision() {
  if(state.busy)return;
  try{const next=M.decide(state.records,state.selected,$('taDecision').value,$('decisionNote').value,$('sourceReviewed').checked);writeRecords(next,true);render();toast('Đã lưu quyết định trong trình duyệt này.');}
  catch(error){toast(error.message);}
}
function exportReview() {
  if(state.busy||!state.review)return;
  const saved=conversations().filter(c=>state.records[c.id]?.decision);
  if(!saved.length)return;
  const output={product:'Discord Pulse',model:state.model,source:state.review.source,scope:state.review.scope,fingerprint:state.review.fingerprint,exportedAt:new Date().toISOString(),sentToDiscord:false,
    coverage:{total:conversations().length,analyzed:Object.values(state.records).filter(r=>r.result).length,reviewed:saved.length},
    followUp:saved.filter(c=>M.follow.has(state.records[c.id].decision)).map(c=>c.id),
    decisions:saved.map(c=>({id:c.id,sourceIds:c.messages.map(m=>m.msg_id),...state.records[c.id]}))};
  const url=URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='discord-pulse-review.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function loadEval(){ $('evalBtn').disabled=true;try{const r=await api('/api/eval');$('evalLog').textContent=`${r.source}\n${r.model}\n${r.matched}/${r.total_cases} khớp; chỉ có ${r.total_cases}/${r.expected_cases} case\nCHƯA ĐỦ CƠ SỞ ĐÁNH GIÁ QUALITY BAR\n${r.warnings.join('\n')}`;}catch(error){$('evalLog').textContent=error.message;}finally{$('evalBtn').disabled=false;}}
window.addEventListener('DOMContentLoaded',()=>{
  for(const [value,label] of Object.entries(M.labels))$('taDecision').add(new Option(label,value));
  for(const b of document.querySelectorAll('[data-source]'))b.addEventListener('click',()=>chooseSource(b.dataset.source));
  $('loadBundled').addEventListener('click',()=>importData('bundled'));$('loadCsv').addEventListener('click',()=>importData('csv'));$('loadPaste').addEventListener('click',()=>importData('paste'));
  $('guildFilter').addEventListener('change',()=>{guildOptions();invalidatePreview();});for(const id of ['dateFilter','channelFilter'])$(id).addEventListener('change',invalidatePreview);
  $('previewBtn').addEventListener('click',()=>loadPreview());$('analyzeBtn').addEventListener('click',()=>analyzePending());$('retryBtn').addEventListener('click',()=>analyzePending(true));
  $('stopBtn').addEventListener('click',()=>{state.stop=true;state.cancelled=true;$('stopBtn').disabled=true;for(const controller of activeRequests)controller.abort('user_stop');});
  $('viewTop').addEventListener('click',()=>{state.view='top';renderList();});$('viewAll').addEventListener('click',()=>{state.view='all';renderList();});
  $('sourceReviewed').addEventListener('change',updateControls);$('saveDecision').addEventListener('click',saveDecision);$('exportBtn').addEventListener('click',exportReview);$('evalBtn').addEventListener('click',loadEval);
  $('modelSelect').addEventListener('change',applyModel);
  $('customModel').addEventListener('input',editModel);$('customModel').addEventListener('change',applyModel);
  $('customModel').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();applyModel();}});
  loadModels();
});
