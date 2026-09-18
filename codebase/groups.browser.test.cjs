// Browser integration with real import/preview and simulated AI results.
const {chromium}=require(process.argv[2]||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
const base=process.argv[4]||'http://127.0.0.1:8084';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});
 const context=await browser.newContext({viewport:{width:1512,height:1100},acceptDownloads:true});const page=await context.newPage();
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copiedReply=text;}}}));
 let review,mode='invalid',groupCalls=0,analysisCalls=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('response',async response=>{if(response.url().endsWith('/api/preview')&&response.status()===200)review=await response.json();});
 await page.route('**/api/analyze',async route=>{
  analysisCalls++;const body=route.request().postDataJSON();
  const results=body.ids.map(id=>({id,label:id==='G7'?'resolved':id==='G8'?'other':'no-response',priority:['G7','G8'].includes(id)?0:2,confidence:.8,reasoning:'Question awaiting a response',evidence_ids:[id],needs_ta_review:true}));
  await route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,mode:'live',model:body.model,fingerprint:review.fingerprint,latency_seconds:1,results})});
 });
 await page.route('**/api/groups',async route=>{
  groupCalls++;const body=route.request().postDataJSON(),snapshot=review,currentMode=mode;
  assert.deepEqual([...body.ids].sort(),['G1','G2','G3','G4','G5','G6']);
  if(currentMode==='slow')await new Promise(resolve=>setTimeout(resolve,1400));
  if(currentMode==='failure')return route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({success:false,message:'Provider unavailable',trace_id:'group-failed'})});
  const groups=currentMode==='empty'?[]:[{id:'group-assignment2',title:'Hạn nộp bài tập 2 · K4',question:'Bài tập 2 của lớp K4 có hạn nộp khi nào?',reasoning:'Cùng bài tập và cùng lớp; một mốc hạn nộp áp dụng chung.',members:['G1','G2','G3'].map(id=>({id,evidence_ids:[currentMode==='invalid'?'G4':id]}))}];
  return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,mode:'live',model:body.model,fingerprint:snapshot.fingerprint,latency_seconds:1.2,trace_id:'group-trace',groups})});
 });
 const csv='msg_id,content,guild,channel,created_at_vn\n'+[
 ['G1','Hạn nộp bài tập 2 lớp K4 là khi nào?'],['G2','Bài tập 2 của lớp K4 nộp trước ngày nào?'],['G3','Cho em hỏi deadline bài tập 2 lớp K4.'],
 ['G4','Tài khoản của em không mở được lab.'],['G5','Tài khoản của tôi báo lỗi quyền truy cập lab.'],['G6','Hạn nộp bài tập 3 lớp K4 là khi nào?'],
 ['G7','Em đã tìm thấy lịch nộp bài rồi. Cảm ơn.'],['G8','Chào mọi người.']].map(([id,text])=>`${id},${text},K4,help,2026-09-18 10:00`).join('\n');
 async function upload(){await page.locator('#sourceCsv').click();await page.locator('#csvFile').setInputFiles({name:'general-questions.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});await page.locator('#loadCsv').click();await page.waitForFunction(()=>!document.getElementById('loadCsv').disabled);}
 async function group(){await page.locator('#groupsBtn').click();await page.waitForFunction(()=>document.getElementById('stopBtn').hidden);}
 const checks=[];
 try{
  await page.goto(base);await upload();assert.equal(await page.locator('#groupsBtn').isDisabled(),true);
  await page.locator('#analyzeBtn').click();await page.waitForFunction(()=>document.getElementById('stopBtn').hidden);const originalModel=await page.locator('#modelSelect').inputValue();
  assert.match(await page.locator('#groupsCoverage').innerText(),/6 hội thoại chưa trả lời/);assert.equal(analysisCalls,2);
  await group();assert.match(await page.locator('#groupsStatus').innerText(),/không khớp/);assert.equal(await page.locator('.question-group').count(),0);
  mode='success';await group();assert.equal(await page.locator('.question-group').count(),1);assert.equal(await page.locator('.group-member').count(),3);assert.equal(await page.locator('.group-reply').isDisabled(),true);
  assert.equal(await page.locator('.group-member[data-member-id="G4"]').count(),0);checks.push('Only unanswered input is sent; invalid evidence rejected; personal and different-assignment questions remain separate');
  await page.locator('.group-approval').check();await page.locator('.group-confirm').click();assert.match(await page.locator('#toast').innerText(),/nguồn/);
  for(const id of ['G1','G2','G3']){await page.locator(`[data-member-id="${id}"] summary`).click();await page.waitForFunction(id=>document.querySelector(`[data-member-id="${id}"] summary`).textContent.includes('đã mở'),id);}
  await page.locator('[data-member-id="G3"] .group-include').uncheck();assert.equal(await page.locator('.group-approval').isChecked(),false);
  await page.locator('.group-approval').check();await page.locator('.group-confirm').click();assert.equal(await page.locator('.group-reply').isEnabled(),true);
  const answer='Bài tập 2 lớp K4: hạn nộp là 20/09 lúc 23:59 (TA đã kiểm tra lịch lớp).';
  await page.locator('.group-reply').fill(answer);await page.locator('.group-copy').click();assert.equal(await page.evaluate(()=>window.copiedReply),answer);assert.equal(await page.locator('#finalCount').innerText(),'0/5');
  const pending=page.waitForEvent('download');await page.locator('#exportGroupsBtn').click();const file=await pending;const output=JSON.parse(await fs.readFile(await file.path(),'utf8'));
  assert.equal(output.sentToDiscord,false);assert.equal(output.question_groups.trace_id,'group-trace');assert.deepEqual(output.question_groups.groups[0].review.included,['G1','G2']);assert.equal(output.question_groups.groups[0].review.reply,answer);
  checks.push('TA must open each source and confirm shared applicability; removing members resets confirmation; copying/exporting does not mark conversations answered');
  await page.reload();await upload();assert.equal(await page.locator('.group-reply').inputValue(),answer);assert.equal(await page.locator('.group-copy').isEnabled(),true);assert.equal(analysisCalls,2);assert.equal(groupCalls,2);
  await page.locator('#viewAll').click();await page.locator('[data-id="G2"]').click();await page.locator('#sourceReviewed').check();await page.locator('#taDecision').selectOption('resolved');await page.locator('#decisionNote').fill('TA confirmed an individual answer.');await page.locator('#saveDecision').click();
  assert.equal(await page.locator('.question-group').count(),0);assert.match(await page.locator('#groupsCoverage').innerText(),/5 hội thoại chưa trả lời/);
  await page.locator('#sourceReviewed').check();await page.locator('#taDecision').selectOption('no-response');await page.locator('#decisionNote').fill('Correction: still unanswered.');await page.locator('#saveDecision').click();assert.equal(await page.locator('.group-reply').inputValue(),answer);
  await page.locator('#modelSelect').selectOption('google/gemini-3.8-flash');assert.equal(await page.locator('.question-group').count(),0);await page.locator('#modelSelect').selectOption(originalModel);assert.equal(await page.locator('.group-reply').inputValue(),answer);
  checks.push('Group membership, confirmation, and drafts restore after reload; model changes and TA corrections isolate the candidate sets');
  await page.locator('.group-dismiss').click();assert.equal(await page.locator('.group-reply').count(),0);await page.locator('.group-dismiss').click();assert.equal(await page.locator('.group-reply').isDisabled(),true);
  await page.locator('.group-approval').check();await page.locator('.group-confirm').click();assert.equal(await page.locator('.group-reply').inputValue(),answer);
  mode='failure';await group();assert.match(await page.locator('#groupsStatus').innerText(),/Provider unavailable/);assert.equal(await page.locator('.group-reply').inputValue(),answer);
  mode='slow';await page.locator('#groupsBtn').click();await page.locator('#stopBtn').click();await page.waitForFunction(()=>document.getElementById('stopBtn').hidden,{},{timeout:1000});assert.equal(await page.locator('#modelSelect').isEnabled(),true);assert.equal(await page.locator('.group-reply').inputValue(),answer);
  await page.locator('#modelSelect').selectOption('google/gemini-3.8-flash');await new Promise(resolve=>setTimeout(resolve,1500));assert.equal(await page.locator('.question-group').count(),0);await page.locator('#modelSelect').selectOption(originalModel);
  checks.push('Reject/restore requires fresh confirmation; provider errors and immediate Stop preserve drafts; late results cannot contaminate another model');
  await fs.mkdir('/tmp/discord-pulse-groups-qa',{recursive:true});await page.locator('#groupSection').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/discord-pulse-groups-qa/desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'/tmp/discord-pulse-groups-qa/mobile.png',fullPage:true});
  mode='empty';await group();assert.equal(await page.locator('.question-group').count(),0);assert.match(await page.locator('#questionGroups').innerText(),/giữ riêng/);await page.locator('#viewAll').click();assert.equal(await page.locator('.case-button').count(),8);
  checks.push('Empty suggestions preserve individual conversations; desktop and mobile have no horizontal overflow');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,pageErrors:errors},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
